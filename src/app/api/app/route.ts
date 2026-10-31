import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDemoChunk, addDemoConversation, addDemoMessage, addDemoSource, createDemoWorkspace, getDemoDashboardState, getDemoState, isDemoMode, removeDemoSource, saveDemoState, updateDemoConversation, updateDemoSource, updateDemoWorkspace, upsertDemoProduct } from "@/lib/store";
import { DEMO_SUPABASE_WORKSPACE_ID, DEMO_WORKSPACE_ID } from "@/lib/demo-data";
import { answerCustomerQuestion } from "@/lib/safe-agent";
import { cleanText, extractStructuredSuggestions, suggestFacts } from "@/lib/documents";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient, getMembershipContext, getSupabaseWorkspaceState, toProductRow } from "@/lib/supabase/server";
import type { Faq, KnowledgeChunk, KnowledgeSource, Message, Policy, Product, WorkspaceState } from "@/lib/domain";
import { createTextEmbeddings } from "@/lib/semantic-search";
import { decryptAccessToken } from "@/lib/token-crypto";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { searchApprovedKnowledge } from "@/lib/semantic-search";
import { getAIProviderName } from "@/lib/ai-provider";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_workspace"), name: z.string().trim().min(2).max(80), businessType: z.string().trim().min(2).max(80), description: z.string().trim().max(500).default(""), languages: z.array(z.string().max(24)).min(1).max(5), contact: z.string().trim().max(80).default(""), workingHours: z.string().trim().max(160).default("") }),
  z.object({ action: z.literal("simulate_message"), workspaceId: z.string().optional(), conversationId: z.string().min(4).max(100), customerName: z.string().trim().max(80).default("Demo customer"), customerPhone: z.string().trim().max(40).default("Web simulator"), message: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("product_save"), workspaceId: z.string().optional(), id: z.string().optional(), name: z.string().trim().min(2).max(100), category: z.string().trim().max(80).default(""), description: z.string().trim().max(1000).default(""), price: z.number().nonnegative().nullable(), currency: z.string().length(3).default("INR"), priceQualifier: z.string().max(40).default(""), availability: z.string().max(120).default(""), inclusions: z.array(z.string().max(140)).max(20).default([]), deliveryTime: z.string().max(80).default(""), status: z.enum(["draft", "approved", "archived"]).default("draft"), sourceId: z.string().nullable().optional() }),
  z.object({ action: z.literal("product_delete"), workspaceId: z.string().optional(), id: z.string() }),
  z.object({ action: z.literal("knowledge_add"), workspaceId: z.string().optional(), name: z.string().trim().min(2).max(120), type: z.string().trim().max(24).default("TEXT"), text: z.string().min(1).max(120000) }),
  z.object({ action: z.literal("source_approve"), workspaceId: z.string().optional(), id: z.string() }),
  z.object({ action: z.literal("source_edit"), workspaceId: z.string().optional(), id: z.string(), name: z.string().trim().min(2).max(120), text: z.string().min(1).max(120000) }),
  z.object({ action: z.literal("source_reject"), workspaceId: z.string().optional(), id: z.string() }),
  z.object({ action: z.literal("source_delete"), workspaceId: z.string().optional(), id: z.string() }),
  z.object({ action: z.literal("source_reprocess"), workspaceId: z.string().optional(), id: z.string() }),
  z.object({ action: z.literal("settings_update"), workspaceId: z.string().optional(), name: z.string().trim().min(2).max(80), businessType: z.string().max(80), description: z.string().max(500), languages: z.array(z.string()).min(1).max(5), contact: z.string().max(80), workingHours: z.string().max(160), automationMode: z.enum(["draft_only", "safe_automation", "ai_active"]) }),
  z.object({ action: z.literal("conversation_status"), workspaceId: z.string().optional(), conversationId: z.string(), status: z.enum(["ai_active", "human_active", "resolved"]) }),
  z.object({ action: z.literal("manual_reply"), workspaceId: z.string().optional(), conversationId: z.string(), message: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("draft_edit"), workspaceId: z.string().optional(), messageId: z.string(), conversationId: z.string(), message: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("propose_faq"), workspaceId: z.string().optional(), conversationId: z.string(), messageId: z.string() }),
  z.object({ action: z.literal("draft_approve"), workspaceId: z.string().optional(), conversationId: z.string() }),
  z.object({ action: z.literal("whatsapp_connect"), workspaceId: z.string().optional(), phoneNumberId: z.string().trim().min(3).max(80), businessAccountId: z.string().trim().min(3).max(80), displayPhone: z.string().trim().min(4).max(40), accessToken: z.string().trim().min(20).max(5000) }),
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function ipKey(request: NextRequest) {
  return request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
}

function sourceFromText(input: { workspaceId: string; name: string; type: string; text: string; facts: string[]; products: Awaited<ReturnType<typeof extractStructuredSuggestions>>["products"]; faqs: Awaited<ReturnType<typeof extractStructuredSuggestions>>["faqs"]; policies: Awaited<ReturnType<typeof extractStructuredSuggestions>>["policies"] }): KnowledgeSource {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), workspaceId: input.workspaceId, name: input.name, type: input.type, status: "pending_review", extractedText: input.text,
    suggestedFacts: input.facts, suggestedProducts: input.products, suggestedFaqs: input.faqs, suggestedPolicies: input.policies, createdAt: now, updatedAt: now };
}

function makeChunk(source: KnowledgeSource): KnowledgeChunk {
  return { id: crypto.randomUUID(), workspaceId: source.workspaceId, sourceId: source.id, content: source.extractedText, approved: true, updatedAt: new Date().toISOString() };
}

async function processSimulatedMessage(state: WorkspaceState, input: z.infer<typeof actionSchema> & { action: "simulate_message" }) {
  const conversationId = input.conversationId;
  const existing = state.conversations.find((item) => item.id === conversationId);
  const conversation = addDemoConversation(conversationId, state.workspace.id, input.customerName, input.customerPhone, "web_demo");
  if (!conversation) return jsonError("Workspace not found.", 404);
  const incoming: Message = { id: crypto.randomUUID(), workspaceId: state.workspace.id, conversationId, direction: "incoming", sender: "customer", body: cleanText(input.message), deliveryStatus: "read", createdAt: new Date().toISOString(), citations: [], language: "en" };
  addDemoMessage(incoming);
  const current = getDemoState(state.workspace.id) ?? state;
  let result: Awaited<ReturnType<typeof answerCustomerQuestion>>;
  if (existing?.status === "human_active" || existing?.status === "resolved" || existing?.status === "escalated" || existing?.status === "awaiting_approval") {
    result = { answer: "A team member is looking after this conversation.", status: "escalated", confidence: 1, intent: "human_takeover", language: "en", citations: [], reason: "human_takeover" };
  } else {
    result = await answerCustomerQuestion({ message: incoming.body, workspace: current.workspace, products: current.products, faqs: current.faqs, policies: current.policies, chunks: current.chunks });
  }
  const deliveryStatus = result.status === "awaiting_approval" ? "draft" : "delivered";
  const assistantMessage: Message = { id: crypto.randomUUID(), workspaceId: state.workspace.id, conversationId, direction: "outgoing", sender: "ai", body: result.answer, deliveryStatus, createdAt: new Date().toISOString(), citations: result.citations, language: result.language };
  addDemoMessage(assistantMessage);
  updateDemoConversation(state.workspace.id, conversationId, result.status === "answered" ? "ai_active" : result.status);
  return NextResponse.json({ ok: true, result, conversationId, messages: [incoming, assistantMessage] });
}

async function processSupabaseSimulatedMessage(client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, state: WorkspaceState, input: z.infer<typeof actionSchema> & { action: "simulate_message" }) {
  let conversation = state.conversations.find((item) => item.id === input.conversationId);
  if (!conversation) {
    const { data, error } = await client.from("conversations").insert({ id: input.conversationId, workspace_id: state.workspace.id, customer_name: input.customerName, customer_phone: input.customerPhone, channel: "web_demo", status: "ai_active" }).select("id,status").single();
    if (error || !data) return jsonError(error?.message ?? "Could not start the conversation.", 500);
    const now = new Date().toISOString();
    conversation = { id: data.id, workspaceId: state.workspace.id, customerName: input.customerName, customerPhone: input.customerPhone, channel: "web_demo", status: "ai_active", createdAt: now, updatedAt: now, unread: 0 };
  }
  const incomingId = crypto.randomUUID();
  const incoming = { id: incomingId, workspace_id: state.workspace.id, conversation_id: conversation.id, direction: "incoming", sender: "customer", body: cleanText(input.message), delivery_status: "read", citations: [], language: "en" };
  const { error: incomingError } = await client.from("messages").insert(incoming);
  if (incomingError) return jsonError(incomingError.message, 500);
  let contextChunks = state.chunks;
  const semantic = await searchApprovedKnowledge(client, state.workspace.id, input.message);
  if (semantic.length) contextChunks = semantic;
  const paused = conversation.status === "human_active" || conversation.status === "resolved" || conversation.status === "escalated" || conversation.status === "awaiting_approval";
  const result = paused
    ? { answer: "A team member is looking after this conversation.", status: "escalated" as const, confidence: 1, intent: "human_takeover", language: "en" as const, citations: [], reason: "human_takeover" }
    : await answerCustomerQuestion({ message: input.message, workspace: state.workspace, products: state.products, faqs: state.faqs, policies: state.policies, chunks: contextChunks });
  const assistantId = crypto.randomUUID();
  const deliveryStatus = result.status === "awaiting_approval" ? "draft" : "delivered";
  const assistantMessage = { id: assistantId, workspace_id: state.workspace.id, conversation_id: conversation.id, direction: "outgoing", sender: "ai", body: result.answer, delivery_status: deliveryStatus, citations: result.citations, language: result.language };
  const { error: outgoingError } = await client.from("messages").insert(assistantMessage);
  if (outgoingError) return jsonError(outgoingError.message, 500);
  const nextStatus = result.status === "answered" ? "ai_active" : result.status;
  await client.from("conversations").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", conversation.id).eq("workspace_id", state.workspace.id);
  if (result.status === "escalated") {
    await client.from("escalations").insert({ workspace_id: state.workspace.id, conversation_id: conversation.id, message_id: assistantId, reason: result.reason ?? "unsupported_information" });
    await client.from("unresolved_questions").insert({ workspace_id: state.workspace.id, conversation_id: conversation.id, message_id: incomingId, question: input.message, intent: result.intent });
  }
  await client.from("agent_actions").insert({ workspace_id: state.workspace.id, conversation_id: conversation.id, message_id: assistantId, intent: result.intent, confidence: result.confidence, citations: result.citations, decision: result.status, reason: result.reason ?? null });
  return NextResponse.json({ ok: true, result, conversationId: conversation.id, messages: [incoming, assistantMessage] });
}

async function addSourceToSupabase(client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, workspaceId: string, source: KnowledgeSource, storagePath: string | null = null) {
  const { error } = await client.from("knowledge_sources").insert({
    id: source.id, workspace_id: workspaceId, name: source.name, file_type: source.type, status: source.status,
    extracted_text: source.extractedText, suggested_facts: source.suggestedFacts, suggested_products: source.suggestedProducts, suggested_faqs: source.suggestedFaqs, suggested_policies: source.suggestedPolicies, storage_path: storagePath,
  });
  if (error) throw new Error(error.message);
}

async function addApprovedSource(client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, workspaceId: string, source: KnowledgeSource) {
  const pieces = source.extractedText.match(/[\s\S]{1,1800}/g) ?? [source.extractedText];
  let embeddings: number[][] | null = null;
  try { embeddings = await createTextEmbeddings(pieces); }
  catch (error) { console.error("Embedding generation skipped", error instanceof Error ? error.name : "unknown"); }
  const { error: deleteError } = await client.from("knowledge_chunks").delete().eq("workspace_id", workspaceId).eq("source_id", source.id);
  if (deleteError) throw new Error(deleteError.message);
  const chunks = pieces.map((content, index) => ({ workspace_id: workspaceId, source_id: source.id, content, approved: true, embedding: embeddings?.[index] ? `[${embeddings[index].join(",")}]` : null }));
  const { error } = await client.from("knowledge_chunks").insert(chunks);
  if (error) throw new Error(error.message);
  const { data: existingProducts } = await client.from("products").select("id,name").eq("workspace_id", workspaceId).eq("source_id", source.id);
  for (const suggestion of source.suggestedProducts) {
    const existing = existingProducts?.find((item) => item.name.toLowerCase() === suggestion.name.toLowerCase());
    const product: Product = { ...suggestion, id: existing?.id ?? crypto.randomUUID(), workspaceId, status: "approved", sourceId: source.id, updatedAt: new Date().toISOString() };
    const productResult = await client.from("products").upsert(toProductRow(product), { onConflict: "id" });
    if (productResult.error) throw new Error(productResult.error.message);
  }
  if (source.suggestedFaqs.length) {
    const { error: faqError } = await client.from("faqs").upsert(source.suggestedFaqs.map((item) => ({ workspace_id: workspaceId, question: item.question, answer: item.answer, status: "approved", source_id: source.id })), { onConflict: "workspace_id,question" });
    if (faqError) throw new Error(faqError.message);
  }
  if (source.suggestedPolicies.length) {
    const { error: policyError } = await client.from("policies").upsert(source.suggestedPolicies.map((item) => ({ workspace_id: workspaceId, name: item.name, content: item.content, status: "approved", source_id: source.id })), { onConflict: "workspace_id,name" });
    if (policyError) throw new Error(policyError.message);
  }
}

export async function GET(request: NextRequest) {
  if (!(await enforceRateLimit(`read:${ipKey(request)}`, 120, 60_000)).allowed) return jsonError("Too many requests. Please try again shortly.", 429);
  if (isDemoMode()) {
    const workspaceId = request.cookies.get("middle-ai-workspace")?.value || DEMO_WORKSPACE_ID;
    const state = getDemoState(workspaceId);
    if (!state) return jsonError("Workspace not found. Create a workspace to continue.", 404);
    return NextResponse.json({ state, demoMode: true, integrations: { supabase: false, ai: Boolean(getAIProviderName()), aiProvider: getAIProviderName(), whatsapp: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) } });
  }
  if (request.nextUrl.searchParams.get("demo") === "1") {
    const admin = createSupabaseAdminClient();
    const state = admin ? await getSupabaseWorkspaceState(DEMO_SUPABASE_WORKSPACE_ID, admin) : null;
    return NextResponse.json({ state: state ?? getDemoDashboardState(), demoMode: true, integrations: { supabase: Boolean(admin), ai: Boolean(getAIProviderName()), aiProvider: getAIProviderName(), whatsapp: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) } });
  }
  const context = await getMembershipContext();
  if (!context?.client || !context.user) return jsonError("Please sign in to continue.", 401);
  if (!context.workspaceId) return NextResponse.json({ state: null, needsWorkspace: true, demoMode: false });
  const state = await getSupabaseWorkspaceState(context.workspaceId, context.client);
  if (!state) return jsonError("Workspace could not be loaded.", 404);
  return NextResponse.json({ state, demoMode: false, integrations: { supabase: true, ai: Boolean(getAIProviderName()), aiProvider: getAIProviderName(), whatsapp: Boolean(state.whatsappConnection?.tokenConfigured) } });
}

export async function POST(request: NextRequest) {
  if (!(await enforceRateLimit(`write:${ipKey(request)}`, 45, 60_000)).allowed) return jsonError("You’re doing that a little quickly. Please try again shortly.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON."); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Please check the submitted information.");
  const input = parsed.data;

  if (input.action === "create_workspace") {
    if (isDemoMode()) {
      const state = createDemoWorkspace(input);
      const response = NextResponse.json({ ok: true, state, demoMode: true });
      response.cookies.set("middle-ai-workspace", state.workspace.id, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30 });
      return response;
    }
    const client = await createSupabaseServerClient();
    if (!client) return jsonError("Supabase is not available.", 503);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return jsonError("Please sign in before creating a workspace.", 401);
    const { data: workspaceId, error } = await client.rpc("create_workspace", { p_name: input.name, p_business_type: input.businessType, p_description: input.description, p_languages: input.languages, p_contact: input.contact, p_working_hours: input.workingHours });
    if (error || !workspaceId) return jsonError(error?.message ?? "Could not create the workspace.", 400);
    return NextResponse.json({ ok: true, workspaceId, demoMode: false });
  }

  // The customer simulator is deliberately restricted to the seeded public demo workspace.
  if (input.action === "simulate_message") {
    if (isDemoMode()) {
      const workspaceId = request.cookies.get("middle-ai-workspace")?.value || input.workspaceId || DEMO_WORKSPACE_ID;
      const state = getDemoState(workspaceId);
      if (!state) return jsonError("Workspace not found.", 404);
      return processSimulatedMessage(state, input);
    }
    const membership = await getMembershipContext();
    if (membership?.client && membership.user && membership.workspaceId && input.workspaceId === membership.workspaceId) {
      const state = await getSupabaseWorkspaceState(membership.workspaceId, membership.client);
      return state ? processSupabaseSimulatedMessage(membership.client, state, input) : jsonError("Workspace not found.", 404);
    }
    if (input.workspaceId && input.workspaceId !== DEMO_WORKSPACE_ID && input.workspaceId !== DEMO_SUPABASE_WORKSPACE_ID) return jsonError("The public simulator only uses the sample workspace.", 403);
    const admin = createSupabaseAdminClient();
    const state = admin ? await getSupabaseWorkspaceState(DEMO_SUPABASE_WORKSPACE_ID, admin) : null;
    if (state && admin) return processSupabaseSimulatedMessage(admin, state, input);
    const localDemo = getDemoState(DEMO_WORKSPACE_ID);
    return localDemo ? processSimulatedMessage(localDemo, input) : jsonError("The sample workspace is unavailable.", 503);
  }

  const demoMode = isDemoMode();
  let state: WorkspaceState | null = null;
  let workspaceId: string;
  let client: Awaited<ReturnType<typeof createSupabaseServerClient>> = null;
  if (demoMode) {
    workspaceId = request.cookies.get("middle-ai-workspace")?.value || DEMO_WORKSPACE_ID;
    if ("workspaceId" in input && input.workspaceId && input.workspaceId !== workspaceId) return jsonError("That workspace is not available in this demo session.", 403);
    state = getDemoState(workspaceId);
  } else {
    const context = await getMembershipContext();
    if (!context?.user || !context.client) return jsonError("Please sign in to continue.", 401);
    if (!context.workspaceId) return jsonError("Complete workspace setup before continuing.", 409);
    workspaceId = context.workspaceId;
    if ("workspaceId" in input && input.workspaceId && input.workspaceId !== workspaceId) return jsonError("You do not have access to that workspace.", 403);
    state = await getSupabaseWorkspaceState(workspaceId, context.client);
    client = context.client;
  }
  if (!state) return jsonError("Workspace not found.", 404);

  try {
    switch (input.action) {
      case "product_save": {
        const product: Product = { id: input.id || crypto.randomUUID(), workspaceId, name: input.name, category: input.category, description: input.description, price: input.price, currency: input.currency, priceQualifier: input.priceQualifier, availability: input.availability, inclusions: input.inclusions, deliveryTime: input.deliveryTime, status: input.status, sourceId: input.sourceId ?? null, updatedAt: new Date().toISOString() };
        if (demoMode) upsertDemoProduct(product);
        else { const { error } = await client!.from("products").upsert(toProductRow(product), { onConflict: "id" }); if (error) throw new Error(error.message); }
        return NextResponse.json({ ok: true, product });
      }
      case "product_delete": {
        if (demoMode) { const current = getDemoState(workspaceId)!; current.products = current.products.filter((product) => product.id !== input.id); saveDemoState(current); }
        else { const { error } = await client!.from("products").delete().eq("id", input.id).eq("workspace_id", workspaceId); if (error) throw new Error(error.message); }
        return NextResponse.json({ ok: true });
      }
      case "knowledge_add": {
        const text = cleanText(input.text);
        const suggestions = await extractStructuredSuggestions(text);
        const source = sourceFromText({ workspaceId, name: input.name, type: input.type, text, facts: suggestions.facts.length ? suggestions.facts : suggestFacts(text), products: suggestions.products, faqs: suggestions.faqs, policies: suggestions.policies });
        if (demoMode) addDemoSource(source);
        else await addSourceToSupabase(client!, workspaceId, source);
        return NextResponse.json({ ok: true, source });
      }
      case "source_approve": {
        const source = state.sources.find((item) => item.id === input.id);
        if (!source || source.workspaceId !== workspaceId) return jsonError("Source not found.", 404);
        if (demoMode) {
          updateDemoSource(workspaceId, input.id, { status: "approved", updatedAt: new Date().toISOString() });
          addDemoChunk(makeChunk(source));
          for (const suggestion of source.suggestedProducts) {
            const existing = state.products.find((item) => item.sourceId === source.id && item.name.toLowerCase() === suggestion.name.toLowerCase());
            upsertDemoProduct({ ...suggestion, id: existing?.id ?? crypto.randomUUID(), workspaceId, status: "approved", sourceId: source.id, updatedAt: new Date().toISOString() });
          }
          const current = getDemoState(workspaceId)!;
          for (const suggestion of source.suggestedFaqs) {
            const existing = current.faqs.find((item) => item.sourceId === source.id && item.question.toLowerCase() === suggestion.question.toLowerCase());
            const faq: Faq = { id: existing?.id ?? crypto.randomUUID(), workspaceId, question: suggestion.question, answer: suggestion.answer, status: "approved", sourceId: source.id, updatedAt: new Date().toISOString() };
            current.faqs = current.faqs.filter((item) => item.id !== faq.id); current.faqs.unshift(faq);
          }
          for (const suggestion of source.suggestedPolicies) {
            const existing = current.policies.find((item) => item.sourceId === source.id && item.name.toLowerCase() === suggestion.name.toLowerCase());
            const policy: Policy = { id: existing?.id ?? crypto.randomUUID(), workspaceId, name: suggestion.name, content: suggestion.content, status: "approved", sourceId: source.id, updatedAt: new Date().toISOString() };
            current.policies = current.policies.filter((item) => item.id !== policy.id); current.policies.unshift(policy);
          }
          saveDemoState(current);
        } else {
          await addApprovedSource(client!, workspaceId, source);
          const { error } = await client!.from("knowledge_sources").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", input.id).eq("workspace_id", workspaceId);
          if (error) throw new Error(error.message);
        }
        return NextResponse.json({ ok: true });
      }
      case "source_edit": {
        const text = cleanText(input.text);
        const suggestions = await extractStructuredSuggestions(text);
        const update = { name: input.name, extractedText: text, suggestedFacts: suggestions.facts.length ? suggestions.facts : suggestFacts(text), suggestedProducts: suggestions.products, suggestedFaqs: suggestions.faqs, suggestedPolicies: suggestions.policies, status: "pending_review" as const, updatedAt: new Date().toISOString() };
        const source = state.sources.find((item) => item.id === input.id);
        if (!source || source.workspaceId !== workspaceId) return jsonError("Source not found.", 404);
        if (demoMode) {
          updateDemoSource(workspaceId, input.id, update);
          const current = getDemoState(workspaceId)!; current.chunks = current.chunks.filter((chunk) => chunk.sourceId !== input.id); current.products = current.products.map((product) => product.sourceId === input.id ? { ...product, status: "draft" } : product); current.faqs = current.faqs.map((faq) => faq.sourceId === input.id ? { ...faq, status: "draft" } : faq); current.policies = current.policies.map((policy) => policy.sourceId === input.id ? { ...policy, status: "draft" } : policy); saveDemoState(current);
        }
        else {
          const { error } = await client!.from("knowledge_sources").update({ name: update.name, extracted_text: update.extractedText, suggested_facts: update.suggestedFacts, suggested_products: update.suggestedProducts, suggested_faqs: update.suggestedFaqs, suggested_policies: update.suggestedPolicies, status: update.status, updated_at: update.updatedAt }).eq("id", input.id).eq("workspace_id", workspaceId);
          if (error) throw new Error(error.message);
          await client!.from("knowledge_chunks").update({ approved: false }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("products").update({ status: "draft", updated_at: update.updatedAt }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("faqs").update({ status: "draft", updated_at: update.updatedAt }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("policies").update({ status: "draft", updated_at: update.updatedAt }).eq("source_id", input.id).eq("workspace_id", workspaceId);
        }
        return NextResponse.json({ ok: true });
      }
      case "source_reject": {
        if (demoMode) {
          updateDemoSource(workspaceId, input.id, { status: "rejected", updatedAt: new Date().toISOString() });
          const current = getDemoState(workspaceId)!; current.chunks = current.chunks.filter((chunk) => chunk.sourceId !== input.id); current.products = current.products.map((product) => product.sourceId === input.id ? { ...product, status: "draft" } : product); current.faqs = current.faqs.map((faq) => faq.sourceId === input.id ? { ...faq, status: "draft" } : faq); current.policies = current.policies.map((policy) => policy.sourceId === input.id ? { ...policy, status: "draft" } : policy); saveDemoState(current);
        } else {
          const { error } = await client!.from("knowledge_sources").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", input.id).eq("workspace_id", workspaceId); if (error) throw new Error(error.message);
          await client!.from("knowledge_chunks").update({ approved: false }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("products").update({ status: "draft", updated_at: new Date().toISOString() }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("faqs").update({ status: "draft", updated_at: new Date().toISOString() }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("policies").update({ status: "draft", updated_at: new Date().toISOString() }).eq("source_id", input.id).eq("workspace_id", workspaceId);
        }
        return NextResponse.json({ ok: true });
      }
      case "source_delete": {
        if (demoMode) removeDemoSource(workspaceId, input.id);
        else {
          const { data: sourceFile, error: lookupError } = await client!.from("knowledge_sources").select("storage_path").eq("id", input.id).eq("workspace_id", workspaceId).maybeSingle();
          if (lookupError) throw new Error(lookupError.message);
          const { error } = await client!.from("knowledge_sources").delete().eq("id", input.id).eq("workspace_id", workspaceId);
          if (error) throw new Error(error.message);
          if (sourceFile?.storage_path) await client!.storage.from("knowledge-source-files").remove([sourceFile.storage_path]);
        }
        return NextResponse.json({ ok: true });
      }
      case "source_reprocess": {
        const source = state.sources.find((item) => item.id === input.id);
        if (!source) return jsonError("Source not found.", 404);
        const suggestions = await extractStructuredSuggestions(source.extractedText);
        const update = { status: "pending_review" as const, suggestedFacts: suggestions.facts, suggestedProducts: suggestions.products, suggestedFaqs: suggestions.faqs, suggestedPolicies: suggestions.policies, updatedAt: new Date().toISOString() };
        if (demoMode) {
          updateDemoSource(workspaceId, input.id, update);
          const current = getDemoState(workspaceId)!; current.chunks = current.chunks.filter((chunk) => chunk.sourceId !== input.id); current.products = current.products.map((product) => product.sourceId === input.id ? { ...product, status: "draft" } : product); current.faqs = current.faqs.map((faq) => faq.sourceId === input.id ? { ...faq, status: "draft" } : faq); current.policies = current.policies.map((policy) => policy.sourceId === input.id ? { ...policy, status: "draft" } : policy); saveDemoState(current);
        } else {
          const { error } = await client!.from("knowledge_sources").update({ status: update.status, suggested_facts: update.suggestedFacts, suggested_products: update.suggestedProducts, suggested_faqs: update.suggestedFaqs, suggested_policies: update.suggestedPolicies, updated_at: update.updatedAt }).eq("id", input.id).eq("workspace_id", workspaceId); if (error) throw new Error(error.message);
          await client!.from("knowledge_chunks").update({ approved: false }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("products").update({ status: "draft", updated_at: update.updatedAt }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("faqs").update({ status: "draft", updated_at: update.updatedAt }).eq("source_id", input.id).eq("workspace_id", workspaceId);
          await client!.from("policies").update({ status: "draft", updated_at: update.updatedAt }).eq("source_id", input.id).eq("workspace_id", workspaceId);
        }
        return NextResponse.json({ ok: true });
      }
      case "settings_update": {
        const update = { name: input.name, businessType: input.businessType, description: input.description, languages: input.languages, contact: input.contact, workingHours: input.workingHours, automationMode: input.automationMode };
        if (demoMode) updateDemoWorkspace(workspaceId, update);
        else { const { error } = await client!.from("workspaces").update({ name: update.name, business_type: update.businessType, description: update.description, languages: update.languages, contact: update.contact, working_hours: update.workingHours, automation_mode: update.automationMode, updated_at: new Date().toISOString() }).eq("id", workspaceId); if (error) throw new Error(error.message); }
        return NextResponse.json({ ok: true });
      }
      case "conversation_status": {
        if (demoMode) updateDemoConversation(workspaceId, input.conversationId, input.status);
        else { const { error } = await client!.from("conversations").update({ status: input.status, updated_at: new Date().toISOString() }).eq("id", input.conversationId).eq("workspace_id", workspaceId); if (error) throw new Error(error.message); }
        return NextResponse.json({ ok: true });
      }
      case "manual_reply": {
        const conversation = state.conversations.find((item) => item.id === input.conversationId);
        if (!conversation) return jsonError("Conversation not found.", 404);
        let deliveryStatus: Message["deliveryStatus"] = "delivered";
        let externalId: string | undefined;
        let providerResponse: unknown;
        if (!demoMode && conversation.channel === "whatsapp") {
          const admin = createSupabaseAdminClient();
          const { data: connection } = await admin!.from("whatsapp_connections").select("phone_number_id,encrypted_access_token").eq("workspace_id", workspaceId).maybeSingle();
          if (!connection) return jsonError("Connect a WhatsApp Business Cloud API number before sending a manual reply.", 409);
          else {
            const token = decryptAccessToken(connection.encrypted_access_token);
            const sent = await sendWhatsAppText({ phoneNumberId: connection.phone_number_id, accessToken: token, to: conversation.customerPhone, text: cleanText(input.message) });
            externalId = sent.messageId; providerResponse = sent.response; deliveryStatus = "sent";
          }
        }
        const message: Message = { id: crypto.randomUUID(), workspaceId, conversationId: input.conversationId, direction: "outgoing", sender: "owner", body: cleanText(input.message), deliveryStatus, createdAt: new Date().toISOString(), citations: [], language: "en", externalId, providerResponse };
        if (demoMode) { addDemoMessage(message); updateDemoConversation(workspaceId, input.conversationId, "human_active"); }
        else {
          const { error } = await client!.from("messages").insert({ id: message.id, workspace_id: workspaceId, conversation_id: message.conversationId, direction: message.direction, sender: message.sender, body: message.body, delivery_status: message.deliveryStatus, citations: [], language: "en", external_id: message.externalId ?? null, provider_response: message.providerResponse ?? null });
          if (error) throw new Error(error.message);
          await client!.from("conversations").update({ status: "human_active", updated_at: message.createdAt }).eq("id", conversation.id).eq("workspace_id", workspaceId);
        }
        return NextResponse.json({ ok: true, message, sent: deliveryStatus === "sent" || demoMode || conversation.channel === "web_demo" });
      }
      case "draft_edit": {
        const draft = state.messages.find((item) => item.id === input.messageId && item.conversationId === input.conversationId && item.sender === "ai" && item.deliveryStatus === "draft");
        if (!draft) return jsonError("AI draft not found.", 404);
        if (demoMode) {
          const current = getDemoState(workspaceId)!; const found = current.messages.find((item) => item.id === input.messageId);
          if (found) found.body = cleanText(input.message);
          saveDemoState(current);
        } else {
          const { error } = await client!.from("messages").update({ body: cleanText(input.message) }).eq("id", input.messageId).eq("conversation_id", input.conversationId).eq("workspace_id", workspaceId);
          if (error) throw new Error(error.message);
        }
        return NextResponse.json({ ok: true });
      }
      case "propose_faq": {
        const conversation = state.conversations.find((item) => item.id === input.conversationId);
        const human = state.messages.find((item) => item.id === input.messageId && item.conversationId === input.conversationId && item.sender === "owner");
        const question = [...state.messages].reverse().find((item) => item.conversationId === input.conversationId && item.direction === "incoming");
        if (!conversation || !human || !question) return jsonError("Select a human reply and its customer question first.", 404);
        const source = sourceFromText({ workspaceId, name: `Proposed FAQ · ${question.body.slice(0, 48)}`, type: "FAQ draft", text: `Question: ${question.body}\nAnswer: ${human.body}`, facts: [`Question: ${question.body}`, `Answer: ${human.body}`], products: [], faqs: [{ question: question.body, answer: human.body }], policies: [] });
        if (demoMode) addDemoSource(source);
        else await addSourceToSupabase(client!, workspaceId, source);
        return NextResponse.json({ ok: true, sourceId: source.id });
      }
      case "draft_approve": {
        const draft = [...state.messages].reverse().find((item) => item.conversationId === input.conversationId && item.sender === "ai" && item.deliveryStatus === "draft");
        if (!draft) return jsonError("There is no AI draft waiting for approval.", 404);
        if (demoMode) {
          const latest = getDemoState(workspaceId)!;
          const found = latest.messages.find((item) => item.id === draft.id);
          if (found) found.deliveryStatus = "delivered";
          saveDemoState(latest);
          updateDemoConversation(workspaceId, input.conversationId, "ai_active");
        } else {
          const conversation = state.conversations.find((item) => item.id === input.conversationId);
          if (!conversation) return jsonError("Conversation not found.", 404);
          let externalId: string | undefined;
          let providerResponse: unknown;
          if (conversation.channel === "whatsapp") {
            const admin = createSupabaseAdminClient();
            const { data: connection } = await admin!.from("whatsapp_connections").select("phone_number_id,encrypted_access_token").eq("workspace_id", workspaceId).maybeSingle();
            if (!connection) return jsonError("Connect a WhatsApp Business Cloud API number before sending this draft.", 409);
            const sent = await sendWhatsAppText({ phoneNumberId: connection.phone_number_id, accessToken: decryptAccessToken(connection.encrypted_access_token), to: conversation.customerPhone, text: draft.body });
            externalId = sent.messageId; providerResponse = sent.response;
          }
          const { error } = await client!.from("messages").update({ delivery_status: conversation.channel === "whatsapp" ? "sent" : "delivered", external_id: externalId ?? null, provider_response: providerResponse ?? null }).eq("id", draft.id).eq("workspace_id", workspaceId);
          if (error) throw new Error(error.message);
          await client!.from("conversations").update({ status: "ai_active", updated_at: new Date().toISOString() }).eq("id", input.conversationId).eq("workspace_id", workspaceId);
        }
        return NextResponse.json({ ok: true });
      }
      case "whatsapp_connect": {
        if (demoMode) return jsonError("WhatsApp credentials are not stored in the local demo. Configure Supabase and TOKEN_ENCRYPTION_KEY to connect a business number.", 409);
        const { encryptAccessToken } = await import("@/lib/token-crypto");
        const encryptedToken = encryptAccessToken(input.accessToken);
        const admin = createSupabaseAdminClient();
        if (!admin) return jsonError("SUPABASE_SERVICE_ROLE_KEY is required to store WhatsApp credentials.", 503);
        const { error } = await admin.from("whatsapp_connections").upsert({ workspace_id: workspaceId, phone_number_id: input.phoneNumberId, business_account_id: input.businessAccountId, display_phone: input.displayPhone, encrypted_access_token: encryptedToken, status: "connected", updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true, tokenConfigured: true });
      }
      default:
        return jsonError("Action not supported.", 400);
    }
  } catch (error) {
    console.error("Middle AI request failed", input.action, error instanceof Error ? error.message : "unknown");
    return jsonError(error instanceof Error ? error.message : "Something went wrong.", 500);
  }
}

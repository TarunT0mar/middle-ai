import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { addDemoConversation, addDemoMessage, getDemoState, markWebhookEventOnce, updateDemoConversation } from "@/lib/store";
import { DEMO_SUPABASE_WORKSPACE_ID, DEMO_WORKSPACE_ID } from "@/lib/demo-data";
import { answerCustomerQuestion } from "@/lib/safe-agent";
import { getSupabaseWorkspaceState } from "@/lib/supabase/server";
import { searchApprovedKnowledge } from "@/lib/semantic-search";
import { lookupWhatsAppConnection, parseWhatsAppMessages, sendWhatsAppText, verifyMetaSignature } from "@/lib/whatsapp";
import type { Message, WorkspaceState } from "@/lib/domain";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function requestIp(request: NextRequest) {
  return request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "meta";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode") ?? url.searchParams.get("hub[mode]");
  const token = url.searchParams.get("hub.verify_token") ?? url.searchParams.get("hub[verify_token]");
  const challenge = url.searchParams.get("hub.challenge") ?? url.searchParams.get("hub[challenge]");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected) return new NextResponse("Webhook verification is not configured.", { status: 503 });
  if (mode === "subscribe" && token && constantTimeEqual(token, expected) && challenge) return new NextResponse(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  return new NextResponse("Forbidden", { status: 403 });
}

async function persistIncoming(state: WorkspaceState, input: { id: string; from: string; name: string; text: string; type: string }, adminClient: ReturnType<typeof serviceClient> = null) {
  const demoMode = state.workspace.id === DEMO_WORKSPACE_ID;
  const conversationId = demoMode ? `whatsapp-${input.from}` : undefined;
  let resolvedConversationId = conversationId;
  let currentStatus: WorkspaceState["conversations"][number]["status"] = "ai_active";
  let currentUnread = 0;
  if (demoMode) {
    const existing = state.conversations.find((item) => item.id === conversationId);
    const conversation = addDemoConversation(conversationId!, state.workspace.id, input.name, `+${input.from}`, "whatsapp");
    if (!conversation) return null;
    currentStatus = existing?.status ?? conversation.status;
  } else {
    if (!adminClient) return null;
    const { data: contact, error: contactError } = await adminClient.from("contacts").upsert({ workspace_id: state.workspace.id, phone: input.from, display_name: input.name, last_seen_at: new Date().toISOString() }, { onConflict: "workspace_id,phone" }).select("id").single();
    if (contactError || !contact) throw new Error(`Could not save WhatsApp contact: ${contactError?.message ?? "missing record"}`);
    const { data: existing } = await adminClient.from("conversations").select("id,status,unread").eq("workspace_id", state.workspace.id).eq("contact_id", contact.id).neq("status", "resolved").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) { resolvedConversationId = existing.id; currentStatus = existing.status; currentUnread = existing.unread ?? 0; }
    else {
      const { data: created, error: conversationError } = await adminClient.from("conversations").insert({ workspace_id: state.workspace.id, contact_id: contact.id, customer_name: input.name, customer_phone: input.from, channel: "whatsapp", status: "ai_active" }).select("id,status").single();
      if (conversationError || !created) throw new Error(`Could not start WhatsApp conversation: ${conversationError?.message ?? "missing record"}`);
      resolvedConversationId = created.id;
    }
  }
  if (!resolvedConversationId) return null;
  const readable = input.type === "text" ? input.text : `Customer sent a ${input.type === "audio" ? "voice note" : input.type === "image" ? "image" : "media attachment"}. A team member needs to review it.`;
  const message: Message = { id: crypto.randomUUID(), workspaceId: state.workspace.id, conversationId: resolvedConversationId, direction: "incoming", sender: "customer", body: readable, deliveryStatus: "received", createdAt: new Date().toISOString(), citations: [], language: "en", externalId: input.id };
  if (demoMode) {
    const added = addDemoMessage(message);
    if (!added) return null;
    if (input.type !== "text") updateDemoConversation(state.workspace.id, resolvedConversationId, "human_active");
  } else {
    const { error } = await adminClient!.from("messages").insert({ id: message.id, workspace_id: message.workspaceId, conversation_id: resolvedConversationId, direction: message.direction, sender: message.sender, body: message.body, delivery_status: message.deliveryStatus, citations: [], language: "en", external_id: message.externalId, media_type: input.type });
    if (error?.code === "23505") return null;
    if (error) throw new Error(`Could not store incoming WhatsApp message: ${error.message}`);
    await adminClient!.from("conversations").update({ unread: currentUnread + 1, ...(input.type !== "text" ? { status: "human_active" } : {}), updated_at: message.createdAt }).eq("id", resolvedConversationId).eq("workspace_id", state.workspace.id);
  }
  return { message, conversationId: resolvedConversationId, status: currentStatus, media: input.type !== "text" };
}

async function processMessage(input: { phoneNumberId: string; from: string; name: string; externalId: string; type: string; text: string }) {
  const admin = serviceClient();
  const demoId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const demoToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const isPlatformDemo = Boolean(demoId && demoToken && input.phoneNumberId === demoId);
  const connection = !isPlatformDemo && admin ? await lookupWhatsAppConnection(admin, input.phoneNumberId) : null;
  const workspaceId = isPlatformDemo ? (admin ? DEMO_SUPABASE_WORKSPACE_ID : DEMO_WORKSPACE_ID) : connection?.workspaceId;
  const accessToken = isPlatformDemo ? demoToken : connection?.accessToken;
  if (!workspaceId || !accessToken) {
    console.error("WhatsApp message has no matching connection", input.phoneNumberId);
    return;
  }
  const state = isPlatformDemo
    ? admin ? await getSupabaseWorkspaceState(workspaceId, admin) : getDemoState(workspaceId)
    : await getSupabaseWorkspaceState(workspaceId, admin ?? undefined);
  if (!state) return;
  const stored = await persistIncoming(state, { id: input.externalId, from: input.from, name: input.name, text: input.text, type: input.type }, isPlatformDemo ? null : admin);
  if (!stored || stored.media || stored.status === "human_active" || stored.status === "resolved" || stored.status === "escalated" || stored.status === "awaiting_approval") return;

  let contextChunks = state.chunks;
  if (!isPlatformDemo && admin) {
    const semantic = await searchApprovedKnowledge(admin, workspaceId, input.text);
    if (semantic.length) contextChunks = semantic;
  }
  const result = await answerCustomerQuestion({ message: input.text, workspace: state.workspace, products: state.products, faqs: state.faqs, policies: state.policies, chunks: contextChunks });
  let deliveryStatus: Message["deliveryStatus"] = result.status === "awaiting_approval" ? "draft" : "failed";
  let externalId: string | undefined;
  let providerResponse: unknown;
  if (result.status !== "awaiting_approval") {
    try {
      const sent = await sendWhatsAppText({ phoneNumberId: input.phoneNumberId, accessToken, to: input.from, text: result.answer });
      deliveryStatus = "sent"; externalId = sent.messageId; providerResponse = sent.response;
    } catch (error) {
      console.error("WhatsApp reply failed", error instanceof Error ? error.message : "unknown");
    }
  }
  const outgoing: Message = { id: crypto.randomUUID(), workspaceId, conversationId: stored.conversationId, direction: "outgoing", sender: "ai", body: result.answer, deliveryStatus, createdAt: new Date().toISOString(), citations: result.citations, language: result.language, externalId, providerResponse };
  if (isPlatformDemo) {
    addDemoMessage(outgoing);
    updateDemoConversation(workspaceId, stored.conversationId, result.status === "answered" ? "ai_active" : result.status);
  } else if (admin) {
    const { error } = await admin.from("messages").insert({ id: outgoing.id, workspace_id: workspaceId, conversation_id: stored.conversationId, direction: outgoing.direction, sender: outgoing.sender, body: outgoing.body, delivery_status: outgoing.deliveryStatus, citations: outgoing.citations, language: outgoing.language, external_id: outgoing.externalId ?? null, provider_response: outgoing.providerResponse ?? null });
    if (error) console.error("Could not store WhatsApp reply", error.code);
    await admin.from("conversations").update({ status: result.status === "answered" ? "ai_active" : result.status, unread: 0, updated_at: outgoing.createdAt }).eq("id", stored.conversationId).eq("workspace_id", workspaceId);
    if (result.status === "escalated") {
      await admin.from("escalations").insert({ workspace_id: workspaceId, conversation_id: stored.conversationId, message_id: outgoing.id, reason: result.reason ?? "unsupported_information" });
      const { data: incomingRow } = await admin.from("messages").select("id").eq("workspace_id", workspaceId).eq("conversation_id", stored.conversationId).eq("external_id", input.externalId).maybeSingle();
      if (incomingRow) await admin.from("unresolved_questions").insert({ workspace_id: workspaceId, conversation_id: stored.conversationId, message_id: incomingRow.id, question: input.text, intent: result.intent });
    }
    await admin.from("agent_actions").insert({ workspace_id: workspaceId, conversation_id: stored.conversationId, message_id: outgoing.id, intent: result.intent, confidence: result.confidence, citations: result.citations, decision: result.status, reason: result.reason ?? null });
  }
}

export async function POST(request: NextRequest) {
  if (!(await enforceRateLimit(`webhook:${requestIp(request)}`, 300, 60_000)).allowed) return new NextResponse("Too many requests", { status: 429 });
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return new NextResponse("Webhook authenticity is not configured.", { status: 503 });
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > 2_000_000) return new NextResponse("Webhook payload is too large", { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 2_000_000) return new NextResponse("Webhook payload is too large", { status: 413 });
  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) return new NextResponse("Invalid signature", { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return new NextResponse("Invalid JSON", { status: 400 }); }
  const messages = parseWhatsAppMessages(payload);
  for (const message of messages) {
    if (!serviceClient() && !process.env.WHATSAPP_ACCESS_TOKEN) return new NextResponse("WhatsApp connection is not configured.", { status: 503 });
    if (process.env.WHATSAPP_PHONE_NUMBER_ID === message.phoneNumberId && !markWebhookEventOnce(message.externalId)) continue;
    after(async () => {
      try { await processMessage(message); }
      catch (error) { console.error("WhatsApp webhook processing failed", error instanceof Error ? error.message : "unknown"); }
    });
  }
  return NextResponse.json({ received: true, messages: messages.length });
}

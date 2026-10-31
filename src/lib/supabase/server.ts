import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Product, Workspace, WorkspaceState } from "@/lib/domain";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; route handlers can. */ }
      },
    },
  });
}

export async function getMembershipContext() {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return null;
  const { data: membership, error } = await client.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (error || !membership) return { client, user, workspaceId: null };
  return { client, user, workspaceId: membership.workspace_id as string };
}

export async function getSupabaseWorkspaceState(workspaceId: string, clientOverride?: SupabaseClient) {
  const client = clientOverride ?? await createSupabaseServerClient();
  if (!client) return null;
  const [workspaceResult, productsResult, sourcesResult, chunksResult, faqsResult, policiesResult, conversationsResult, messagesResult, connectionResult] = await Promise.all([
    client.from("workspaces").select("*").eq("id", workspaceId).single(),
    client.from("products").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    client.from("knowledge_sources").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    client.from("knowledge_chunks").select("*").eq("workspace_id", workspaceId).eq("approved", true),
    client.from("faqs").select("*").eq("workspace_id", workspaceId).eq("status", "approved").order("updated_at", { ascending: false }),
    client.from("policies").select("*").eq("workspace_id", workspaceId).eq("status", "approved").order("updated_at", { ascending: false }),
    client.from("conversations").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    client.from("messages").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
    client.from("whatsapp_connections").select("phone_number_id,business_account_id,display_phone,updated_at").eq("workspace_id", workspaceId).maybeSingle(),
  ]);
  if (workspaceResult.error || !workspaceResult.data) return null;
  const row = workspaceResult.data;
  const workspace: Workspace = {
    id: row.id, name: row.name, businessType: row.business_type, description: row.description ?? "", languages: row.languages ?? [],
    contact: row.contact ?? "", workingHours: row.working_hours ?? "", automationMode: row.automation_mode ?? "draft_only",
    phoneNumberId: null, whatsappPhone: null, createdAt: row.created_at,
  };
  return {
    workspace,
    products: (productsResult.data ?? []).map((item) => ({
      id: item.id, workspaceId: item.workspace_id, name: item.name, category: item.category ?? "", description: item.description ?? "",
      price: item.price === null ? null : Number(item.price), currency: item.currency ?? "INR", priceQualifier: item.price_qualifier ?? "",
      availability: item.availability ?? "", inclusions: item.inclusions ?? [], deliveryTime: item.delivery_time ?? "", status: item.status,
      sourceId: item.source_id, updatedAt: item.updated_at,
    })) as Product[],
    sources: (sourcesResult.data ?? []).map((item) => ({ id: item.id, workspaceId: item.workspace_id, name: item.name, type: item.file_type, status: item.status,
      extractedText: item.extracted_text ?? "", suggestedFacts: item.suggested_facts ?? [], suggestedProducts: item.suggested_products ?? [], suggestedFaqs: item.suggested_faqs ?? [], suggestedPolicies: item.suggested_policies ?? [], createdAt: item.created_at, updatedAt: item.updated_at })),
    chunks: (chunksResult.data ?? []).map((item) => ({ id: item.id, workspaceId: item.workspace_id, sourceId: item.source_id, content: item.content, approved: item.approved, updatedAt: item.updated_at })),
    faqs: (faqsResult.data ?? []).map((item) => ({ id: item.id, workspaceId: item.workspace_id, question: item.question, answer: item.answer, status: item.status, sourceId: item.source_id, updatedAt: item.updated_at })),
    policies: (policiesResult.data ?? []).map((item) => ({ id: item.id, workspaceId: item.workspace_id, name: item.name, content: item.content, status: item.status, sourceId: item.source_id, updatedAt: item.updated_at })),
    conversations: (conversationsResult.data ?? []).map((item) => ({ id: item.id, workspaceId: item.workspace_id, customerName: item.customer_name ?? "Customer", customerPhone: item.customer_phone ?? "", status: item.status,
      channel: item.channel, createdAt: item.created_at, updatedAt: item.updated_at, unread: item.unread ?? 0 })),
    messages: (messagesResult.data ?? []).map((item) => ({ id: item.id, workspaceId: item.workspace_id, conversationId: item.conversation_id, direction: item.direction, sender: item.sender,
      body: item.body, deliveryStatus: item.delivery_status, createdAt: item.created_at, citations: item.citations ?? [], language: item.language ?? "en", externalId: item.external_id ?? undefined, providerResponse: item.provider_response ?? undefined })),
    whatsappConnection: connectionResult.data ? {
      phoneNumberId: connectionResult.data.phone_number_id,
      businessAccountId: connectionResult.data.business_account_id,
      displayPhone: connectionResult.data.display_phone,
      tokenConfigured: true,
      updatedAt: connectionResult.data.updated_at,
    } : null,
  } satisfies WorkspaceState;
}

export function toProductRow(product: Product) {
  return {
    id: product.id, workspace_id: product.workspaceId, name: product.name, category: product.category, description: product.description,
    price: product.price, currency: product.currency, price_qualifier: product.priceQualifier, availability: product.availability,
    inclusions: product.inclusions, delivery_time: product.deliveryTime, status: product.status, source_id: product.sourceId,
  };
}

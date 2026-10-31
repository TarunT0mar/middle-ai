import { demoChunks, demoWorkspaceState, DEMO_WORKSPACE_ID } from "@/lib/demo-data";
import type { KnowledgeChunk, KnowledgeSource, Message, Product, Workspace, WorkspaceState } from "@/lib/domain";

declare global {
  // The demo store is deliberately process-local. It is used only when Supabase is not configured.
  var middleAiDemoStore: Map<string, WorkspaceState> | undefined;
  var middleAiWebhookEvents: Set<string> | undefined;
}

const store = () => {
  globalThis.middleAiDemoStore ??= new Map([[DEMO_WORKSPACE_ID, structuredClone({ ...demoWorkspaceState, chunks: demoChunks })]]);
  return globalThis.middleAiDemoStore;
};

export function getDemoState(workspaceId = DEMO_WORKSPACE_ID): WorkspaceState | null {
  const value = store().get(workspaceId);
  return value ? structuredClone(value) : null;
}

export function saveDemoState(state: WorkspaceState) {
  store().set(state.workspace.id, state);
}

export function getDemoDashboardState(): WorkspaceState {
  return getDemoState(DEMO_WORKSPACE_ID) ?? structuredClone({ ...demoWorkspaceState, chunks: demoChunks });
}

export function createDemoWorkspace(input: Pick<Workspace, "name" | "businessType" | "description" | "languages" | "contact" | "workingHours">) {
  const id = `workspace-${crypto.randomUUID()}`;
  const workspace: Workspace = {
    ...input,
    id,
    automationMode: "draft_only",
    phoneNumberId: null,
    whatsappPhone: null,
    createdAt: new Date().toISOString(),
  };
  const state: WorkspaceState = { workspace, products: [], faqs: [], policies: [], sources: [], chunks: [], conversations: [], messages: [], whatsappConnection: null };
  saveDemoState(state);
  return structuredClone(state);
}

export function upsertDemoProduct(product: Product) {
  const state = getDemoState(product.workspaceId);
  if (!state) return null;
  const index = state.products.findIndex((item) => item.id === product.id);
  if (index < 0) state.products.unshift(product);
  else state.products[index] = product;
  saveDemoState(state);
  return product;
}

export function updateDemoWorkspace(workspaceId: string, update: Partial<Workspace>) {
  const state = getDemoState(workspaceId);
  if (!state) return null;
  state.workspace = { ...state.workspace, ...update, id: workspaceId };
  saveDemoState(state);
  return state.workspace;
}

export function addDemoSource(source: KnowledgeSource) {
  const state = getDemoState(source.workspaceId);
  if (!state) return null;
  state.sources.unshift(source);
  saveDemoState(state);
  return source;
}

export function updateDemoSource(workspaceId: string, sourceId: string, update: Partial<KnowledgeSource>) {
  const state = getDemoState(workspaceId);
  if (!state) return null;
  const source = state.sources.find((item) => item.id === sourceId);
  if (!source) return null;
  Object.assign(source, update, { id: sourceId, workspaceId });
  saveDemoState(state);
  return source;
}

export function addDemoChunk(chunk: KnowledgeChunk) {
  const state = getDemoState(chunk.workspaceId);
  if (!state) return null;
  state.chunks = state.chunks.filter((item) => item.id !== chunk.id);
  state.chunks.unshift(chunk);
  saveDemoState(state);
  return chunk;
}

export function addDemoConversation(conversationId: string, workspaceId: string, customerName: string, customerPhone: string, channel: "whatsapp" | "web_demo") {
  const state = getDemoState(workspaceId);
  if (!state) return null;
  let conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) {
    const now = new Date().toISOString();
    conversation = { id: conversationId, workspaceId, customerName, customerPhone, channel, status: "ai_active", createdAt: now, updatedAt: now, unread: 0 };
    state.conversations.unshift(conversation);
  }
  saveDemoState(state);
  return conversation;
}

export function addDemoMessage(message: Message) {
  const state = getDemoState(message.workspaceId);
  if (!state) return null;
  if (message.externalId && state.messages.some((item) => item.externalId === message.externalId)) return null;
  state.messages.push(message);
  const conversation = state.conversations.find((item) => item.id === message.conversationId);
  if (conversation) {
    conversation.updatedAt = message.createdAt;
    if (message.direction === "incoming" && message.sender === "customer") conversation.unread += 1;
    if (message.direction === "outgoing" && message.sender !== "customer") conversation.unread = 0;
  }
  saveDemoState(state);
  return message;
}

export function updateDemoConversation(workspaceId: string, conversationId: string, status: WorkspaceState["conversations"][number]["status"]) {
  const state = getDemoState(workspaceId);
  if (!state) return null;
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return null;
  conversation.status = status;
  conversation.updatedAt = new Date().toISOString();
  saveDemoState(state);
  return conversation;
}

export function removeDemoSource(workspaceId: string, sourceId: string) {
  const state = getDemoState(workspaceId);
  if (!state) return false;
  state.sources = state.sources.filter((item) => item.id !== sourceId);
  state.chunks = state.chunks.filter((item) => item.sourceId !== sourceId);
  state.products = state.products.filter((item) => item.sourceId !== sourceId);
  state.faqs = state.faqs.filter((item) => item.sourceId !== sourceId);
  state.policies = state.policies.filter((item) => item.sourceId !== sourceId);
  saveDemoState(state);
  return true;
}

export function markWebhookEventOnce(externalId: string) {
  globalThis.middleAiWebhookEvents ??= new Set();
  if (globalThis.middleAiWebhookEvents.has(externalId)) return false;
  globalThis.middleAiWebhookEvents.add(externalId);
  return true;
}

export function isDemoMode() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

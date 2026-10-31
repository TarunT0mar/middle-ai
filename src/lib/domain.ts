export type AutomationMode = "draft_only" | "safe_automation" | "ai_active";
export type ApprovalStatus = "draft" | "approved" | "archived";
export type SourceStatus = "processing" | "pending_review" | "approved" | "rejected" | "error";
export type ConversationStatus = "ai_active" | "awaiting_approval" | "escalated" | "human_active" | "resolved";

export interface Workspace {
  id: string;
  name: string;
  businessType: string;
  description: string;
  languages: string[];
  contact: string;
  workingHours: string;
  automationMode: AutomationMode;
  phoneNumberId: string | null;
  whatsappPhone: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  description: string;
  price: number | null;
  currency: string;
  priceQualifier: string;
  availability: string;
  inclusions: string[];
  deliveryTime: string;
  status: ApprovalStatus;
  sourceId: string | null;
  updatedAt: string;
}

export interface KnowledgeSource {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  status: SourceStatus;
  extractedText: string;
  suggestedFacts: string[];
  suggestedProducts: ProductSuggestion[];
  suggestedFaqs: FaqSuggestion[];
  suggestedPolicies: PolicySuggestion[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductSuggestion {
  name: string;
  category: string;
  description: string;
  price: number | null;
  currency: string;
  priceQualifier: string;
  availability: string;
  inclusions: string[];
  deliveryTime: string;
}

export interface FaqSuggestion { question: string; answer: string }
export interface PolicySuggestion { name: string; content: string }

export interface Faq {
  id: string; workspaceId: string; question: string; answer: string; status: ApprovalStatus; sourceId: string | null; updatedAt: string;
}

export interface Policy {
  id: string; workspaceId: string; name: string; content: string; status: ApprovalStatus; sourceId: string | null; updatedAt: string;
}

export interface WhatsAppConnection {
  phoneNumberId: string;
  businessAccountId: string;
  displayPhone: string;
  tokenConfigured: boolean;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  workspaceId: string;
  sourceId: string;
  content: string;
  approved: boolean;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  customerName: string;
  customerPhone: string;
  status: ConversationStatus;
  channel: "whatsapp" | "web_demo";
  createdAt: string;
  updatedAt: string;
  unread: number;
}

export interface Message {
  id: string;
  workspaceId: string;
  conversationId: string;
  direction: "incoming" | "outgoing";
  sender: "customer" | "ai" | "owner";
  body: string;
  deliveryStatus: "received" | "sent" | "delivered" | "read" | "draft" | "failed";
  createdAt: string;
  citations: string[];
  language: "en" | "hi" | "hinglish";
  externalId?: string;
  providerResponse?: unknown;
}

export interface WorkspaceState {
  workspace: Workspace;
  products: Product[];
  faqs: Faq[];
  policies: Policy[];
  sources: KnowledgeSource[];
  chunks: KnowledgeChunk[];
  conversations: Conversation[];
  messages: Message[];
  whatsappConnection?: WhatsAppConnection | null;
}

export interface AgentResult {
  answer: string;
  status: "answered" | "awaiting_approval" | "escalated";
  confidence: number;
  intent: string;
  language: "en" | "hi" | "hinglish";
  citations: string[];
  reason?: string;
}

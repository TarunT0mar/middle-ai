import type { KnowledgeChunk, Product, WorkspaceState } from "@/lib/domain";

export const DEMO_WORKSPACE_ID = "studio-demo-middle-ai";
export const DEMO_SUPABASE_WORKSPACE_ID = "00000000-0000-4000-8000-00000000d001";
const now = Date.now();
const time = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

export const demoWorkspaceState: WorkspaceState = {
  workspace: {
    id: DEMO_WORKSPACE_ID,
    name: "Olive & Oak Studio",
    businessType: "Wedding photography",
    description: "A warm, documentary-led wedding photography studio in Jaipur.",
    languages: ["English", "Hindi", "Hinglish"],
    contact: "+91 98765 43210",
    workingHours: "Tuesday–Sunday, 10:00 AM–6:00 PM IST · Monday closed",
    automationMode: "safe_automation",
    phoneNumberId: null,
    whatsappPhone: null,
    createdAt: time(60 * 24 * 21),
  },
  products: [
    {
      id: "product-silver", workspaceId: DEMO_WORKSPACE_ID, name: "Wedding Photography Silver", category: "Wedding photography",
      description: "", price: 45000, currency: "INR", priceQualifier: "",
      availability: "", inclusions: [], deliveryTime: "",
      status: "approved", sourceId: "source-packages", updatedAt: time(120),
    },
    {
      id: "product-gold", workspaceId: DEMO_WORKSPACE_ID, name: "Wedding Photography Gold", category: "Wedding photography",
      description: "", price: 75000, currency: "INR", priceQualifier: "",
      availability: "", inclusions: ["Two photographers", "One videographer", "Edited photographs", "One album"], deliveryTime: "6–8 weeks",
      status: "approved", sourceId: "source-packages", updatedAt: time(120),
    },
    {
      id: "product-premium", workspaceId: DEMO_WORKSPACE_ID, name: "Wedding Photography Premium", category: "Wedding photography",
      description: "", price: 120000, currency: "INR", priceQualifier: "",
      availability: "", inclusions: [], deliveryTime: "",
      status: "approved", sourceId: "source-packages", updatedAt: time(120),
    },
  ],
  sources: [
    { id: "source-packages", workspaceId: DEMO_WORKSPACE_ID, name: "Wedding packages & pricing.pdf", type: "PDF · sample", status: "approved", extractedText: "Wedding Photography Silver — ₹45,000. Wedding Photography Gold — ₹75,000. Gold includes two photographers, one videographer, edited photographs and one album. Wedding Photography Premium — ₹1,20,000. Gold delivery time: 6–8 weeks. Booking advance: 30%.", suggestedFacts: [], suggestedProducts: [], suggestedFaqs: [], suggestedPolicies: [], createdAt: time(60 * 24 * 12), updatedAt: time(120) },
    { id: "source-booking", workspaceId: DEMO_WORKSPACE_ID, name: "Booking & cancellation policy.txt", type: "TXT · sample", status: "approved", extractedText: "A 30% advance is required to confirm a booking. Cancellations and refund terms are reviewed against the signed client agreement; please ask the studio team to confirm the applicable terms.", suggestedFacts: [], suggestedProducts: [], suggestedFaqs: [], suggestedPolicies: [], createdAt: time(60 * 24 * 10), updatedAt: time(180) },
    { id: "source-faq", workspaceId: DEMO_WORKSPACE_ID, name: "Frequently asked questions.txt", type: "TXT · sample", status: "approved", extractedText: "The studio is open Tuesday to Sunday, 10 AM to 6 PM IST, and closed Monday. Contact +91 98765 43210. Wedding gallery delivery takes 6–8 weeks.", suggestedFacts: [], suggestedProducts: [], suggestedFaqs: [], suggestedPolicies: [], createdAt: time(60 * 24 * 7), updatedAt: time(240) },
  ],
  chunks: [],
  conversations: [
    { id: "conversation-gold", workspaceId: DEMO_WORKSPACE_ID, customerName: "Ananya Mehta", customerPhone: "+91 98••• 4218", status: "ai_active", channel: "web_demo", createdAt: time(6), updatedAt: time(3), unread: 0 },
    { id: "conversation-drone", workspaceId: DEMO_WORKSPACE_ID, customerName: "Rohan Kapoor", customerPhone: "+91 98••• 7731", status: "escalated", channel: "web_demo", createdAt: time(40), updatedAt: time(36), unread: 1 },
    { id: "conversation-date", workspaceId: DEMO_WORKSPACE_ID, customerName: "Mira Shah", customerPhone: "+91 97••• 1082", status: "human_active", channel: "whatsapp", createdAt: time(92), updatedAt: time(88), unread: 0 },
  ],
  messages: [
    { id: "message-1", workspaceId: DEMO_WORKSPACE_ID, conversationId: "conversation-gold", direction: "incoming", sender: "customer", body: "Gold package ka kya price hai? Album milega?", deliveryStatus: "read", createdAt: time(4), citations: [], language: "hinglish" },
    { id: "message-2", workspaceId: DEMO_WORKSPACE_ID, conversationId: "conversation-gold", direction: "outgoing", sender: "ai", body: "Gold package ₹75,000 ka hai, aur haan, isme one album included hai. Booking confirm karne ke liye 30% advance required hai.", deliveryStatus: "delivered", createdAt: time(3), citations: ["source-packages", "source-booking"], language: "hinglish" },
    { id: "message-3", workspaceId: DEMO_WORKSPACE_ID, conversationId: "conversation-drone", direction: "incoming", sender: "customer", body: "Gold package mein drone bhi included hai?", deliveryStatus: "read", createdAt: time(38), citations: [], language: "hinglish" },
    { id: "message-4", workspaceId: DEMO_WORKSPACE_ID, conversationId: "conversation-drone", direction: "outgoing", sender: "ai", body: "Gold package mein drone coverage ki confirmed information mere paas nahi hai. Main team se check karwa deta hoon.", deliveryStatus: "sent", createdAt: time(36), citations: [], language: "hinglish" },
    { id: "message-5", workspaceId: DEMO_WORKSPACE_ID, conversationId: "conversation-date", direction: "incoming", sender: "customer", body: "Can you confirm our date for next Friday?", deliveryStatus: "read", createdAt: time(90), citations: [], language: "en" },
    { id: "message-6", workspaceId: DEMO_WORKSPACE_ID, conversationId: "conversation-date", direction: "outgoing", sender: "owner", body: "I’ll check the calendar and confirm shortly.", deliveryStatus: "delivered", createdAt: time(88), citations: [], language: "en" },
  ],
  faqs: [
    { id: "faq-delivery", workspaceId: DEMO_WORKSPACE_ID, question: "How long does the Gold package take to deliver?", answer: "Wedding Photography Gold delivery takes 6–8 weeks.", status: "approved", sourceId: "source-packages", updatedAt: time(120) },
    { id: "faq-advance", workspaceId: DEMO_WORKSPACE_ID, question: "What advance is required?", answer: "A 30% advance is required to confirm a booking.", status: "approved", sourceId: "source-booking", updatedAt: time(180) },
    { id: "faq-hours", workspaceId: DEMO_WORKSPACE_ID, question: "When is the studio open?", answer: "Tuesday to Sunday, 10 AM to 6 PM IST. The studio is closed Monday.", status: "approved", sourceId: "source-faq", updatedAt: time(240) },
  ],
  policies: [
    { id: "policy-cancellation", workspaceId: DEMO_WORKSPACE_ID, name: "Cancellation and refunds", content: "Cancellations and refund terms are reviewed against the signed client agreement. Please ask the studio team to confirm the applicable terms.", status: "approved", sourceId: "source-booking", updatedAt: time(180) },
  ],
  whatsappConnection: null,
};

export const demoChunks: KnowledgeChunk[] = [
  { id: "chunk-packages", workspaceId: DEMO_WORKSPACE_ID, sourceId: "source-packages", content: "Wedding Photography Silver costs ₹45,000. Wedding Photography Gold costs ₹75,000 and includes two photographers, one videographer, edited photographs and one album. Wedding Photography Premium costs ₹1,20,000. Wedding gallery delivery takes 6–8 weeks. A 30% advance is required to confirm a booking.", approved: true, updatedAt: time(120) },
  { id: "chunk-booking", workspaceId: DEMO_WORKSPACE_ID, sourceId: "source-booking", content: "A 30% advance is required to confirm a booking. Cancellations and refund terms are reviewed against the signed client agreement; ask the studio team to confirm the applicable terms.", approved: true, updatedAt: time(180) },
  { id: "chunk-faq", workspaceId: DEMO_WORKSPACE_ID, sourceId: "source-faq", content: "The studio is open Tuesday to Sunday, 10 AM to 6 PM IST, and closed Monday. Contact +91 98765 43210. Wedding gallery delivery takes 6–8 weeks.", approved: true, updatedAt: time(240) },
];

export function approvedProducts(products: Product[]) {
  return products.filter((product) => product.status === "approved");
}

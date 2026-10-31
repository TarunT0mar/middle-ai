import { beforeEach, describe, expect, it } from "vitest";
import { demoChunks, demoWorkspaceState } from "@/lib/demo-data";
import { answerCustomerQuestion, detectLanguage, retrieveApprovedContext } from "@/lib/safe-agent";
import { markWebhookEventOnce } from "@/lib/store";

const workspace = structuredClone(demoWorkspaceState.workspace);
const products = structuredClone(demoWorkspaceState.products);
const chunks = structuredClone(demoChunks);

describe("Middle AI answer safety", () => {
  beforeEach(() => { delete process.env.OPENAI_API_KEY; delete process.env.DEEPSEEK_API_KEY; });

  it("isolates retrieval by workspace", () => {
    const result = retrieveApprovedContext({ message: "Gold package price?", workspaceId: "workspace-other", products, chunks });
    expect(result.products).toHaveLength(0);
    expect(result.chunks).toHaveLength(0);
  });

  it("looks up the exact approved Gold package price", async () => {
    const result = await answerCustomerQuestion({ message: "Gold package price?", workspace, products, chunks });
    expect(result.status).toBe("answered");
    expect(result.answer).toContain("₹75,000");
    expect(result.citations).toContain("source-packages");
  });

  it("does not use draft products or draft knowledge for customer answers", async () => {
    const draftProducts = products.map((product) => product.id === "product-gold" ? { ...product, status: "draft" as const } : product);
    const draftChunks = chunks.map((chunk) => ({ ...chunk, approved: false }));
    const result = await answerCustomerQuestion({ message: "Gold package price?", workspace, products: draftProducts, chunks: draftChunks });
    expect(result.status).toBe("escalated");
    expect(result.answer).not.toContain("₹75,000");
  });

  it("escalates when information such as drone coverage is absent", async () => {
    const result = await answerCustomerQuestion({ message: "Gold package mein drone coverage hai?", workspace, products, chunks });
    expect(result.status).toBe("escalated");
    expect(result.reason).toBe("unsupported_information");
    expect(result.answer).not.toMatch(/drone.*included/i);
  });

  it("escalates conflicting structured and approved prices", async () => {
    const conflictingProducts = products.map((product) => product.id === "product-gold" ? { ...product, price: 79000 } : product);
    const result = await answerCustomerQuestion({ message: "Gold package price?", workspace, products: conflictingProducts, chunks });
    expect(result.status).toBe("escalated");
    expect(result.reason).toBe("conflicting_information");
    expect(result.answer).not.toContain("₹79,000");
  });

  it("always escalates sensitive requests", async () => {
    const result = await answerCustomerQuestion({ message: "Can you give me a discount?", workspace, products, chunks });
    expect(result.status).toBe("escalated");
    expect(result.reason).toBe("sensitive_intent");
  });

  it("escalates booking changes and complaints without generating a commitment", async () => {
    const booking = await answerCustomerQuestion({ message: "Can you change my booking date?", workspace, products, chunks });
    const complaint = await answerCustomerQuestion({ message: "I'm disappointed with the photos", workspace, products, chunks });
    expect(booking.reason).toBe("sensitive_intent");
    expect(complaint.reason).toBe("sensitive_intent");
    expect(booking.answer).not.toMatch(/date is changed|booking updated/i);
  });

  it("matches the customer language for Hinglish", async () => {
    const result = await answerCustomerQuestion({ message: "Gold package ka kya price hai? Album milega?", workspace, products, chunks });
    expect(detectLanguage("Gold package ka kya price hai? Album milega?")).toBe("hinglish");
    expect(result.language).toBe("hinglish");
    expect(result.answer).toContain("₹75,000");
    expect(result.answer).toContain("one album");
    expect(result.answer).toContain("30% advance");
  });

  it("does not put facts absent from approved context in a reply", async () => {
    const result = await answerCustomerQuestion({ message: "Is a drone included in Gold?", workspace, products, chunks });
    expect(result.status).toBe("escalated");
    expect(result.answer).not.toMatch(/drone (?:is|will be|comes|coverage is) included/i);
    expect(result.answer).not.toMatch(/₹\s?\d/);
  });

  it("deduplicates WhatsApp webhook message IDs", () => {
    const eventId = `wamid-test-${crypto.randomUUID()}`;
    expect(markWebhookEventOnce(eventId)).toBe(true);
    expect(markWebhookEventOnce(eventId)).toBe(false);
  });
});

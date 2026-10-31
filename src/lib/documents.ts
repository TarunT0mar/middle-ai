import { generateAIText, isAIConfigured } from "@/lib/ai-provider";
import { z } from "zod";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 120_000;
const allowedExtensions = new Set(["pdf", "docx", "txt", "md", "csv", "xlsx", "png", "jpg", "jpeg", "webp"]);
const allowedMimeTypes: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain"],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
};

export function cleanText(text: string) {
  return text.replace(/\u0000/g, "").replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\r\n?/g, "\n").slice(0, MAX_EXTRACTED_CHARS).trim();
}

export function safeFilename(filename: string) {
  const leaf = filename.replace(/\\/g, "/").split("/").pop() ?? "upload";
  return leaf.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 120) || "upload";
}

export function supportedUpload(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return allowedExtensions.has(ext);
}

export function suggestFacts(text: string) {
  return cleanText(text).split(/\n+/).map((line) => line.replace(/^[-*•\s]+/, "").trim())
    .filter((line) => line.length >= 12 && line.length <= 280)
    .filter((line) => /₹|\$|\b(?:price|cost|includes?|delivery|advance|cancellation|refund|open|closed|hours?|contact|available|policy|faq|package)\b/i.test(line))
    .slice(0, 20);
}

const extractionSchema = z.object({ facts: z.array(z.string()).max(30).default([]), products: z.array(z.object({
  name: z.string(), category: z.string().default(""), description: z.string().default(""), price: z.number().nullable().default(null), currency: z.string().default("INR"),
  priceQualifier: z.string().default(""), availability: z.string().default(""), inclusions: z.array(z.string()).default([]), deliveryTime: z.string().default(""),
})).max(40).default([]), faqs: z.array(z.object({ question: z.string(), answer: z.string() })).max(30).default([]), policies: z.array(z.object({ name: z.string(), content: z.string() })).max(20).default([]) });

export type ExtractionSuggestions = z.infer<typeof extractionSchema>;

function inferFaqsAndPolicies(text: string) {
  const lines = cleanText(text).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const faqs: ExtractionSuggestions["faqs"] = [];
  const policies: ExtractionSuggestions["policies"] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const paired = line.match(/^(?:FAQ\s*)?Q(?:uestion)?\s*:\s*(.+)$/i);
    const pairedAnswer = lines[index + 1]?.match(/^(?:FAQ\s*)?A(?:nswer)?\s*:\s*(.+)$/i);
    if (paired && pairedAnswer) { faqs.push({ question: paired[1], answer: pairedAnswer[1] }); index += 1; continue; }
    if (line.endsWith("?") && lines[index + 1] && !lines[index + 1].endsWith("?")) faqs.push({ question: line, answer: lines[index + 1] });
    const policy = line.match(/^(.{3,70}?(?:cancellation|refund|return|delivery|privacy|booking|payment)?\s*policy)\s*[:—-]\s*(.+)$/i);
    if (policy) policies.push({ name: policy[1].trim(), content: policy[2].trim() });
  }
  return { faqs: faqs.slice(0, 30), policies: policies.slice(0, 20) };
}

async function extractImagesWithAI(file: File, bytes: Buffer) {
  if (!isAIConfigured()) throw new Error("Image text extraction needs DEEPSEEK_API_KEY or OPENAI_API_KEY. Add a key to .env.local, then reprocess this image.");
  const contentType = file.type || "image/png";
  const text = await generateAIText({
    instructions: "Transcribe all legible text from this business document image. Preserve prices, dates, product names and policy wording exactly. Return only the transcription.",
    prompt: "Read and transcribe the business document image.",
    imageDataUrl: `data:${contentType};base64,${bytes.toString("base64")}`,
  });
  if (!text) throw new Error("The AI provider returned no text for this image.");
  return text;
}

export async function extractDocument(file: File): Promise<{ text: string; type: string }> {
  const name = safeFilename(file.name);
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension)) throw new Error("This file type is not supported. Use PDF, DOCX, TXT, CSV, XLSX or an image.");
  const mimeType = file.type.toLowerCase();
  if (mimeType && mimeType !== "application/octet-stream" && !allowedMimeTypes[extension]?.includes(mimeType)) throw new Error("The file type does not match its filename. Choose a supported document or image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is larger than 15 MB. Please upload a smaller document.");
  if (!file.size) throw new Error("The selected file is empty.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let text = "";
  if (["txt", "md"].includes(extension)) text = bytes.toString("utf8");
  else if (extension === "csv") text = bytes.toString("utf8");
  else if (extension === "xlsx") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
    text = workbook.SheetNames.map((sheetName) => `${sheetName}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])}`).join("\n\n");
  } else if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: bytes });
    text = result.value;
  } else if (extension === "pdf") {
    const parserModule = await import("pdf-parse");
    const Parser = parserModule.PDFParse;
    if (!Parser) throw new Error("The PDF parser is unavailable. Reinstall dependencies and try again.");
    const parser = new Parser({ data: new Uint8Array(bytes) });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (["png", "jpg", "jpeg", "webp"].includes(extension)) text = await extractImagesWithAI(file, bytes);
  const cleaned = cleanText(text);
  if (!cleaned) throw new Error("No readable text was found in this file. You can paste the information manually.");
  return { text: cleaned, type: extension.toUpperCase() };
}

export async function extractStructuredSuggestions(text: string): Promise<ExtractionSuggestions> {
  const deterministicProducts = () => suggestedPriceRows(text).map((item) => ({
    name: item.name, category: "", description: "", price: item.price, currency: item.currency, priceQualifier: "", availability: "", inclusions: [], deliveryTime: "",
  }));
  if (!isAIConfigured()) return { facts: suggestFacts(text), products: deterministicProducts(), ...inferFaqsAndPolicies(text) };
  try {
    const output = await generateAIText({
      instructions: "Extract only explicit business facts from the supplied text. Never infer a price, availability, policy, inclusion or promise. Return JSON with facts (short verbatim-supported statements), products (name, category, description, numeric price or null, currency, priceQualifier, availability, inclusions, deliveryTime), faqs (question and answer pairs explicitly present), and policies (name and exact policy text). Omit uncertain fields and use defaults.",
      prompt: text.slice(0, 90_000),
      jsonObject: true,
    });
    if (!output) throw new Error("The AI provider returned no extraction text.");
    return extractionSchema.parse(JSON.parse(output));
  } catch (error) {
    console.error("AI document extraction failed", error instanceof Error ? error.name : "unknown");
    return { facts: suggestFacts(text), products: deterministicProducts(), ...inferFaqsAndPolicies(text) };
  }
}

export function suggestedPriceRows(text: string) {
  const rows = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return rows.flatMap((line) => {
    const match = line.match(/^(.{3,100}?)\s*(?:[-,:|]\s*)?(?:₹|INR\s*)\s?([\d,]+(?:\.\d{1,2})?)\s*$/i);
    if (!match) return [];
    const name = match[1].replace(/[-,:|\s]+$/, "").trim();
    return name ? [{ name, price: Number(match[2].replace(/,/g, "")), currency: "INR" }] : [];
  });
}

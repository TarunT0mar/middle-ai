import { NextRequest, NextResponse } from "next/server";
import { addDemoSource, getDemoState, isDemoMode } from "@/lib/store";
import { DEMO_WORKSPACE_ID } from "@/lib/demo-data";
import { extractDocument, extractStructuredSuggestions, safeFilename } from "@/lib/documents";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient, getMembershipContext } from "@/lib/supabase/server";
import type { KnowledgeSource } from "@/lib/domain";

function requestIp(request: NextRequest) {
  return request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
}

export async function POST(request: NextRequest) {
  const rate = await enforceRateLimit(`upload:${requestIp(request)}`, 10, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Upload limit reached. Please wait a minute and try again." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  try {
    let workspaceId: string;
    const demoMode = isDemoMode();
    let client: Awaited<ReturnType<typeof createSupabaseServerClient>> = null;
    if (demoMode) {
      workspaceId = request.cookies.get("middle-ai-workspace")?.value || DEMO_WORKSPACE_ID;
      if (!getDemoState(workspaceId)) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    } else {
      const context = await getMembershipContext();
      if (!context?.user || !context.client || !context.workspaceId) return NextResponse.json({ error: "Sign in and finish workspace setup before uploading." }, { status: 401 });
      workspaceId = context.workspaceId;
      client = context.client;
    }
    const extracted = await extractDocument(file);
    const suggestions = await extractStructuredSuggestions(extracted.text);
    const now = new Date().toISOString();
    const source: KnowledgeSource = {
      id: crypto.randomUUID(), workspaceId, name: safeFilename(file.name), type: extracted.type, status: "pending_review",
      extractedText: extracted.text, suggestedFacts: suggestions.facts, suggestedProducts: suggestions.products, suggestedFaqs: suggestions.faqs, suggestedPolicies: suggestions.policies, createdAt: now, updatedAt: now,
    };
    if (demoMode) addDemoSource(source);
    else {
      const path = `${workspaceId}/${source.id}/${source.name}`;
      const uploaded = await client!.storage.from("knowledge-source-files").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploaded.error) throw new Error(`Private file upload failed: ${uploaded.error.message}`);
      const created = await client!.from("knowledge_sources").insert({ id: source.id, workspace_id: workspaceId, name: source.name, file_type: source.type, status: source.status,
        extracted_text: source.extractedText, suggested_facts: source.suggestedFacts, suggested_products: source.suggestedProducts, suggested_faqs: source.suggestedFaqs, suggested_policies: source.suggestedPolicies, storage_path: path });
      if (created.error) {
        await client!.storage.from("knowledge-source-files").remove([path]);
        throw new Error(`Source record could not be saved: ${created.error.message}`);
      }
    }
    return NextResponse.json({ ok: true, source: { ...source, extractedText: source.extractedText.slice(0, 2400) } }, { status: 201 });
  } catch (error) {
    console.error("Document ingestion failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not process this file." }, { status: 422 });
  }
}

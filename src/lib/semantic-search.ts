import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KnowledgeChunk } from "@/lib/domain";

export async function createTextEmbeddings(texts: string[]) {
  if (!process.env.OPENAI_API_KEY || texts.length === 0) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embeddings: number[][] = [];
  for (let start = 0; start < texts.length; start += 64) {
    const response = await client.embeddings.create({ model: "text-embedding-3-small", input: texts.slice(start, start + 64) });
    embeddings.push(...response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding));
  }
  return embeddings;
}

export async function searchApprovedKnowledge(client: SupabaseClient, workspaceId: string, question: string): Promise<KnowledgeChunk[]> {
  if (!process.env.OPENAI_API_KEY) return [];
  try {
    const embeddings = await createTextEmbeddings([question]);
    if (!embeddings?.[0]) return [];
    const vector = `[${embeddings[0].join(",")}]`;
    const { data, error } = await client.rpc("search_approved_knowledge", { p_workspace_id: workspaceId, p_query_embedding: vector, p_match_count: 5 });
    if (error || !data) return [];
    return data.map((item: { id: string; workspace_id: string; source_id: string; content: string; updated_at: string }) => ({ id: item.id, workspaceId: item.workspace_id, sourceId: item.source_id, content: item.content, approved: true, updatedAt: item.updated_at }));
  } catch (error) {
    console.error("Semantic knowledge lookup failed", error instanceof Error ? error.name : "unknown");
    return [];
  }
}

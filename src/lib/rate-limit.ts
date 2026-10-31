import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface Bucket { start: number; count: number }

declare global {
  var middleAiRateLimits: Map<string, Bucket> | undefined;
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  globalThis.middleAiRateLimits ??= new Map();
  const now = Date.now();
  const current = globalThis.middleAiRateLimits.get(key);
  if (!current || now - current.start >= windowMs) {
    globalThis.middleAiRateLimits.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: limit - 1 };
  }
  if (current.count >= limit) return { allowed: false, remaining: 0 };
  current.count += 1;
  return { allowed: true, remaining: limit - current.count };
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const keyHash = createHash("sha256").update(key).digest("hex");
    const { data, error } = await admin.rpc("consume_rate_limit", { p_key_hash: keyHash, p_limit: limit, p_window_ms: windowMs });
    if (!error && typeof data === "boolean") return { allowed: data, remaining: data ? limit - 1 : 0 };
    console.error("Shared rate limit unavailable", error?.code ?? "unknown");
  }
  return rateLimit(key, limit, windowMs);
}

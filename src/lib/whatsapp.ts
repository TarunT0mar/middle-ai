import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptAccessToken } from "@/lib/token-crypto";

export interface WhatsAppSendResult {
  messageId: string;
  response: unknown;
}

export async function sendWhatsAppText(input: { phoneNumberId: string; accessToken: string; to: string; text: string }): Promise<WhatsAppSendResult> {
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  if (!/^v\d+\.\d+$/.test(version)) throw new Error("WHATSAPP_API_VERSION must look like v26.0.");
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(input.phoneNumberId)}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${input.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: input.to.replace(/\D/g, ""), type: "text", text: { preview_url: false, body: input.text } }),
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data && typeof data.error === "object" && data.error && "message" in data.error ? String(data.error.message) : `Meta Graph API returned ${response.status}.`;
    throw new Error(`WhatsApp send failed: ${message}`);
  }
  const messages = typeof data === "object" && data && "messages" in data && Array.isArray(data.messages) ? data.messages : [];
  const messageId = messages[0] && typeof messages[0] === "object" && "id" in messages[0] ? String(messages[0].id) : "";
  if (!messageId) throw new Error("WhatsApp accepted the request but did not return a message ID.");
  return { messageId, response: data };
}

export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const provided = Buffer.from(header.slice(7), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function parseWhatsAppMessages(payload: unknown) {
  const events: { phoneNumberId: string; from: string; name: string; externalId: string; type: string; text: string }[] = [];
  if (!payload || typeof payload !== "object" || !("entry" in payload) || !Array.isArray(payload.entry)) return events;
  for (const entry of payload.entry) {
    if (!entry || typeof entry !== "object" || !("changes" in entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (!change || typeof change !== "object" || !("value" in change) || !change.value || typeof change.value !== "object") continue;
      const value = change.value;
      const metadata = "metadata" in value && value.metadata && typeof value.metadata === "object" ? value.metadata : null;
      const phoneNumberId = metadata && "phone_number_id" in metadata ? String(metadata.phone_number_id) : "";
      const contacts = "contacts" in value && Array.isArray(value.contacts) ? value.contacts : [];
      const messages = "messages" in value && Array.isArray(value.messages) ? value.messages : [];
      for (const message of messages) {
        if (!message || typeof message !== "object") continue;
        const from = "from" in message ? String(message.from) : "";
        const externalId = "id" in message ? String(message.id) : "";
        const type = "type" in message ? String(message.type) : "unknown";
        if (!from || !externalId || !phoneNumberId) continue;
        const contact = contacts.find((item: unknown) => item && typeof item === "object" && "wa_id" in item && String(item.wa_id) === from);
        const profile = contact && typeof contact === "object" && "profile" in contact && contact.profile && typeof contact.profile === "object" ? contact.profile : null;
        const name = profile && "name" in profile ? String(profile.name) : "WhatsApp customer";
        const textObject = type === "text" && "text" in message && message.text && typeof message.text === "object" ? message.text : null;
        const text = textObject && "body" in textObject ? String(textObject.body) : "";
        events.push({ phoneNumberId, from, name, externalId, type, text });
      }
    }
  }
  return events;
}

export async function lookupWhatsAppConnection(client: SupabaseClient, phoneNumberId: string) {
  const { data, error } = await client.from("whatsapp_connections").select("workspace_id,phone_number_id,encrypted_access_token,display_phone").eq("phone_number_id", phoneNumberId).maybeSingle();
  if (error || !data) return null;
  return { workspaceId: String(data.workspace_id), phoneNumberId: String(data.phone_number_id), accessToken: decryptAccessToken(String(data.encrypted_access_token)), displayPhone: String(data.display_phone ?? "") };
}

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey() {
  const value = process.env.TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("TOKEN_ENCRYPTION_KEY is required to save a WhatsApp access token.");
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function encryptAccessToken(token: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptAccessToken(value: string) {
  const [nonce, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!nonce || !tag || !ciphertext) throw new Error("Stored WhatsApp access token has an invalid encrypted format.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

import OpenAI from "openai";

type ProviderName = "deepseek" | "openai";

interface ProviderConfig {
  name: ProviderName;
  client: OpenAI;
  model: string;
}

export function getAIProviderName(): ProviderName | null {
  if (process.env.DEEPSEEK_API_KEY?.trim()) return "deepseek";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return null;
}

export function isAIConfigured() {
  return getAIProviderName() !== null;
}

function getProvider(): ProviderConfig | null {
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    return {
      name: "deepseek",
      client: new OpenAI({ apiKey: deepseekKey, baseURL: "https://api.deepseek.com" }),
      model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      name: "openai",
      client: new OpenAI({ apiKey: openaiKey }),
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    };
  }
  return null;
}

export async function generateAIText(input: {
  instructions: string;
  prompt: string;
  jsonObject?: boolean;
  imageDataUrl?: string;
}) {
  const provider = getProvider();
  if (!provider) return null;
  const response = await provider.client.responses.create({
    model: provider.model,
    instructions: input.instructions,
    input: input.imageDataUrl
      ? [{
          role: "user",
          content: [
            { type: "input_text", text: input.prompt },
            { type: "input_image", image_url: input.imageDataUrl, detail: "high" },
          ],
        }]
      : input.prompt,
    ...(input.jsonObject ? { text: { format: { type: "json_object" as const } } } : {}),
  });
  return response.output_text.trim() || null;
}

import { GoogleGenAI } from "@google/genai";

if (typeof window !== "undefined") {
  throw new Error("Gemini client must only be initialized on the server.");
}

// Free-tier eligible Flash models in priority order
export const FLASH_MODEL_CANDIDATES = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

export type GeminiMessagePart = { text: string };
export type GeminiContentItem = { role?: string; parts: GeminiMessagePart[] };
export type GeminiContent = string | GeminiContentItem[];

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateWithFallback(
  options: {
    systemInstruction?: string;
    contents: GeminiContent;
    responseSchema?: Record<string, unknown>;
    responseMimeType?: string;
  },
  maxRetries = 2
) {
  const client = getGeminiClient();

  let lastError: Error | null = null;

  for (const model of FLASH_MODEL_CANDIDATES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await client.models.generateContent({
          model,
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: options.responseMimeType,
            responseSchema: options.responseSchema,
            temperature: 0.2, // Low temperature for deterministic, careful triage
          },
          contents: options.contents as unknown as string,
        });

        if (result && result.text) {
          return { text: result.text, modelUsed: model };
        }
      } catch (err: unknown) {
        lastError = err as Error;
        const msg = lastError.message || "";
        console.warn(`[GEMINI_RETRY] Model ${model} attempt ${attempt} failed: ${msg}`);

        // If rate limited or unavailable, wait briefly with backoff
        if (msg.includes("429") || msg.includes("503") || msg.includes("demand")) {
          await new Promise((res) => setTimeout(res, attempt * 1200));
        } else if (msg.includes("404") || msg.includes("not found")) {
          // Model does not exist, break to try next model immediately
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content across all Gemini Flash models.");
}

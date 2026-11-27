import { GoogleGenAI } from "@google/genai";
import { estimateTokensRough } from "@/lib/utils";
import type { SupportedLanguage } from "@/types/assessment";

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
}

export function getGeminiModelCandidates(): string[] {
  const primary = getGeminiModel();
  const customFallbacks = (process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const defaults = [
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
  ];

  return Array.from(new Set([primary, ...customFallbacks, ...defaults]));
}

function isRetryableOrUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("429") ||
    msg.includes("404") ||
    msg.includes("NOT_FOUND") ||
    msg.includes("high demand")
  );
}

export function extractCodeFromMarkdown(
  text: string,
  language: SupportedLanguage
): string | null {
  const langPattern = new RegExp(
    "```(?:" + language + "|py|js|javascript|python)?\\s*\\n([\\s\\S]*?)```",
    "i"
  );
  const match = text.match(langPattern);
  if (match && match[1]) {
    return match[1].trim();
  }
  const generic = text.match(/```\s*\n([\s\S]*?)```/);
  if (generic && generic[1]) {
    return generic[1].trim();
  }
  return null;
}

export interface GeminiTurnResult {
  text: string;
  extractedCode: string | null;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  model: string;
}

export async function generateCodingReply(params: {
  systemInstruction: string;
  messages: Array<{ role: "user" | "model"; text: string }>;
  language: SupportedLanguage;
}): Promise<GeminiTurnResult> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error(
      "GEMINI_API_KEY is not configured in .env.local. Add your Gemini API key and restart the dev server."
    );
  }

  const contents = params.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const candidates = getGeminiModelCandidates();
  let lastError: unknown = null;

  for (const model of candidates) {
    // Try each model up to 2 times on transient 503 high-demand spikes
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 1600,
          },
        });

        const text = response.text ?? "";
        const usage = response.usageMetadata;
        const promptTokens =
          usage?.promptTokenCount ??
          estimateTokensRough(
            params.systemInstruction +
              params.messages.map((m) => m.text).join("\n")
          );
        const completionTokens =
          usage?.candidatesTokenCount ?? estimateTokensRough(text);
        const cachedTokens = usage?.cachedContentTokenCount ?? 0;

        return {
          text,
          extractedCode: extractCodeFromMarkdown(text, params.language),
          promptTokens,
          completionTokens,
          cachedTokens,
          model,
        };
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        // If 404/NOT_FOUND, skip straight to next fallback model without retrying
        if (msg.includes("404") || msg.includes("NOT_FOUND")) {
          break;
        }
        if (attempt === 0 && isRetryableOrUnavailable(err)) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Gemini models are currently unavailable. Please retry.");
}

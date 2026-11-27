import { GoogleGenAI } from "@google/genai";
import { estimateTokensRough } from "@/lib/utils";
import type { SupportedLanguage } from "@/types/assessment";

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
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
  const model = getGeminiModel();

  if (!client) {
    throw new Error(
      "GEMINI_API_KEY is not configured in .env.local. Add your Gemini API key and restart the dev server."
    );
  }

  const contents = params.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

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
      params.systemInstruction + params.messages.map((m) => m.text).join("\n")
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
}

import { estimateTokensRough } from "@/lib/utils";
import type { SupportedLanguage } from "@/types/assessment";
import {
  extractCodeFromMarkdown,
  generateCodingReply,
  getGeminiClient,
  type GeminiTurnResult,
} from "./gemini";

export type AIProviderId = "auto" | "gemini" | "groq" | "openrouter";

export interface ProviderStatus {
  id: Exclude<AIProviderId, "auto">;
  label: string;
  configured: boolean;
  defaultModel: string;
  costPer1kInputUsd: number;
  costPer1kOutputUsd: number;
}

export interface MultiProviderTurnResult extends GeminiTurnResult {
  provider: Exclude<AIProviderId, "auto">;
}

export function getProviderStatuses(): ProviderStatus[] {
  return [
    {
      id: "gemini",
      label: "Google Gemini",
      configured: Boolean(getGeminiClient()),
      defaultModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      costPer1kInputUsd: 0.0001,
      costPer1kOutputUsd: 0.0004,
    },
    {
      id: "groq",
      label: "Groq (Llama 3.3 70B)",
      configured: Boolean(process.env.GROQ_API_KEY?.trim()),
      defaultModel:
        process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
      costPer1kInputUsd: 0.00059,
      costPer1kOutputUsd: 0.00079,
    },
    {
      id: "openrouter",
      label: "OpenRouter (Qwen Coder)",
      configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
      defaultModel:
        process.env.OPENROUTER_MODEL?.trim() ||
        "qwen/qwen-2.5-coder-32b-instruct:free",
      costPer1kInputUsd: 0.00015,
      costPer1kOutputUsd: 0.0003,
    },
  ];
}

/**
 * Estimates USD cost for token usage using Gemini Flash-Lite blended rates.
 */
export function estimateSessionCostUsd(
  tokensUsed: number,
  tokensSaved = 0
): { costUsd: number; savedUsd: number } {
  // Blended rate: ~65% input ($0.0001/1K) + ~35% output ($0.0004/1K) ≈ $0.000205/1K
  const blendedPer1k = 0.000205;
  return {
    costUsd: Number(((tokensUsed / 1000) * blendedPer1k).toFixed(5)),
    savedUsd: Number(((tokensSaved / 1000) * blendedPer1k).toFixed(5)),
  };
}

async function callOpenAICompatible(params: {
  provider: "groq" | "openrouter";
  endpoint: string;
  apiKey: string;
  model: string;
  systemInstruction: string;
  messages: Array<{ role: "user" | "model"; text: string }>;
  language: SupportedLanguage;
  maxOutputTokens: number;
}): Promise<MultiProviderTurnResult> {
  const formattedMessages = [
    { role: "system", content: params.systemInstruction },
    ...params.messages.map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.text,
    })),
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${params.apiKey}`,
  };
  if (params.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://promptbench.local";
    headers["X-Title"] = "PromptBench Assessment Platform";
  }

  const res = await fetch(params.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: params.model,
      messages: formattedMessages,
      temperature: 0.2,
      max_tokens: params.maxOutputTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `${params.provider} API failed (HTTP ${res.status}): ${errText.slice(0, 200)}`
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = json.choices?.[0]?.message?.content ?? "";
  const promptTokens =
    json.usage?.prompt_tokens ??
    estimateTokensRough(
      params.systemInstruction + params.messages.map((m) => m.text).join("\n")
    );
  const completionTokens =
    json.usage?.completion_tokens ?? estimateTokensRough(text);

  return {
    provider: params.provider,
    model: params.model,
    text,
    extractedCode: extractCodeFromMarkdown(text, params.language),
    promptTokens,
    completionTokens,
    cachedTokens: 0,
  };
}

/**
 * Multi-provider AI router with automatic failover across configured providers.
 */
export async function generateWithProvider(params: {
  requestedProvider?: AIProviderId;
  systemInstruction: string;
  messages: Array<{ role: "user" | "model"; text: string }>;
  language: SupportedLanguage;
  maxOutputTokens?: number;
}): Promise<MultiProviderTurnResult> {
  const requested = params.requestedProvider || "auto";
  const maxTokens = params.maxOutputTokens || 1400;

  const order: Array<Exclude<AIProviderId, "auto">> =
    requested === "auto"
      ? ["gemini", "groq", "openrouter"]
      : [requested, ...(["gemini", "groq", "openrouter"] as const).filter((p) => p !== requested)];

  let lastError: unknown = null;

  for (const provider of order) {
    try {
      if (provider === "gemini") {
        if (!getGeminiClient()) {
          if (requested === "gemini") {
            throw new Error("GEMINI_API_KEY is not configured in .env.local.");
          }
          continue;
        }
        const res = await generateCodingReply({
          systemInstruction: params.systemInstruction,
          messages: params.messages,
          language: params.language,
        });
        return { ...res, provider: "gemini" };
      }

      if (provider === "groq") {
        const key = process.env.GROQ_API_KEY?.trim();
        if (!key) {
          if (requested === "groq") {
            throw new Error(
              "GROQ_API_KEY is not configured in .env.local. Switch provider to Auto or Gemini, or add GROQ_API_KEY."
            );
          }
          continue;
        }
        return await callOpenAICompatible({
          provider: "groq",
          endpoint: "https://api.groq.com/openai/v1/chat/completions",
          apiKey: key,
          model: process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
          systemInstruction: params.systemInstruction,
          messages: params.messages,
          language: params.language,
          maxOutputTokens: maxTokens,
        });
      }

      if (provider === "openrouter") {
        const key = process.env.OPENROUTER_API_KEY?.trim();
        if (!key) {
          if (requested === "openrouter") {
            throw new Error(
              "OPENROUTER_API_KEY is not configured in .env.local. Switch provider to Auto or Gemini, or add OPENROUTER_API_KEY."
            );
          }
          continue;
        }
        return await callOpenAICompatible({
          provider: "openrouter",
          endpoint: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: key,
          model:
            process.env.OPENROUTER_MODEL?.trim() ||
            "qwen/qwen-2.5-coder-32b-instruct:free",
          systemInstruction: params.systemInstruction,
          messages: params.messages,
          language: params.language,
          maxOutputTokens: maxTokens,
        });
      }
    } catch (err) {
      lastError = err;
      if (requested !== "auto") {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "No configured AI provider succeeded. Check GEMINI_API_KEY in .env.local."
      );
}

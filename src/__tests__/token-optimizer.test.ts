import { describe, it, expect } from "vitest";
import {
  resolveAdaptiveContextMode,
  compressPromptDraft,
  analyzePromptEfficiency,
  buildOptimizedContext,
} from "@/lib/engines/token-optimizer";
import type { Challenge } from "@/types/assessment";

const sampleChallenge: Challenge = {
  id: "ch-1",
  slug: "sliding-window-rate-limiter",
  title: "Sliding Window API Rate Limiter",
  difficulty: "Medium",
  description:
    "Implement a Sliding Window API Rate Limiter. Return booleans for each request timestamp.",
  starter_code: { python: "def allow(): pass", javascript: "function allow() {}" },
  supported_languages: ["python", "javascript"],
  reference_solution: { python: "", javascript: "" },
  created_by: null,
  time_limit_minutes: 45,
  token_budget: 6000,
  rubric_config: {
    prompt_quality_max: 40,
    prompt_improvement_max: 10,
    test_cases_max: 30,
    debug_test_cases_max: 20,
  },
  bug_injection_spec: {
    python: {
      language: "python",
      title: "Boundary Bug",
      description: "Boundary mutation",
      hint: "Check boundary",
      mutations: [],
      fallback_bug_instruction: "Flip >= to >",
    },
    javascript: {
      language: "javascript",
      title: "Boundary Bug",
      description: "Boundary mutation",
      hint: "Check boundary",
      mutations: [],
      fallback_bug_instruction: "Flip >= to >",
    },
  },
  is_active: true,
  created_at: new Date().toISOString(),
};

describe("Token Optimization Engine", () => {
  it("switches adaptive context window across Standard -> Compact -> Ultra-Lean tiers", () => {
    expect(resolveAdaptiveContextMode(1000, 6000).mode).toBe("standard");
    expect(resolveAdaptiveContextMode(3200, 6000).mode).toBe("compact");
    expect(resolveAdaptiveContextMode(5000, 6000).mode).toBe("ultra_lean");
  });

  it("compresses conversational filler and duplicated editor code", () => {
    const editorCode = `def rate_limit(limit, window, requests):\n    accepted = []\n    return accepted\n`;
    const draft =
      "Hey there! Could you please kindly help me with this?\n```python\n" +
      editorCode +
      "```\nPlease update the sliding window check to use strict inequality.";

    const res = compressPromptDraft({
      draft,
      currentCode: editorCode,
      challengeDescription: sampleChallenge.description,
    });

    expect(res.compressed.length).toBeLessThan(res.original.length);
    expect(res.tokensSaved).toBeGreaterThan(0);
    expect(res.techniquesApplied.length).toBeGreaterThan(0);
  });

  it("flags vague prompts and high token budget consumption with live hints", () => {
    const hints = analyzePromptEfficiency({
      userPrompt: "fix it",
      currentCode: "def solve(): return []",
      challengeDescription: sampleChallenge.description,
      tokensUsed: 5500,
      tokenBudget: 6000,
      previousTurns: [],
    });

    expect(hints.some((h) => h.severity === "critical" || h.severity === "warning")).toBe(
      true
    );
  });

  it("intentionally omits full problem description from AI system instruction (prompt-faithfulness)", () => {
    const ctx = buildOptimizedContext({
      challenge: sampleChallenge,
      language: "python",
      phase: "coding",
      currentCode: "def allow(): pass",
      userPrompt: "solve this",
      previousTurns: [],
      tokensUsed: 0,
      tokenBudget: 6000,
    });

    expect(ctx.systemInstruction).not.toContain(
      "Return booleans for each request timestamp."
    );
    expect(ctx.contextMode).toBe("standard");
  });
});

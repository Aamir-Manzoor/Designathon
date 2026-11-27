import type {
  Challenge,
  EfficiencyHint,
  PromptTurn,
  SessionPhase,
  SupportedLanguage,
} from "@/types/assessment";
import { estimateTokensRough } from "@/lib/utils";

export type ContextWindowMode = "standard" | "compact" | "ultra_lean";

export interface OptimizedContextPayload {
  systemInstruction: string;
  messages: Array<{ role: "user" | "model"; text: string }>;
  updatedRollingSummary: string;
  naiveTokensEstimate: number;
  optimizedInputTokensEstimate: number;
  estimatedSavings: number;
  contextStrategy: string;
  contextMode: ContextWindowMode;
  recommendedMaxOutputTokens: number;
  efficiencyHints: EfficiencyHint[];
}

export interface PromptCompressionResult {
  original: string;
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  tokensSaved: number;
  techniquesApplied: string[];
}

/**
 * Determines adaptive context-window compression tier based on budget usage %.
 */
export function resolveAdaptiveContextMode(
  tokensUsed: number,
  tokenBudget: number
): {
  mode: ContextWindowMode;
  verbatimTurns: number;
  maxReplySnippet: number;
  maxOutputTokens: number;
  stripCodeComments: boolean;
} {
  const ratio = tokenBudget > 0 ? tokensUsed / tokenBudget : 0;
  if (ratio >= 0.8) {
    return {
      mode: "ultra_lean",
      verbatimTurns: 0,
      maxReplySnippet: 220,
      maxOutputTokens: 750,
      stripCodeComments: true,
    };
  }
  if (ratio >= 0.5) {
    return {
      mode: "compact",
      verbatimTurns: 1,
      maxReplySnippet: 400,
      maxOutputTokens: 1100,
      stripCodeComments: false,
    };
  }
  return {
    mode: "standard",
    verbatimTurns: 2,
    maxReplySnippet: 600,
    maxOutputTokens: 1600,
    stripCodeComments: false,
  };
}

/**
 * Deterministic prompt compressor that removes duplicated editor code,
 * redundant problem-spec lines, and conversational filler.
 */
export function compressPromptDraft(params: {
  draft: string;
  currentCode: string;
  challengeDescription: string;
}): PromptCompressionResult {
  const { draft, currentCode, challengeDescription } = params;
  const original = draft.trim();
  let compressed = original;
  const techniques: string[] = [];

  // 1. Strip fenced code blocks that duplicate current editor code
  const editorLines = new Set(
    currentCode
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10)
  );
  compressed = compressed.replace(/```[\s\S]*?```/g, (block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10);
    const overlap = lines.filter((l) => editorLines.has(l)).length;
    if (lines.length >= 3 && overlap / lines.length >= 0.5) {
      techniques.push("Removed duplicated editor code block");
      return "[refer to current editor code]";
    }
    return block;
  });

  // 2. Strip lines copied verbatim from challenge description
  const specLines = new Set(
    challengeDescription
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 25)
  );
  const filteredLines = compressed.split("\n").filter((line) => {
    if (specLines.has(line.trim())) {
      if (!techniques.includes("Removed redundant problem spec lines")) {
        techniques.push("Removed redundant problem spec lines");
      }
      return false;
    }
    return true;
  });
  compressed = filteredLines.join("\n");

  // 3. Tighten polite filler & redundant whitespace
  const beforeFiller = compressed;
  compressed = compressed
    .replace(
      /\b(please|kindly|could you please|can you please|i would like you to|i need you to|hello|hi there|hey)\b/gi,
      ""
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (compressed.length < beforeFiller.length - 8) {
    techniques.push("Trimmed conversational filler");
  }

  // 4. Add concise output directive if not already present
  if (compressed.length > 20 && !/concise|brief|only/i.test(compressed)) {
    compressed = `${compressed} (Be concise; return minimal working code.)`;
    techniques.push("Added concise output constraint");
  }

  const originalTokens = estimateTokensRough(original);
  const compressedTokens = estimateTokensRough(compressed);
  const tokensSaved = Math.max(0, originalTokens - compressedTokens);

  return {
    original,
    compressed,
    originalTokens,
    compressedTokens,
    tokensSaved,
    techniquesApplied:
      techniques.length > 0 ? techniques : ["Tightened phrasing"],
  };
}

/**
 * Analyzes a candidate's draft prompt BEFORE or DURING send to produce
 * actionable prompt-efficiency guidance and savings estimates.
 */
export function analyzePromptEfficiency(params: {
  userPrompt: string;
  currentCode: string;
  challengeDescription: string;
  tokensUsed: number;
  tokenBudget: number;
  previousTurns: PromptTurn[];
}): EfficiencyHint[] {
  const {
    userPrompt,
    currentCode,
    challengeDescription,
    tokensUsed,
    tokenBudget,
    previousTurns,
  } = params;

  const hints: EfficiencyHint[] = [];
  const trimmed = userPrompt.trim();
  const promptTokens = estimateTokensRough(trimmed);

  // 1. Detect redundant full-code paste
  const codeLines = currentCode
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 10);
  if (codeLines.length >= 4) {
    const matchedLines = codeLines.filter((line) => trimmed.includes(line));
    if (
      matchedLines.length >= Math.min(4, Math.floor(codeLines.length * 0.5))
    ) {
      const estSaved = estimateTokensRough(matchedLines.join("\n"));
      hints.push({
        severity: "warning",
        code: "DUPLICATE_CODE_PASTE",
        message: `You pasted ~${matchedLines.length} lines already synced from your editor. Use "Compress Prompt" to save ~${estSaved} tokens.`,
        estimated_savings: estSaved,
      });
    }
  }

  // 2. Detect pasted problem statement
  const descSnippets = challengeDescription
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 25);
  const repeatedDesc = descSnippets.filter((s) => trimmed.includes(s));
  if (repeatedDesc.length >= 2) {
    const estSaved = estimateTokensRough(repeatedDesc.join("\n"));
    hints.push({
      severity: "warning",
      code: "REDUNDANT_SPEC",
      message: `The problem spec is already pinned in reusable system instructions. Compress to save ~${estSaved} tokens.`,
      estimated_savings: estSaved,
    });
  }

  // 3. Detect overly vague short prompts
  if (trimmed.length > 0 && trimmed.length < 32) {
    hints.push({
      severity: "info",
      code: "VAGUE_PROMPT",
      message:
        "Very short prompt — specifying algorithm, edge cases, or failing test inputs in one structured prompt avoids extra follow-up turns.",
    });
  }

  // 4. Detect overly verbose single prompt
  if (promptTokens > 250) {
    hints.push({
      severity: "warning",
      code: "VERBOSE_PROMPT",
      message: `Large prompt (~${promptTokens} tokens). Use "Compress Prompt" or ask for a targeted diff instead of a full rewrite.`,
      estimated_savings: Math.round(promptTokens * 0.35),
    });
  }

  // 5. Detect repetitive prompt similar to previous turn
  const lastTurn = previousTurns[previousTurns.length - 1];
  if (lastTurn) {
    const prevWords = new Set(
      lastTurn.user_prompt
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
    );
    const currWords = trimmed
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);
    if (currWords.length >= 5) {
      const overlap = currWords.filter((w) => prevWords.has(w)).length;
      if (overlap / currWords.length > 0.72) {
        hints.push({
          severity: "warning",
          code: "REPEATED_PROMPT",
          message:
            "This prompt closely repeats your previous turn. Attach the exact failing test case or expected vs. actual output instead.",
        });
      }
    }
  }

  // 6. Budget consumption warnings
  const projectedPct =
    tokenBudget > 0
      ? ((tokensUsed + promptTokens + 300) / tokenBudget) * 100
      : 0;
  if (projectedPct >= 90) {
    hints.push({
      severity: "critical",
      code: "CRITICAL_BUDGET",
      message:
        "Critical: Over 90% of your token budget will be used. Adaptive Ultra-Lean context mode is active.",
    });
  } else if (projectedPct >= 75) {
    hints.push({
      severity: "warning",
      code: "HIGH_BUDGET_BURN",
      message:
        "High consumption warning (>75% of token budget). Request targeted diffs rather than full-file rewrites.",
    });
  }

  return hints;
}

function buildRollingSummary(olderTurns: PromptTurn[]): string {
  if (olderTurns.length === 0) return "";
  const lines = olderTurns.map((t) => {
    const shortPrompt = t.user_prompt.replace(/\s+/g, " ").slice(0, 95);
    const outcome = t.extracted_code
      ? "generated code"
      : t.ai_response.replace(/\s+/g, " ").slice(0, 75);
    return `T${t.turn_number}(${t.phase}): "${shortPrompt}" -> ${outcome}`;
  });
  return `Earlier turns summary:\n${lines.join("\n")}`;
}

function compactCodeForUltraLean(code: string, language: SupportedLanguage): string {
  const lines = code.split("\n").filter((l) => {
    const t = l.trim();
    if (!t) return false;
    if (language === "python" && t.startsWith("#")) return false;
    if (language === "javascript" && t.startsWith("//")) return false;
    return true;
  });
  return lines.join("\n");
}

/**
 * Adaptive Context-Window Manager:
 * Dynamically shifts between Standard -> Compact -> Ultra-Lean tiers as
 * the candidate's remaining token budget tightens.
 */
export function buildOptimizedContext(params: {
  challenge: Challenge;
  language: SupportedLanguage;
  phase: SessionPhase;
  currentCode: string;
  latestTestFeedback?: string;
  previousTurns: PromptTurn[];
  userPrompt: string;
  tokensUsed: number;
  tokenBudget: number;
}): OptimizedContextPayload {
  const {
    challenge,
    language,
    phase,
    currentCode,
    latestTestFeedback,
    previousTurns,
    userPrompt,
    tokensUsed,
    tokenBudget,
  } = params;

  const adaptive = resolveAdaptiveContextMode(tokensUsed, tokenBudget);

  // 1. Reusable system instruction (prompt-faithful & guided debugging — never leaks hidden rules)
  const systemInstruction =
    phase === "debugging"
      ? [
          `You are a guided AI debugging assistant inside PromptBench for a timed ${language} assessment.`,
          `Challenge Title: ${challenge.title} (do NOT reveal or guess unstated challenge rules).`,
          `Context Mode: ${adaptive.mode}. Be concise to preserve the candidate's token budget.`,
          `STRICT GUIDED-DEBUGGING RULES:`,
          `- An intentional bug was injected into the candidate's code. Your job is to evaluate and assist their debugging, NOT solve it blindly for them.`,
          `- If the candidate's prompt is vague or lazy (e.g., "solve this bug", "fix it", "debug this", "fix everything") WITHOUT stating the failing test case, expected vs. actual behavior, or a suspected root cause/line: DO NOT return fixed code. Instead, respond in 2-3 short bullets asking them to identify the failing input/output or the specific condition they suspect is wrong.`,
          `- Only when the candidate provides a clear diagnosis, failing case analysis, or targeted instruction, return the corrected complete runnable ${language} code inside a single \`\`\`${language} block with a 1-2 bullet explanation.`,
        ].join("\n")
      : [
          `You are a prompt-faithful AI code generator inside PromptBench for a timed ${language} assessment.`,
          `Challenge Title: ${challenge.title}.`,
          `Context Mode: ${adaptive.mode}. Be concise to preserve the candidate's token budget.`,
          `STRICT PROMPT-FAITHFUL RULES:`,
          `- Implement ONLY the logic, data structures, constraints, and edge cases explicitly specified by the candidate in their prompt.`,
          `- Do NOT automatically infer hidden requirements, edge cases, or exact boundary semantics that the candidate forgot to mention.`,
          `- If the candidate writes a vague one-liner (e.g., "solve this", "write the code"), do NOT give a complete optimized solution — either ask 1-2 brief clarifying questions about their desired algorithm/constraints, or produce only a basic literal draft matching what little they specified so they must test and refine their prompt.`,
          `- When the candidate gives clear technical instructions, return runnable ${language} code (reading JSON from stdin and printing JSON to stdout) inside a single \`\`\`${language} code block, plus 2-3 brief bullets.`,
        ].join("\n");

  // 2. Adaptive history windowing + rolling summary
  const splitIdx = Math.max(0, previousTurns.length - adaptive.verbatimTurns);
  const olderTurns = previousTurns.slice(0, splitIdx);
  const recentTurns = previousTurns.slice(splitIdx);
  const updatedRollingSummary = buildRollingSummary(olderTurns);

  const messages: Array<{ role: "user" | "model"; text: string }> = [];

  if (updatedRollingSummary) {
    messages.push({
      role: "user",
      text: `[Compressed History (${adaptive.mode})]\n${updatedRollingSummary}`,
    });
    messages.push({
      role: "model",
      text: "Understood.",
    });
  }

  for (const turn of recentTurns) {
    messages.push({ role: "user", text: turn.user_prompt });
    const compactReply = turn.ai_response.replace(
      /```[\s\S]*?```/g,
      "[code omitted — see latest editor code]"
    );
    messages.push({
      role: "model",
      text: compactReply.slice(0, adaptive.maxReplySnippet),
    });
  }

  // 3. Attach current editor code once (stripped in ultra-lean mode)
  const attachedCode = adaptive.stripCodeComments
    ? compactCodeForUltraLean(currentCode, language)
    : currentCode.trim();

  const stateContextParts = [
    `[Current Editor Code (${language})]\n\`\`\`${language}\n${attachedCode}\n\`\`\``,
  ];
  if (latestTestFeedback) {
    stateContextParts.push(
      `[Latest Test Feedback]\n${latestTestFeedback.slice(0, 600)}`
    );
  }
  stateContextParts.push(`[Candidate Prompt]\n${userPrompt.trim()}`);

  messages.push({
    role: "user",
    text: stateContextParts.join("\n\n"),
  });

  // Naive baseline calculation
  const naiveHistoryTokens = previousTurns.reduce(
    (sum, t) =>
      sum +
      estimateTokensRough(t.user_prompt) +
      estimateTokensRough(t.ai_response) +
      estimateTokensRough(currentCode),
    0
  );
  const naiveTokensEstimate =
    estimateTokensRough(challenge.description) +
    120 +
    naiveHistoryTokens +
    estimateTokensRough(currentCode) +
    estimateTokensRough(userPrompt) +
    (latestTestFeedback ? estimateTokensRough(latestTestFeedback) : 0);

  const optimizedInputTokensEstimate =
    estimateTokensRough(systemInstruction) +
    messages.reduce((sum, m) => sum + estimateTokensRough(m.text), 0);

  const estimatedSavings = Math.max(
    0,
    naiveTokensEstimate - optimizedInputTokensEstimate
  );

  const efficiencyHints = analyzePromptEfficiency({
    userPrompt,
    currentCode,
    challengeDescription: challenge.description,
    tokensUsed,
    tokenBudget,
    previousTurns,
  });

  return {
    systemInstruction,
    messages,
    updatedRollingSummary,
    naiveTokensEstimate,
    optimizedInputTokensEstimate,
    estimatedSavings,
    contextStrategy: `adaptive_${adaptive.mode}+reusable_system+code_dedup`,
    contextMode: adaptive.mode,
    recommendedMaxOutputTokens: adaptive.maxOutputTokens,
    efficiencyHints,
  };
}

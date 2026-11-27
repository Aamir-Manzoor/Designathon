import type {
  Challenge,
  EfficiencyHint,
  PromptTurn,
  SessionPhase,
  SupportedLanguage,
} from "@/types/assessment";
import { estimateTokensRough } from "@/lib/utils";

export interface OptimizedContextPayload {
  systemInstruction: string;
  messages: Array<{ role: "user" | "model"; text: string }>;
  updatedRollingSummary: string;
  naiveTokensEstimate: number;
  optimizedInputTokensEstimate: number;
  estimatedSavings: number;
  contextStrategy: string;
  efficiencyHints: EfficiencyHint[];
}

const MAX_VERBATIM_TURNS = 2;

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
    if (matchedLines.length >= Math.min(4, Math.floor(codeLines.length * 0.5))) {
      const estSaved = estimateTokensRough(matchedLines.join("\n"));
      hints.push({
        severity: "warning",
        code: "DUPLICATE_CODE_PASTE",
        message: `You pasted ~${matchedLines.length} lines already synced from your editor. Reference the function or line number instead to save ~${estSaved} tokens.`,
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
      message: `The problem spec is already pinned in reusable system instructions. Omit copied spec text to save ~${estSaved} tokens.`,
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
  if (promptTokens > 350) {
    hints.push({
      severity: "warning",
      code: "VERBOSE_PROMPT",
      message: `Large prompt (~${promptTokens} tokens). Tighten to bullet constraints or ask for a targeted diff instead of a full rewrite.`,
      estimated_savings: Math.round(promptTokens * 0.35),
    });
  }

  // 5. Detect repetitive prompt similar to previous turn
  const lastTurn = previousTurns[previousTurns.length - 1];
  if (lastTurn) {
    const prevWords = new Set(
      lastTurn.user_prompt.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
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
    tokenBudget > 0 ? ((tokensUsed + promptTokens + 300) / tokenBudget) * 100 : 0;
  if (projectedPct >= 90) {
    hints.push({
      severity: "critical",
      code: "CRITICAL_BUDGET",
      message:
        "Critical: Over 90% of your token budget will be used. Ask only for minimal 1–3 line patches.",
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

/**
 * Builds a deterministic, compact rolling summary of older conversation turns
 * so we never re-send full historical transcripts on every request.
 */
function buildRollingSummary(olderTurns: PromptTurn[]): string {
  if (olderTurns.length === 0) return "";
  const lines = olderTurns.map((t) => {
    const shortPrompt = t.user_prompt.replace(/\s+/g, " ").slice(0, 110);
    const outcome = t.extracted_code
      ? "generated code patch"
      : t.ai_response.replace(/\s+/g, " ").slice(0, 90);
    return `T${t.turn_number} (${t.phase}): "${shortPrompt}" -> ${outcome}`;
  });
  return `Earlier turns summary:\n${lines.join("\n")}`;
}

/**
 * Context-reduction engine:
 * 1) Reusable pinned system instruction (problem spec + output format)
 * 2) Rolling summary for turns older than the last 2 turns
 * 3) Single compact attachment of latest editor code + latest test error (deduplicated)
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

  // 1. Reusable system instruction (cached across turns)
  const systemInstruction = [
    `You are an AI coding assistant inside PromptBench for a timed ${language} assessment.`,
    `Challenge: ${challenge.title}`,
    `Specification:\n${challenge.description}`,
    `Rules:`,
    `- Be concise to preserve the candidate's token budget.`,
    `- Always return complete, runnable ${language} code inside a single \`\`\`${language} code block when proposing code changes.`,
    `- Keep explanations brief (2-4 bullet points max).`,
    phase === "debugging"
      ? `- Current phase is DEBUGGING (an intentional bug was injected after initial tests passed). Focus strictly on diagnosing and fixing the failing test without unnecessary rewrites.`
      : `- Current phase is CODING. Read JSON from stdin and write JSON to stdout as specified.`,
  ].join("\n");

  // 2. Partition history into older (summarized) + recent (verbatim)
  const splitIdx = Math.max(0, previousTurns.length - MAX_VERBATIM_TURNS);
  const olderTurns = previousTurns.slice(0, splitIdx);
  const recentTurns = previousTurns.slice(splitIdx);
  const updatedRollingSummary = buildRollingSummary(olderTurns);

  const messages: Array<{ role: "user" | "model"; text: string }> = [];

  if (updatedRollingSummary) {
    messages.push({
      role: "user",
      text: `[Compressed History Context]\n${updatedRollingSummary}`,
    });
    messages.push({
      role: "model",
      text: "Understood. I will build on this context concisely.",
    });
  }

  for (const turn of recentTurns) {
    messages.push({ role: "user", text: turn.user_prompt });
    // Strip massive code blocks from older AI replies since latest editor code is attached once below
    const compactReply = turn.ai_response.replace(
      /```[\s\S]*?```/g,
      "[code block omitted — see latest editor code]"
    );
    messages.push({ role: "model", text: compactReply.slice(0, 600) });
  }

  // 3. Attach current editor code once + latest test failure summary if present
  const stateContextParts = [
    `[Current Editor Code (${language})]\n\`\`\`${language}\n${currentCode.trim()}\n\`\`\``,
  ];
  if (latestTestFeedback) {
    stateContextParts.push(
      `[Latest Test Execution Feedback]\n${latestTestFeedback.slice(0, 700)}`
    );
  }
  stateContextParts.push(`[Candidate Prompt]\n${userPrompt.trim()}`);

  messages.push({
    role: "user",
    text: stateContextParts.join("\n\n"),
  });

  // Compute naive baseline (what a non-optimized chat would send: full spec + full verbatim history + full code on every turn)
  const naiveHistoryTokens = previousTurns.reduce(
    (sum, t) =>
      sum +
      estimateTokensRough(t.user_prompt) +
      estimateTokensRough(t.ai_response) +
      estimateTokensRough(currentCode),
    0
  );
  const naiveTokensEstimate =
    estimateTokensRough(systemInstruction) +
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
    contextStrategy:
      olderTurns.length > 0
        ? "reusable_system+rolling_summary+code_dedup"
        : "reusable_system+code_dedup",
    efficiencyHints,
  };
}

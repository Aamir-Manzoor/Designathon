import type {
  CandidateSession,
  Challenge,
  PromptTurn,
  RubricConfig,
  ScorecardBreakdown,
  SingleTestResult,
} from "@/types/assessment";
import { generateTextWithFallback, getGeminiClient } from "./gemini";

export interface EvaluationResult {
  prompt_quality_score: number;
  prompt_improvement_score: number;
  test_cases_score: number;
  debug_test_cases_score: number;
  total_score: number;
  rubric_breakdown: ScorecardBreakdown;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeHeuristicPromptScores(params: {
  session: CandidateSession;
  turns: PromptTurn[];
  rubric: RubricConfig;
}): {
  promptQuality: ScorecardBreakdown["prompt_quality"];
  promptImprovement: ScorecardBreakdown["prompt_improvement"];
} {
  const { session, turns, rubric } = params;
  const maxPQ = rubric.prompt_quality_max || 40;
  const maxPI = rubric.prompt_improvement_max || 10;
  const perCriterion = maxPQ / 4;

  const budgetRatio =
    session.token_budget > 0 ? session.tokens_used / session.token_budget : 0;

  if (turns.length === 0) {
    return {
      promptQuality: {
        total: round2(maxPQ * 0.5),
        max: maxPQ,
        summary:
          "Candidate solved without AI prompts; baseline efficiency awarded with neutral prompt-engineering score.",
        criteria: [
          {
            criterion: "Clarity & Specificity",
            score: round2(perCriterion * 0.5),
            max_score: perCriterion,
            explanation: "No AI prompts submitted during session.",
            cited_turns: [],
          },
          {
            criterion: "Edge-Case & Constraint Awareness",
            score: round2(perCriterion * 0.5),
            max_score: perCriterion,
            explanation: "No AI prompts submitted during session.",
            cited_turns: [],
          },
          {
            criterion: "Context & Token Efficiency",
            score: perCriterion,
            max_score: perCriterion,
            explanation: "Zero tokens consumed.",
            cited_turns: [],
          },
          {
            criterion: "Decomposition & Verification Discipline",
            score: 0,
            max_score: perCriterion,
            explanation: "AI-assisted workflow was not utilized.",
            cited_turns: [],
          },
        ],
      },
      promptImprovement: {
        total: 0,
        max: maxPI,
        summary: "No iterative prompting turns recorded.",
        cited_turns: [],
      },
    };
  }

  const avgPromptLen =
    turns.reduce((s, t) => s + t.user_prompt.length, 0) / turns.length;
  const warningCount = turns.reduce(
    (s, t) =>
      s +
      (t.efficiency_hints || []).filter(
        (h) => h.severity === "warning" || h.severity === "critical"
      ).length,
    0
  );
  const mentionsEdgeCases = turns.some((t) =>
    /edge|empty|zero|boundary|limit|o\(n\)|complex|constraint|stdin|json/i.test(
      t.user_prompt
    )
  );
  const hasDebugTurn = turns.some((t) => t.phase === "debugging");

  const clarity = Math.min(
    perCriterion,
    Math.max(
      3,
      (avgPromptLen >= 60 && avgPromptLen <= 450 ? 8.5 : 6.2) -
        warningCount * 0.5
    )
  );
  const edgeCases = Math.min(
    perCriterion,
    mentionsEdgeCases ? 8.5 : 5.5
  );
  const efficiency = Math.min(
    perCriterion,
    Math.max(
      2.5,
      budgetRatio <= 0.4
        ? 9.5
        : budgetRatio <= 0.7
        ? 7.8
        : budgetRatio <= 0.9
        ? 5.5
        : 3.5
    )
  );
  const decomposition = Math.min(
    perCriterion,
    Math.max(4, (hasDebugTurn ? 8.0 : 6.5) - warningCount * 0.4)
  );

  const pqTotal = round2(clarity + edgeCases + efficiency + decomposition);
  const piTotal = round2(
    Math.min(
      maxPI,
      Math.max(
        3,
        turns.length >= 2
          ? hasDebugTurn
            ? 8.5 - warningCount * 0.5
            : 7.0 - warningCount * 0.4
          : 6.5
      )
    )
  );

  const turnNums = turns.map((t) => t.turn_number);

  return {
    promptQuality: {
      total: pqTotal,
      max: maxPQ,
      summary: `Evaluated across ${turns.length} turn(s) using structured prompt-efficiency telemetry (${Math.round(
        budgetRatio * 100
      )}% of token budget used).`,
      criteria: [
        {
          criterion: "Clarity & Specificity",
          score: round2(clarity),
          max_score: perCriterion,
          explanation:
            avgPromptLen >= 60
              ? "Prompts provided concrete technical instructions and clear targets."
              : "Prompts were brief and could include sharper constraints.",
          cited_turns: [turnNums[0]],
        },
        {
          criterion: "Edge-Case & Constraint Awareness",
          score: round2(edgeCases),
          max_score: perCriterion,
          explanation: mentionsEdgeCases
            ? "Explicitly referenced algorithmic constraints or boundary edge cases."
            : "Few explicit edge-case constraints were stated upfront.",
          cited_turns: turnNums.slice(0, 2),
        },
        {
          criterion: "Context & Token Efficiency",
          score: round2(efficiency),
          max_score: perCriterion,
          explanation: `Consumed ${session.tokens_used}/${session.token_budget} tokens (${Math.round(
            budgetRatio * 100
          )}%) with ${warningCount} efficiency warning(s).`,
          cited_turns: turnNums,
        },
        {
          criterion: "Decomposition & Verification Discipline",
          score: round2(decomposition),
          max_score: perCriterion,
          explanation: hasDebugTurn
            ? "Engaged in structured debugging after bug injection."
            : "Completed coding phase without iterative debug prompting.",
          cited_turns: turnNums.slice(-2),
        },
      ],
    },
    promptImprovement: {
      total: piTotal,
      max: maxPI,
      summary:
        turns.length >= 2
          ? `Demonstrated iterative refinement across ${turns.length} turns with ${warningCount} flagged efficiency issue(s).`
          : "Single-turn prompt workflow with minimal iteration needed.",
      cited_turns: turnNums.slice(-2),
    },
  };
}

export async function evaluateSession(params: {
  challenge: Challenge;
  session: CandidateSession;
  turns: PromptTurn[];
  phase1Results: SingleTestResult[];
  phase2Results: SingleTestResult[];
}): Promise<EvaluationResult> {
  const { challenge, session, turns, phase1Results, phase2Results } = params;
  const rubric: RubricConfig = challenge.rubric_config || {
    prompt_quality_max: 40,
    prompt_improvement_max: 10,
    test_cases_max: 30,
    debug_test_cases_max: 20,
  };

  // 1. Deterministic Test Cases score (30 pts) — public + hidden from Phase 1 (or final code if Phase 1 wasn't snapshotted)
  const p1Tests = phase1Results.filter(
    (r) => r.visibility === "public" || r.visibility === "hidden"
  );
  const p1Passed = p1Tests.filter((r) => r.passed).length;
  const p1Total = p1Tests.length || 1;
  const testCasesScore = round2(
    (p1Passed / p1Total) * (rubric.test_cases_max || 30)
  );

  // 2. Deterministic Debug Test Cases score (20 pts) — debug + regression tests on final submitted code
  const debugTests = phase2Results.filter((r) => r.visibility === "debug");
  const allFinalPassed = phase2Results.filter((r) => r.passed).length;
  const allFinalTotal = phase2Results.length || 1;
  const debugPassed = debugTests.filter((r) => r.passed).length;
  const debugTotal = debugTests.length || 1;

  // Weight 70% on explicit debug tests + 30% on no regressions across all tests
  const debugRatio =
    debugTests.length > 0
      ? 0.7 * (debugPassed / debugTotal) + 0.3 * (allFinalPassed / allFinalTotal)
      : allFinalPassed / allFinalTotal;
  const debugScore = round2(debugRatio * (rubric.debug_test_cases_max || 20));

  // 3. Prompt Quality (40) & Prompt Improvement (10) via Gemini Structured JSON (with deterministic fallback)
  let promptQuality: ScorecardBreakdown["prompt_quality"];
  let promptImprovement: ScorecardBreakdown["prompt_improvement"];

  const client = getGeminiClient();
  if (client && turns.length > 0) {
    try {
      const transcript = turns
        .map(
          (t) =>
            `Turn ${t.turn_number} [${t.phase}] (prompt_tokens=${t.prompt_tokens}, completion_tokens=${t.completion_tokens}, hints=${(t.efficiency_hints || [])
              .map((h) => h.code)
              .join(",")}):\nCandidate: ${t.user_prompt}`
        )
        .join("\n\n");

      const evalPrompt = [
        `You are an objective technical assessment rubric evaluator.`,
        `Challenge: ${challenge.title}`,
        `Token usage: ${session.tokens_used} / ${session.token_budget} tokens (${session.tokens_saved} saved by context optimization).`,
        `Score the candidate's prompting strictly as JSON matching this schema:`,
        `{`,
        `  "prompt_quality": {`,
        `    "total": number (0..40, sum of 4 criteria),`,
        `    "summary": string,`,
        `    "criteria": [`,
        `      {"criterion": "Clarity & Specificity", "score": number (0..10), "max_score": 10, "explanation": string, "cited_turns": number[]},`,
        `      {"criterion": "Edge-Case & Constraint Awareness", "score": number (0..10), "max_score": 10, "explanation": string, "cited_turns": number[]},`,
        `      {"criterion": "Context & Token Efficiency", "score": number (0..10), "max_score": 10, "explanation": string, "cited_turns": number[]},`,
        `      {"criterion": "Decomposition & Verification Discipline", "score": number (0..10), "max_score": 10, "explanation": string, "cited_turns": number[]}`,
        `    ]`,
        `  },`,
        `  "prompt_improvement": {`,
        `    "total": number (0..10),`,
        `    "summary": string,`,
        `    "cited_turns": number[]`,
        `  }`,
        `}`,
        `\nCandidate Prompt Transcript:\n${transcript}`,
      ].join("\n");

      const res = await generateTextWithFallback({
        prompt: evalPrompt,
        temperature: 0.1,
        responseMimeType: "application/json",
      });

      const parsed = JSON.parse(res.text ?? "{}");
      if (
        parsed?.prompt_quality?.criteria?.length === 4 &&
        typeof parsed?.prompt_improvement?.total === "number"
      ) {
        const clampedCriteria = parsed.prompt_quality.criteria.map(
          (c: {
            criterion: string;
            score: number;
            max_score?: number;
            explanation: string;
            cited_turns?: number[];
          }) => ({
            criterion: c.criterion,
            score: round2(Math.min(10, Math.max(0, Number(c.score) || 0))),
            max_score: 10,
            explanation: String(c.explanation || ""),
            cited_turns: Array.isArray(c.cited_turns) ? c.cited_turns : [],
          })
        );
        const pqSum = round2(
          clampedCriteria.reduce(
            (s: number, c: { score: number }) => s + c.score,
            0
          )
        );
        promptQuality = {
          total: Math.min(40, pqSum),
          max: 40,
          summary: String(parsed.prompt_quality.summary || ""),
          criteria: clampedCriteria,
        };
        promptImprovement = {
          total: round2(
            Math.min(10, Math.max(0, Number(parsed.prompt_improvement.total)))
          ),
          max: 10,
          summary: String(parsed.prompt_improvement.summary || ""),
          cited_turns: Array.isArray(parsed.prompt_improvement.cited_turns)
            ? parsed.prompt_improvement.cited_turns
            : [],
        };
      } else {
        throw new Error("Invalid rubric JSON structure from Gemini");
      }
    } catch (err) {
      console.warn("[Scorer] Falling back to heuristic prompt scoring:", err);
      const fallback = computeHeuristicPromptScores({ session, turns, rubric });
      promptQuality = fallback.promptQuality;
      promptImprovement = fallback.promptImprovement;
    }
  } else {
    const fallback = computeHeuristicPromptScores({ session, turns, rubric });
    promptQuality = fallback.promptQuality;
    promptImprovement = fallback.promptImprovement;
  }

  const totalScore = round2(
    promptQuality.total +
      promptImprovement.total +
      testCasesScore +
      debugScore
  );

  const pctBudget =
    session.token_budget > 0
      ? Math.round((session.tokens_used / session.token_budget) * 100)
      : 0;

  const verdict =
    totalScore >= 85
      ? "Strong Hire — high correctness, disciplined debugging, and token-conscious AI collaboration."
      : totalScore >= 70
      ? "Hire — solid functional delivery with room to optimize prompting efficiency."
      : totalScore >= 55
      ? "Borderline — partial correctness or elevated token burn; review prompt transcript."
      : "No Hire — low test coverage or ineffective AI guidance.";

  return {
    prompt_quality_score: promptQuality.total,
    prompt_improvement_score: promptImprovement.total,
    test_cases_score: testCasesScore,
    debug_test_cases_score: debugScore,
    total_score: totalScore,
    rubric_breakdown: {
      prompt_quality: promptQuality,
      prompt_improvement: promptImprovement,
      test_cases: {
        total: testCasesScore,
        max: rubric.test_cases_max || 30,
        passed: p1Passed,
        total_tests: p1Tests.length,
        summary: `Passed ${p1Passed}/${p1Tests.length} public and hidden test cases.`,
      },
      debug_test_cases: {
        total: debugScore,
        max: rubric.debug_test_cases_max || 20,
        passed: debugPassed,
        total_tests: debugTests.length,
        summary: `Passed ${debugPassed}/${debugTests.length} debug regression tests (${allFinalPassed}/${allFinalTotal} total tests passing on final submission).`,
      },
      token_efficiency_summary: `${session.tokens_used} / ${session.token_budget} tokens used (${pctBudget}% of budget); ${session.tokens_saved} tokens saved via context optimization.`,
      overall_verdict: verdict,
    },
  };
}

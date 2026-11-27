import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { evaluateSession } from "@/lib/engines/scorer";
import type {
  CandidateSession,
  Challenge,
  PromptTurn,
  SingleTestResult,
} from "@/types/assessment";

const baseChallenge: Challenge = {
  id: "ch-1",
  slug: "interval-merger",
  title: "Deployment Maintenance Window Merger",
  difficulty: "Medium",
  description: "Merge overlapping intervals.",
  starter_code: { python: "", javascript: "" },
  supported_languages: ["python", "javascript"],
  reference_solution: { python: "", javascript: "" },
  created_by: null,
  time_limit_minutes: 40,
  token_budget: 5000,
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

const baseSession: CandidateSession = {
  id: "sess-1",
  challenge_id: "ch-1",
  user_id: "user-1",
  candidate_name: "Test Candidate",
  candidate_email: "test@example.com",
  is_synthetic: false,
  language: "python",
  phase: "debugging",
  current_code: "print([])",
  phase1_passed_code: "print([])",
  injected_bug_code: "print([1])",
  injected_bug_description: "Off-by-one bug",
  tokens_used: 1200,
  tokens_saved: 400,
  token_budget: 5000,
  rolling_summary: null,
  started_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  submitted_at: null,
  updated_at: new Date().toISOString(),
};

const passingTests: SingleTestResult[] = [
  {
    test_case_id: "t1",
    name: "Public 1",
    visibility: "public",
    passed: true,
    actual_output: "[]",
    expected_output: "[]",
    stderr: null,
    status: "Accepted",
    runtime_ms: 10,
  },
  {
    test_case_id: "t2",
    name: "Hidden 1",
    visibility: "hidden",
    passed: true,
    actual_output: "[]",
    expected_output: "[]",
    stderr: null,
    status: "Accepted",
    runtime_ms: 10,
  },
  {
    test_case_id: "t3",
    name: "Debug 1",
    visibility: "debug",
    passed: true,
    actual_output: "[]",
    expected_output: "[]",
    stderr: null,
    status: "Accepted",
    runtime_ms: 10,
  },
];

describe("Strict 100-Point Explainable Rubric Scorer", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    // Force deterministic heuristic mode so unit tests run offline with zero API calls
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  });

  it("strictly awards 0/20 debug score if candidate never entered Phase 2 debugging", async () => {
    const res = await evaluateSession({
      challenge: baseChallenge,
      session: { ...baseSession, phase: "coding", injected_bug_code: null },
      turns: [],
      phase1Results: passingTests,
      phase2Results: passingTests,
    });

    expect(res.debug_test_cases_score).toBe(0);
    expect(res.test_cases_score).toBe(30);
    expect(res.total_score).toBe(
      Math.round(
        (res.prompt_quality_score +
          res.prompt_improvement_score +
          res.test_cases_score +
          res.debug_test_cases_score) *
          100
      ) / 100
    );
  });

  it("heavily penalizes vague single-turn prompts compared to constraint-aware iterative prompts", async () => {
    const vagueTurns: PromptTurn[] = [
      {
        id: "pt-1",
        session_id: "sess-1",
        turn_number: 1,
        phase: "coding",
        user_prompt: "solve this",
        ai_response: "...",
        extracted_code: null,
        prompt_tokens: 100,
        completion_tokens: 200,
        cached_tokens: 0,
        naive_tokens_estimate: 300,
        tokens_saved: 0,
        context_strategy: "standard",
        efficiency_hints: [{ severity: "warning", code: "VAGUE", message: "Too vague" }],
        created_at: new Date().toISOString(),
      },
    ];

    const strongTurns: PromptTurn[] = [
      {
        id: "pt-1",
        session_id: "sess-1",
        turn_number: 1,
        phase: "coding",
        user_prompt:
          "Sort intervals by start time in O(n log n) and merge overlapping or touching boundaries including empty input edge cases reading stdin JSON.",
        ai_response: "...",
        extracted_code: null,
        prompt_tokens: 120,
        completion_tokens: 220,
        cached_tokens: 0,
        naive_tokens_estimate: 400,
        tokens_saved: 60,
        context_strategy: "standard",
        efficiency_hints: [],
        created_at: new Date().toISOString(),
      },
      {
        id: "pt-2",
        session_id: "sess-1",
        turn_number: 2,
        phase: "debugging",
        user_prompt:
          "The touching boundary test [1,3],[3,5] fails because strict < excludes equal endpoints. Update the boundary condition to <=.",
        ai_response: "...",
        extracted_code: null,
        prompt_tokens: 90,
        completion_tokens: 150,
        cached_tokens: 0,
        naive_tokens_estimate: 350,
        tokens_saved: 110,
        context_strategy: "standard",
        efficiency_hints: [],
        created_at: new Date().toISOString(),
      },
    ];

    const vagueScore = await evaluateSession({
      challenge: baseChallenge,
      session: baseSession,
      turns: vagueTurns,
      phase1Results: passingTests,
      phase2Results: passingTests,
    });

    const strongScore = await evaluateSession({
      challenge: baseChallenge,
      session: baseSession,
      turns: strongTurns,
      phase1Results: passingTests,
      phase2Results: passingTests,
    });

    expect(vagueScore.prompt_improvement_score).toBeLessThanOrEqual(2);
    expect(strongScore.prompt_quality_score).toBeGreaterThan(
      vagueScore.prompt_quality_score + 15
    );
    expect(strongScore.debug_test_cases_score).toBe(20);
    expect(strongScore.total_score).toBeGreaterThan(vagueScore.total_score);
  });
});

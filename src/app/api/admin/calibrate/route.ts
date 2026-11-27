import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { evaluateSession } from "@/lib/engines/scorer";
import type {
  CandidateSession,
  Challenge,
  PromptTurn,
  SingleTestResult,
} from "@/types/assessment";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const { data: challengeData } = await supabase
    .from("challenges")
    .select("*")
    .limit(1)
    .single();

  if (!challengeData) {
    return NextResponse.json(
      { error: "No challenges available for calibration" },
      { status: 404 }
    );
  }

  const challenge = challengeData as Challenge;

  const mkTest = (
    name: string,
    visibility: "public" | "hidden" | "debug",
    passed: boolean
  ): SingleTestResult => ({
    test_case_id: name,
    name,
    visibility,
    passed,
    actual_output: passed ? "ok" : "wrong",
    expected_output: "ok",
    stderr: null,
    status: passed ? "Accepted" : "Wrong Answer",
    runtime_ms: 12,
  });

  // 3 Gold-Standard Calibration Anchors
  const anchors = [
    {
      label: "Anchor A: Gold Optimal Engineer",
      expectedRange: [82, 100] as [number, number],
      tokensUsed: 1250,
      tokensSaved: 980,
      turns: [
        {
          id: "a1",
          session_id: "cal-a",
          turn_number: 1,
          phase: "coding",
          user_prompt:
            "Implement O(n) sliding window rate_limit(limit, window, requests) using deque. Evict where t - q[0] >= window, append only accepted, handle limit=0 and empty input.",
          ai_response: "Implemented clean deque solution.",
          extracted_code: "def rate_limit(): pass",
          prompt_tokens: 280,
          completion_tokens: 290,
          cached_tokens: 180,
          naive_tokens_estimate: 680,
          tokens_saved: 120,
          context_strategy: "adaptive_standard",
          efficiency_hints: [],
          created_at: new Date().toISOString(),
        },
        {
          id: "a2",
          session_id: "cal-a",
          turn_number: 2,
          phase: "debugging",
          user_prompt:
            "Exact Window Boundary Regression failed at t=10 with window=10. Inspect only the eviction operator in editor code and give the 1-line fix.",
          ai_response: "Change > window to >= window.",
          extracted_code: "def rate_limit(): pass",
          prompt_tokens: 340,
          completion_tokens: 340,
          cached_tokens: 180,
          naive_tokens_estimate: 1200,
          tokens_saved: 860,
          context_strategy: "adaptive_standard",
          efficiency_hints: [],
          created_at: new Date().toISOString(),
        },
      ] as PromptTurn[],
      p1: [
        mkTest("t1", "public", true),
        mkTest("t2", "public", true),
        mkTest("t3", "hidden", true),
      ],
      p2: [
        mkTest("t1", "public", true),
        mkTest("t2", "public", true),
        mkTest("d1", "debug", true),
      ],
    },
    {
      label: "Anchor B: Functional High-Burn Spammer",
      expectedRange: [58, 84] as [number, number],
      tokensUsed: 5400,
      tokensSaved: 1800,
      turns: [
        {
          id: "b1",
          session_id: "cal-b",
          turn_number: 1,
          phase: "coding",
          user_prompt: "write code",
          ai_response: "Drafted basic solution.",
          extracted_code: null,
          prompt_tokens: 900,
          completion_tokens: 900,
          cached_tokens: 0,
          naive_tokens_estimate: 1800,
          tokens_saved: 0,
          context_strategy: "adaptive_standard",
          efficiency_hints: [
            {
              severity: "warning",
              code: "VAGUE_PROMPT",
              message: "Too vague",
            },
          ],
          created_at: new Date().toISOString(),
        },
        {
          id: "b2",
          session_id: "cal-b",
          turn_number: 2,
          phase: "debugging",
          user_prompt: "broken fix everything rewrite full file",
          ai_response: "Rewrote entire file.",
          extracted_code: null,
          prompt_tokens: 1800,
          completion_tokens: 1800,
          cached_tokens: 0,
          naive_tokens_estimate: 3600,
          tokens_saved: 1800,
          context_strategy: "adaptive_ultra_lean",
          efficiency_hints: [
            {
              severity: "critical",
              code: "HIGH_BUDGET_BURN",
              message: "90% budget used",
            },
            {
              severity: "warning",
              code: "DUPLICATE_CODE_PASTE",
              message: "Pasted code",
            },
          ],
          created_at: new Date().toISOString(),
        },
      ] as PromptTurn[],
      p1: [
        mkTest("t1", "public", true),
        mkTest("t2", "public", true),
        mkTest("t3", "hidden", false),
      ],
      p2: [
        mkTest("t1", "public", true),
        mkTest("t2", "public", true),
        mkTest("d1", "debug", true),
      ],
    },
    {
      label: "Anchor C: Failing / Unresolved Bug",
      expectedRange: [15, 55] as [number, number],
      tokensUsed: 5800,
      tokensSaved: 400,
      turns: [
        {
          id: "c1",
          session_id: "cal-c",
          turn_number: 1,
          phase: "coding",
          user_prompt: "solve",
          ai_response: "Partial draft.",
          extracted_code: null,
          prompt_tokens: 2900,
          completion_tokens: 2900,
          cached_tokens: 0,
          naive_tokens_estimate: 6200,
          tokens_saved: 400,
          context_strategy: "adaptive_ultra_lean",
          efficiency_hints: [
            {
              severity: "critical",
              code: "CRITICAL_BUDGET",
              message: "96% budget used",
            },
          ],
          created_at: new Date().toISOString(),
        },
      ] as PromptTurn[],
      p1: [
        mkTest("t1", "public", true),
        mkTest("t2", "public", false),
        mkTest("t3", "hidden", false),
      ],
      p2: [
        mkTest("t1", "public", false),
        mkTest("t2", "public", false),
        mkTest("d1", "debug", false),
      ],
    },
  ];

  const results = [];
  for (const a of anchors) {
    const fakeSession: CandidateSession = {
      id: a.label,
      challenge_id: challenge.id,
      user_id: null,
      candidate_name: a.label,
      candidate_email: "calibration@promptbench.ai",
      is_synthetic: true,
      language: "python",
      phase: "submitted",
      current_code: "",
      phase1_passed_code: null,
      injected_bug_code: null,
      injected_bug_description: null,
      tokens_used: a.tokensUsed,
      tokens_saved: a.tokensSaved,
      token_budget: 6000,
      rolling_summary: null,
      started_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalRes = await evaluateSession({
      challenge,
      session: fakeSession,
      turns: a.turns,
      phase1Results: a.p1,
      phase2Results: a.p2,
    });

    const inRange =
      evalRes.total_score >= a.expectedRange[0] &&
      evalRes.total_score <= a.expectedRange[1];

    results.push({
      label: a.label,
      expected_range: a.expectedRange,
      total_score: evalRes.total_score,
      prompt_quality: evalRes.prompt_quality_score,
      prompt_improvement: evalRes.prompt_improvement_score,
      test_cases: evalRes.test_cases_score,
      debug_tests: evalRes.debug_test_cases_score,
      in_range: inRange,
    });
  }

  const monotonicOrderValid =
    results[0].total_score > results[1].total_score &&
    results[1].total_score > results[2].total_score;
  const allInRange = results.every((r) => r.in_range);

  return NextResponse.json({
    status: monotonicOrderValid && allInRange ? "CALIBRATED" : "DRIFT_WARNING",
    monotonic_order_valid: monotonicOrderValid,
    all_anchors_in_range: allInRange,
    checked_at: new Date().toISOString(),
    anchors: results,
  });
}

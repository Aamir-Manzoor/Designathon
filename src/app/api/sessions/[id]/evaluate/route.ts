import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { executeTestCases } from "@/lib/engines/executor";
import { evaluateSession } from "@/lib/engines/scorer";
import { dispatchEmailNotification } from "@/lib/engines/mailer";
import type {
  CandidateSession,
  Challenge,
  PromptTurn,
  TestCase,
} from "@/types/assessment";

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { code?: string };

  const { data: sessionData, error: sErr } = await supabase
    .from("candidate_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (sErr || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = sessionData as CandidateSession;

  // Idempotency guard: if already submitted with an existing scorecard, return immediately
  if (session.phase === "submitted") {
    const { data: existingSc } = await supabase
      .from("scorecards")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle();
    if (existingSc) {
      return NextResponse.json({
        scorecard: existingSc,
        score_released: Boolean(existingSc.score_released),
      });
    }
  }

  const finalCode =
    typeof body.code === "string" ? body.code : session.current_code;
  const phase1Code = session.phase1_passed_code || finalCode;

  // Mark session as submitted immediately first so the exam can never re-open even if downstream takes time
  const submittedAt = new Date().toISOString();
  await supabase
    .from("candidate_sessions")
    .update({
      phase: "submitted",
      current_code: finalCode,
      submitted_at: submittedAt,
      updated_at: submittedAt,
    })
    .eq("id", session.id);

  const [{ data: challengeData }, { data: turnsData }, { data: allTests }] =
    await Promise.all([
      supabase
        .from("challenges")
        .select("*")
        .eq("id", session.challenge_id)
        .single(),
      supabase
        .from("prompt_turns")
        .select("*")
        .eq("session_id", session.id)
        .order("turn_number", { ascending: true }),
      supabase.rpc("get_session_test_cases", { p_session_id: session.id }),
    ]);

  if (!challengeData) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const challenge = challengeData as Challenge;
  const turns = (turnsData ?? []) as PromptTurn[];
  const tests = (allTests ?? []) as TestCase[];

  const p1Suite = tests.filter(
    (t) => t.visibility === "public" || t.visibility === "hidden"
  );

  // Deduplicate execution when phase1Code === finalCode to halve latency and guarantee single-go completion
  const p2Exec = await executeTestCases(finalCode, session.language, tests).catch(
    () => ({
      engine: "judge0" as const,
      passedCount: 0,
      totalCount: tests.length,
      runtimeMs: 0,
      results: tests.map((tc) => ({
        test_case_id: tc.id,
        name: tc.name,
        visibility: tc.visibility,
        passed: false,
        actual_output: "",
        expected_output: tc.expected_output,
        stderr: "Execution unavailable during submission",
        status: "Runtime Error",
        runtime_ms: 0,
      })),
    })
  );

  // Practice Test Mode: evaluate code pass/fail immediately for candidate only (no Evaluator queue, no emails)
  if (session.is_practice) {
    const practicePassed =
      p2Exec.totalCount > 0 && p2Exec.passedCount === p2Exec.totalCount;
    const practiceNote = practicePassed
      ? `Practice Test Passed — all ${p2Exec.passedCount}/${p2Exec.totalCount} test cases passed.`
      : `Practice Test Submitted — ${p2Exec.passedCount}/${p2Exec.totalCount} test cases passed.`;

    const { data: practiceSc } = await supabase
      .from("scorecards")
      .upsert(
        {
          session_id: session.id,
          prompt_quality_score: 0,
          prompt_improvement_score: 0,
          test_cases_score: 0,
          debug_test_cases_score: 0,
          total_score: 0,
          rubric_breakdown: {
            prompt_quality: { total: 0, max: 40, summary: "Practice session", criteria: [] },
            prompt_improvement: { total: 0, max: 10, summary: "Practice session", cited_turns: [] },
            test_cases: {
              total: 0,
              max: 30,
              passed: p2Exec.passedCount,
              total_tests: p2Exec.totalCount,
              summary: practiceNote,
            },
            debug_test_cases: { total: 0, max: 20, passed: 0, total_tests: 0, summary: "" },
            token_efficiency_summary: "Practice session",
            overall_verdict: practiceNote,
          },
          evaluator_decision: practicePassed ? "passed" : "rejected",
          evaluator_notes: practiceNote,
          evaluator_reviewed_at: submittedAt,
          score_released: true,
          released_at: submittedAt,
        },
        { onConflict: "session_id" }
      )
      .select("*")
      .single();

    return NextResponse.json({
      scorecard: practiceSc ?? null,
      score_released: true,
      practice_passed: practicePassed,
      final_run: p2Exec,
    });
  }

  const p1Results =
    phase1Code.trim() === finalCode.trim()
      ? p2Exec.results.filter(
          (r) => r.visibility === "public" || r.visibility === "hidden"
        )
      : (
          await executeTestCases(phase1Code, session.language, p1Suite).catch(
            () => ({ results: [] })
          )
        ).results;

  const evaluation = await evaluateSession({
    challenge,
    session,
    turns,
    phase1Results: p1Results,
    phase2Results: p2Exec.results,
  });

  const [, , { data: scorecard, error: scErr }] = await Promise.all([
    supabase.from("execution_runs").insert({
      session_id: session.id,
      phase: "submitted",
      executor_engine: p2Exec.engine,
      passed_count: p2Exec.passedCount,
      total_count: p2Exec.totalCount,
      results: p2Exec.results,
      runtime_ms: p2Exec.runtimeMs,
    }),
    supabase.from("integrity_events").insert({
      session_id: session.id,
      event_type: "session_submitted",
      metadata: {
        total_score: evaluation.total_score,
        tokens_used: session.tokens_used,
        tokens_saved: session.tokens_saved,
      },
    }),
    supabase
      .from("scorecards")
      .upsert(
        {
          session_id: session.id,
          prompt_quality_score: evaluation.prompt_quality_score,
          prompt_improvement_score: evaluation.prompt_improvement_score,
          test_cases_score: evaluation.test_cases_score,
          debug_test_cases_score: evaluation.debug_test_cases_score,
          total_score: evaluation.total_score,
          rubric_breakdown: evaluation.rubric_breakdown,
          score_released: false,
        },
        { onConflict: "session_id" }
      )
      .select("*")
      .single(),
  ]);

  if (scErr) {
    console.warn("[Evaluate] Scorecard upsert warning:", scErr);
  }

  // Non-blocking email notification so SMTP latency never blocks exam submission
  await dispatchEmailNotification({
    supabase,
    recipientEmail: session.candidate_email,
    recipientName: session.candidate_name,
    emailType: "submission_received",
    subject: `Assessment Submitted — ${challenge.title}`,
    body: `Hi ${session.candidate_name},\n\nWe have received your submission for "${challenge.title}". Our evaluation team is reviewing your code, prompt quality, and debugging results.\n\nYou will receive another email notification once the Evaluator submits feedback and the Admin releases your official assessment outcome.`,
  }).catch(() => {});

  return NextResponse.json({
    scorecard: scorecard ?? null,
    score_released: false,
    final_run: p2Exec,
  });
}

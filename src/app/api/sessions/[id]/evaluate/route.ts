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
  const finalCode =
    typeof body.code === "string" ? body.code : session.current_code;
  const phase1Code = session.phase1_passed_code || finalCode;

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

  // Evaluate Phase 1 code against public + hidden tests, and final code against ALL tests (including debug)
  const p1Suite = tests.filter(
    (t) => t.visibility === "public" || t.visibility === "hidden"
  );
  const [p1Exec, p2Exec] = await Promise.all([
    executeTestCases(phase1Code, session.language, p1Suite),
    executeTestCases(finalCode, session.language, tests),
  ]);

  const evaluation = await evaluateSession({
    challenge,
    session,
    turns,
    phase1Results: p1Exec.results,
    phase2Results: p2Exec.results,
  });

  const submittedAt = new Date().toISOString();

  await Promise.all([
    supabase
      .from("candidate_sessions")
      .update({
        phase: "submitted",
        current_code: finalCode,
        submitted_at: submittedAt,
        updated_at: submittedAt,
      })
      .eq("id", session.id),
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
  ]);

  const { data: scorecard, error: scErr } = await supabase
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
    .single();

  if (scErr) {
    return NextResponse.json({ error: scErr.message }, { status: 500 });
  }

  await dispatchEmailNotification({
    supabase,
    recipientEmail: session.candidate_email,
    recipientName: session.candidate_name,
    emailType: "submission_received",
    subject: `Assessment Submitted — ${challenge.title}`,
    body: `Hi ${session.candidate_name},\n\nWe have received your submission for "${challenge.title}". Our evaluation team is reviewing your code, prompt quality, and debugging results.\n\nYou will receive another email notification as soon as the Admin releases your official score report.`,
  });

  return NextResponse.json({
    scorecard,
    score_released: false,
    final_run: p2Exec,
  });
}

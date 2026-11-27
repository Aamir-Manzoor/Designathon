import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { executionQueue } from "@/lib/engines/execution-queue";
import type { CandidateSession, TestCase } from "@/types/assessment";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    session_id?: string;
    code?: string;
  };

  if (!body.session_id || typeof body.code !== "string") {
    return NextResponse.json(
      { error: "session_id and code are required" },
      { status: 400 }
    );
  }

  const { data: sessionData, error: sErr } = await supabase
    .from("candidate_sessions")
    .select("*")
    .eq("id", body.session_id)
    .single();

  if (sErr || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = sessionData as CandidateSession;

  const { data: allTests, error: tcErr } = await supabase.rpc(
    "get_session_test_cases",
    { p_session_id: session.id }
  );

  if (tcErr) {
    return NextResponse.json({ error: tcErr.message }, { status: 500 });
  }

  const tests = (allTests ?? []) as TestCase[];
  const suiteToRun =
    session.phase === "debugging"
      ? tests.filter(
          (tc) => tc.visibility === "public" || tc.visibility === "debug"
        )
      : tests.filter((tc) => tc.visibility === "public");

  try {
    // Route execution through the bounded-concurrency FIFO queue with automatic retry recovery
    const execResult = await executionQueue.enqueue({
      code: body.code,
      language: session.language,
      testCases: suiteToRun,
    });

    const { data: runRecord } = await supabase
      .from("execution_runs")
      .insert({
        session_id: session.id,
        phase: session.phase,
        executor_engine: execResult.engine,
        passed_count: execResult.passedCount,
        total_count: execResult.totalCount,
        results: execResult.results,
        runtime_ms: execResult.runtimeMs,
      })
      .select("*")
      .single();

    await supabase
      .from("candidate_sessions")
      .update({
        current_code: body.code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    const allPassed =
      execResult.totalCount > 0 &&
      execResult.passedCount === execResult.totalCount;

    return NextResponse.json({
      run: runRecord,
      engine: execResult.engine,
      passed_count: execResult.passedCount,
      total_count: execResult.totalCount,
      runtime_ms: execResult.runtimeMs,
      results: execResult.results,
      queue_job_id: execResult.jobId,
      queue_wait_ms: execResult.queueWaitMs,
      attempts: execResult.attempts,
      queue_stats: executionQueue.getStats(),
      ready_for_bug_injection: session.phase === "coding" && allPassed,
      ready_for_submission: session.phase === "debugging" && allPassed,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Code execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

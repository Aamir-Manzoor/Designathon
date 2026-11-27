import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { injectControlledBug } from "@/lib/engines/bug-injector";
import { executeTestCases } from "@/lib/engines/executor";
import type {
  CandidateSession,
  Challenge,
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
  if (session.phase !== "coding") {
    return NextResponse.json(
      { error: "Bug has already been injected for this session." },
      { status: 400 }
    );
  }

  const workingCode =
    typeof body.code === "string" ? body.code : session.current_code;

  const [{ data: challengeData }, { data: allTests }] = await Promise.all([
    supabase
      .from("challenges")
      .select("*")
      .eq("id", session.challenge_id)
      .single(),
    supabase.rpc("get_session_test_cases", { p_session_id: session.id }),
  ]);

  if (!challengeData) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const challenge = challengeData as Challenge;
  const tests = (allTests ?? []) as TestCase[];
  const rule = challenge.bug_injection_spec?.[session.language];

  if (!rule) {
    return NextResponse.json(
      { error: `No bug injection spec found for ${session.language}` },
      { status: 400 }
    );
  }

  // Gate Phase 2 strictly behind passing 100% of Phase 1 public tests on the candidate's submitted code
  const publicTests = tests.filter((t) => t.visibility === "public");
  if (publicTests.length > 0) {
    const phase1Check = await executeTestCases(
      workingCode,
      session.language,
      publicTests
    );
    if (phase1Check.passedCount < phase1Check.totalCount) {
      return NextResponse.json(
        {
          error: `Complete Phase 1 first: only ${phase1Check.passedCount}/${phase1Check.totalCount} public test cases passed on your submitted code.`,
        },
        { status: 400 }
      );
    }
  }

  const injection = await injectControlledBug({
    workingCode,
    language: session.language,
    rule,
    testCases: tests,
  });

  // Immediately run public + debug tests on the newly injected buggy code so candidate sees the failure right away
  const debugSuite = tests.filter(
    (t) => t.visibility === "public" || t.visibility === "debug"
  );
  const failingRun = await executeTestCases(
    injection.mutatedCode,
    session.language,
    debugSuite
  );

  const { data: latestRev } = await supabase
    .from("code_revisions")
    .select("revision_number")
    .eq("session_id", session.id)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  await Promise.all([
    supabase
      .from("candidate_sessions")
      .update({
        phase: "debugging",
        phase1_passed_code: workingCode,
        injected_bug_code: injection.mutatedCode,
        injected_bug_description: `${injection.bugTitle}: ${injection.bugDescription}`,
        current_code: injection.mutatedCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id),
    supabase.from("code_revisions").insert({
      session_id: session.id,
      revision_number: (latestRev?.revision_number ?? 0) + 1,
      source: "bug_injection",
      code: injection.mutatedCode,
      note: `Controlled bug injected: ${injection.bugTitle}`,
    }),
    supabase.from("execution_runs").insert({
      session_id: session.id,
      phase: "debugging",
      executor_engine: failingRun.engine,
      passed_count: failingRun.passedCount,
      total_count: failingRun.totalCount,
      results: failingRun.results,
      runtime_ms: failingRun.runtimeMs,
    }),
    supabase.from("integrity_events").insert({
      session_id: session.id,
      event_type: "bug_injected",
      metadata: {
        title: injection.bugTitle,
        method: injection.method,
        verified_failing_test: injection.verifiedFailingTest,
      },
    }),
  ]);

  return NextResponse.json({
    phase: "debugging",
    mutated_code: injection.mutatedCode,
    bug_title: injection.bugTitle,
    bug_hint: injection.bugHint,
    verified_failing_test: injection.verifiedFailingTest,
    initial_debug_run: failingRun,
  });
}

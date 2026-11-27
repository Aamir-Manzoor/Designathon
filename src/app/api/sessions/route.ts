import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SupportedLanguage } from "@/types/assessment";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("candidate_sessions")
    .select(
      `
      *,
      challenge:challenges(id, slug, title, difficulty, time_limit_minutes, token_budget),
      scorecard:scorecards(*)
    `
    )
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    challenge_id?: string;
    language?: SupportedLanguage;
    is_practice?: boolean;
  };

  if (!body.challenge_id) {
    return NextResponse.json(
      { error: "challenge_id is required" },
      { status: 400 }
    );
  }

  const language: SupportedLanguage =
    body.language === "javascript" ? "javascript" : "python";
  const isPractice = Boolean(body.is_practice);

  const [{ data: profile }, { data: challenge, error: chError }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("challenges")
        .select("*")
        .eq("id", body.challenge_id)
        .single(),
    ]);

  if (chError || !challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Enforce single-attempt lock for candidates on official exams (practice sessions remain allowed)
  if (!isPractice && profile?.role === "candidate") {
    const { data: existingOfficial } = await supabase
      .from("candidate_sessions")
      .select("id, phase")
      .eq("user_id", user.id)
      .eq("is_practice", false)
      .eq("phase", "submitted")
      .limit(1);

    if (existingOfficial && existingOfficial.length > 0) {
      return NextResponse.json(
        {
          error:
            "Exam already submitted. You cannot start the official assessment again — visit your Profile to view your assessment status.",
        },
        { status: 403 }
      );
    }
  }

  // Inherit pre-assigned evaluator from candidate_applications if Admin assigned one
  let assignedEvaluatorId: string | null = null;
  if (!isPractice) {
    const { data: appMatch } = await supabase
      .from("candidate_applications")
      .select("assigned_evaluator_id")
      .or(`user_id.eq.${user.id},email.ilike.${profile?.email || user.email || ""}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assignedEvaluatorId = appMatch?.assigned_evaluator_id ?? null;
  }

  const starterCode =
    (challenge.starter_code as Record<string, string>)?.[language] || "";
  const expiresAt = new Date(
    Date.now() + (challenge.time_limit_minutes || 45) * 60 * 1000
  ).toISOString();

  const { data: session, error: insertError } = await supabase
    .from("candidate_sessions")
    .insert({
      challenge_id: challenge.id,
      user_id: user.id,
      candidate_name: profile?.full_name || user.email?.split("@")[0] || "Candidate",
      candidate_email: profile?.email || user.email || "",
      is_synthetic: false,
      is_practice: isPractice,
      assigned_evaluator_id: assignedEvaluatorId,
      language,
      phase: "coding",
      current_code: starterCode,
      token_budget: challenge.token_budget || 6000,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (insertError || !session) {
    return NextResponse.json(
      { error: insertError?.message || "Failed to create session" },
      { status: 500 }
    );
  }

  await Promise.all([
    supabase.from("code_revisions").insert({
      session_id: session.id,
      revision_number: 1,
      source: "starter",
      code: starterCode,
      note: `Initialized ${language} starter template`,
    }),
    supabase.from("integrity_events").insert({
      session_id: session.id,
      event_type: "session_start",
      metadata: { language, challenge_slug: challenge.slug },
    }),
  ]);

  return NextResponse.json({ session }, { status: 201 });
}

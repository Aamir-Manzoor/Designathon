import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
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

  const { data: session, error: sessionError } = await supabase
    .from("candidate_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const [
    { data: challenge },
    { data: publicTests },
    { data: turns },
    { data: revisions },
    { data: runs },
    { data: integrityEvents },
    { data: scorecard },
  ] = await Promise.all([
    supabase
      .from("challenges")
      .select("*")
      .eq("id", session.challenge_id)
      .single(),
    supabase
      .from("test_cases")
      .select("*")
      .eq("challenge_id", session.challenge_id)
      .eq("visibility", "public")
      .order("sort_order", { ascending: true }),
    supabase
      .from("prompt_turns")
      .select("*")
      .eq("session_id", id)
      .order("turn_number", { ascending: true }),
    supabase
      .from("code_revisions")
      .select("*")
      .eq("session_id", id)
      .order("revision_number", { ascending: true }),
    supabase
      .from("execution_runs")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("integrity_events")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("scorecards").select("*").eq("session_id", id).maybeSingle(),
  ]);

  return NextResponse.json({
    session,
    challenge,
    publicTests: publicTests ?? [],
    turns: turns ?? [],
    revisions: revisions ?? [],
    runs: runs ?? [],
    integrityEvents: integrityEvents ?? [],
    scorecard: scorecard ?? null,
  });
}

export async function PATCH(
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

  const body = (await request.json()) as {
    current_code?: string;
    revision_source?: "ai_apply" | "manual_edit";
    revision_note?: string;
    integrity_event?: {
      event_type: string;
      metadata?: Record<string, unknown>;
    };
  };

  if (typeof body.current_code === "string") {
    const { error } = await supabase
      .from("candidate_sessions")
      .update({
        current_code: body.current_code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.revision_source) {
      const { data: latestRev } = await supabase
        .from("code_revisions")
        .select("revision_number")
        .eq("session_id", id)
        .order("revision_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from("code_revisions").insert({
        session_id: id,
        revision_number: (latestRev?.revision_number ?? 0) + 1,
        source: body.revision_source,
        code: body.current_code,
        note: body.revision_note || null,
      });
    }
  }

  if (body.integrity_event?.event_type) {
    await supabase.from("integrity_events").insert({
      session_id: id,
      event_type: body.integrity_event.event_type,
      metadata: body.integrity_event.metadata || {},
    });
  }

  return NextResponse.json({ ok: true });
}

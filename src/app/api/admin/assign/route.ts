import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Admin-only batch assignment endpoint.
 * Assigns a selected batch of candidate sessions to a specific Evaluator
 * (or unassigns when evaluator_id is null). Evaluators cannot self-assign.
 */
export async function POST(request: Request) {
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
      {
        error:
          "Only Admins can assign candidate batches to Evaluators (anti-bias policy).",
      },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    session_ids?: string[];
    evaluator_id?: string | null;
  };

  if (!Array.isArray(body.session_ids) || body.session_ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one candidate session to assign." },
      { status: 400 }
    );
  }

  const evaluatorId = body.evaluator_id || null;

  if (evaluatorId) {
    const { data: evalProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", evaluatorId)
      .single();

    if (!evalProfile || evalProfile.role !== "evaluator") {
      return NextResponse.json(
        { error: "Selected user is not a valid Evaluator." },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase
    .from("candidate_sessions")
    .update({
      assigned_evaluator_id: evaluatorId,
      updated_at: new Date().toISOString(),
    })
    .in("id", body.session_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated_count: body.session_ids.length,
    assigned_evaluator_id: evaluatorId,
  });
}

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
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

  if (profile?.role !== "admin" && profile?.role !== "evaluator") {
    return NextResponse.json(
      { error: "Admin or Evaluator access required" },
      { status: 403 }
    );
  }

  const body = (await request.json()) as { evaluator_notes?: string };
  const notes = (body.evaluator_notes ?? "").trim();

  const { data, error } = await supabase
    .from("scorecards")
    .update({ evaluator_notes: notes })
    .eq("session_id", sessionId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scorecard: data });
}

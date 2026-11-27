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

  const body = (await request.json()) as {
    evaluator_notes?: string;
    evaluator_decision?: "passed" | "rejected" | null;
  };
  const notes = (body.evaluator_notes ?? "").trim();
  const decision =
    body.evaluator_decision === "passed" || body.evaluator_decision === "rejected"
      ? body.evaluator_decision
      : null;

  if (!decision) {
    return NextResponse.json(
      { error: "Please select Pass or Reject before submitting evaluation." },
      { status: 400 }
    );
  }

  if (notes.length < 5) {
    return NextResponse.json(
      { error: "Please enter written evaluator feedback for the candidate." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("scorecards")
    .update({
      evaluator_notes: notes,
      evaluator_decision: decision,
      evaluator_reviewed_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Scorecard not found" },
      { status: 500 }
    );
  }

  return NextResponse.json({ scorecard: data });
}

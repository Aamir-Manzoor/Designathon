import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { dispatchEmailNotification } from "@/lib/engines/mailer";

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
    total_score?: number;
    submit_and_notify?: boolean;
  };
  const notes = (body.evaluator_notes ?? "").trim();
  const submitAndNotify = Boolean(body.submit_and_notify);

  const updates: Record<string, unknown> = {
    evaluator_notes: notes,
    evaluator_reviewed_at: new Date().toISOString(),
  };

  if (
    typeof body.total_score === "number" &&
    !Number.isNaN(body.total_score) &&
    body.total_score >= 0 &&
    body.total_score <= 100
  ) {
    updates.total_score = Math.round(body.total_score * 10) / 10;
  }

  if (submitAndNotify) {
    updates.score_released = true;
    updates.released_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("scorecards")
    .update(updates)
    .eq("session_id", sessionId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Scorecard not found" },
      { status: 500 }
    );
  }

  let deliveryStatus: string | null = null;
  if (submitAndNotify) {
    const { data: session } = await supabase
      .from("candidate_sessions")
      .select("id, candidate_name, candidate_email, challenge:challenges(title)")
      .eq("id", sessionId)
      .single();

    if (session) {
      const origin =
        request.headers.get("origin") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3001";
      const reportUrl = `${origin}/assess/${sessionId}`;
      const challengeTitle =
        (session.challenge as unknown as { title?: string } | null)?.title ||
        "Coding Assessment";

      const result = await dispatchEmailNotification({
        supabase,
        recipientEmail: session.candidate_email,
        recipientName: session.candidate_name,
        emailType: "score_released",
        subject: `Your PromptBench Score Report is Ready — ${challengeTitle}`,
        body: `Hi ${session.candidate_name},\n\nYour Evaluator has completed reviewing your submission for "${challengeTitle}" and finalized your score (${Number(
          data.total_score
        ).toFixed(1)}/100).\n\n${
          notes ? `Evaluator Feedback:\n${notes}\n\n` : ""
        }Sign in and visit your Profile or open your report directly:\n${reportUrl}`,
        actionUrl: reportUrl,
      });
      deliveryStatus = result.deliveryStatus;
    }
  }

  return NextResponse.json({
    scorecard: data,
    notified: submitAndNotify,
    delivery_status: deliveryStatus,
  });
}

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { dispatchEmailNotification } from "@/lib/engines/mailer";

export async function POST(
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

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Only Admins can release score reports to candidates." },
      { status: 403 }
    );
  }

  const { data: session } = await supabase
    .from("candidate_sessions")
    .select("id, candidate_name, candidate_email, challenge:challenges(title)")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: existingScorecard } = await supabase
    .from("scorecards")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (!existingScorecard) {
    return NextResponse.json({ error: "Scorecard not found" }, { status: 404 });
  }

  // Gate Admin release strictly behind Evaluator decision + feedback submission
  if (
    !existingScorecard.evaluator_decision ||
    !existingScorecard.evaluator_notes?.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Cannot release report yet. An Evaluator must first submit a Pass/Reject decision and feedback.",
      },
      { status: 400 }
    );
  }

  const { data: scorecard, error } = await supabase
    .from("scorecards")
    .update({
      score_released: true,
      released_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .select("*")
    .single();

  if (error || !scorecard) {
    return NextResponse.json(
      { error: error?.message || "Scorecard not found" },
      { status: 500 }
    );
  }

  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3001";
  const reportUrl = `${origin}/assess/${sessionId}`;
  const challengeTitle =
    (session.challenge as unknown as { title?: string } | null)?.title ||
    "Coding Assessment";
  const decisionLabel =
    scorecard.evaluator_decision === "passed" ? "Passed" : "Not Selected";

  const { deliveryStatus } = await dispatchEmailNotification({
    supabase,
    recipientEmail: session.candidate_email,
    recipientName: session.candidate_name,
    emailType: "score_released",
    subject: `Your PromptBench Assessment Feedback is Ready — ${challengeTitle}`,
    body: `Hi ${session.candidate_name},\n\nYour assessment for "${challengeTitle}" has been reviewed by our evaluation team.\n\nResult: ${decisionLabel}\n\nEvaluator Feedback:\n${scorecard.evaluator_notes}\n\nSign in to view your official feedback report in your Profile:\n${reportUrl}`,
    actionUrl: reportUrl,
  });

  return NextResponse.json({
    ok: true,
    scorecard,
    delivery_status: deliveryStatus,
  });
}

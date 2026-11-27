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

  const { deliveryStatus } = await dispatchEmailNotification({
    supabase,
    recipientEmail: session.candidate_email,
    recipientName: session.candidate_name,
    emailType: "score_released",
    subject: `Your PromptBench Score Report is Ready — ${challengeTitle}`,
    body: `Hi ${session.candidate_name},\n\nYour evaluation for "${challengeTitle}" has been reviewed and your explainable 100-point score report (${Number(
      scorecard.total_score
    ).toFixed(
      1
    )}/100) has been released.\n\nSign in to view your full rubric breakdown and token analytics:\n${reportUrl}`,
    actionUrl: reportUrl,
  });

  return NextResponse.json({
    ok: true,
    scorecard,
    delivery_status: deliveryStatus,
  });
}

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { dispatchEmailNotification } from "@/lib/engines/mailer";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    assigned_challenge_ids?: string[];
    assigned_evaluator_id?: string | null;
  };

  const challengeIds = Array.isArray(body.assigned_challenge_ids)
    ? body.assigned_challenge_ids.filter(Boolean)
    : [];
  const assignedEvaluatorId =
    typeof body.assigned_evaluator_id === "string" &&
    body.assigned_evaluator_id.trim().length > 0
      ? body.assigned_evaluator_id.trim()
      : null;

  if (challengeIds.length === 0) {
    return NextResponse.json(
      { error: "Assign at least one coding challenge before sending an invite." },
      { status: 400 }
    );
  }

  const { data: appRow, error: fetchErr } = await supabase
    .from("candidate_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !appRow) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  const inviteToken =
    appRow.invite_token || randomBytes(16).toString("hex");
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3001";
  const inviteUrl = `${origin}/register?invite=${inviteToken}`;

  const { data: updated, error: updateErr } = await supabase
    .from("candidate_applications")
    .update({
      status: appRow.status === "registered" ? "registered" : "invited",
      invite_token: inviteToken,
      assigned_challenge_ids: challengeIds,
      assigned_evaluator_id: assignedEvaluatorId,
      invited_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const { deliveryStatus } = await dispatchEmailNotification({
    supabase,
    recipientEmail: appRow.email,
    recipientName: appRow.full_name,
    emailType: "invite",
    subject: "Your PromptBench Coding Assessment Access Link",
    body: `Hi ${appRow.full_name},\n\nYou have been invited to complete your AI-Assisted Coding Assessment (${challengeIds.length} challenge(s) assigned for the ${appRow.track} track).\n\nUse your personal registration link below to create your candidate account and start your timed assessment:\n${inviteUrl}\n\nGood luck!\nPromptBench Assessment Team`,
    actionUrl: inviteUrl,
  });

  return NextResponse.json({
    application: updated,
    invite_url: inviteUrl,
    delivery_status: deliveryStatus,
  });
}

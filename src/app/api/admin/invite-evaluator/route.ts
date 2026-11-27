import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { dispatchEmailNotification } from "@/lib/engines/mailer";

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
      { error: "Only Admins can send Evaluator invitations." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    full_name?: string;
    email?: string;
  };

  const fullName = (body.full_name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();

  if (fullName.length < 2 || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid evaluator full name and email address are required." },
      { status: 400 }
    );
  }

  const inviteToken = randomBytes(16).toString("hex");
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3001";
  const inviteUrl = `${origin}/register?invite=${inviteToken}`;

  const { data: created, error: insertErr } = await supabase
    .from("candidate_applications")
    .insert({
      full_name: fullName,
      email,
      track: "Evaluator Review Panel",
      preferred_language: "python",
      status: "invited",
      invite_role: "evaluator",
      invite_token: inviteToken,
      assigned_challenge_ids: [],
      invited_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertErr || !created) {
    return NextResponse.json(
      { error: insertErr?.message || "Failed to create evaluator invite" },
      { status: 500 }
    );
  }

  const { deliveryStatus } = await dispatchEmailNotification({
    supabase,
    recipientEmail: email,
    recipientName: fullName,
    emailType: "invite",
    subject: "You're Invited as an Evaluator on PromptBench",
    body: `Hi ${fullName},\n\nAn Administrator has invited you to join PromptBench as an Assessment Evaluator.\n\nUse your personal, single-use registration link below to create your Evaluator account and access your assigned candidate review queue:\n${inviteUrl}\n\nNote: Account creation is invitation-only and locked to ${email}.`,
    actionUrl: inviteUrl,
  });

  return NextResponse.json(
    {
      invite: created,
      invite_url: inviteUrl,
      delivery_status: deliveryStatus,
    },
    { status: 201 }
  );
}

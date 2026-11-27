import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { dispatchEmailNotification } from "@/lib/engines/mailer";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const token = randomBytes(24).toString("hex");
  const { data: userName } = await supabase.rpc("create_password_reset_token", {
    p_email: email,
    p_token: token,
  });

  // Always return a generic 200 message to prevent email enumeration, while sending email when account exists
  if (userName) {
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    await dispatchEmailNotification({
      supabase,
      recipientEmail: email,
      recipientName: String(userName),
      emailType: "invite",
      subject: "Reset Your PromptBench Password",
      body: `Hi ${userName},\n\nWe received a request to reset your PromptBench account password.\n\nUse the single-use link below within the next 30 minutes to set a new password:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
      actionUrl: resetUrl,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a password reset link has been sent to your inbox.",
  });
}

import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailType = "invite" | "submission_received" | "score_released";

export interface DispatchEmailParams {
  supabase: SupabaseClient;
  recipientEmail: string;
  recipientName: string;
  emailType: EmailType;
  subject: string;
  body: string;
  actionUrl?: string;
}

/**
 * Dispatches an email notification:
 * 1) Sends via Gmail SMTP (nodemailer) when SMTP_USER & SMTP_PASS are configured.
 * 2) Otherwise sends via Resend API when RESEND_API_KEY is configured.
 * 3) Always logs into `email_notifications` (built-in Admin Email Outbox).
 */
export async function dispatchEmailNotification(params: DispatchEmailParams) {
  let deliveryStatus: "sent_smtp" | "sent_resend" | "logged_outbox" =
    "logged_outbox";

  const html = [
    `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;border:1px solid #e2e8f0;border-radius:12px;">`,
    `<h2 style="margin:0 0 12px;color:#0f172a;">${params.subject}</h2>`,
    `<p style="white-space:pre-line;line-height:1.6;color:#334155;">${params.body}</p>`,
    params.actionUrl
      ? `<p style="margin-top:20px;"><a href="${params.actionUrl}" style="display:inline-block;background:#10b981;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open Assessment Portal</a></p>`
      : "",
    `</div>`,
  ].join("");

  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass.replace(/\s+/g, ""),
        },
      });
      await transporter.sendMail({
        from: `PromptBench Assessment <${smtpUser}>`,
        to: params.recipientEmail,
        subject: params.subject,
        text: params.body,
        html,
      });
      deliveryStatus = "sent_smtp";
    } catch (err) {
      console.warn("[Mailer] Gmail SMTP send failed, falling back:", err);
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (deliveryStatus === "logged_outbox" && resendKey) {
    const fromAddr =
      process.env.RESEND_FROM_EMAIL?.trim() ||
      "PromptBench <onboarding@resend.dev>";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [params.recipientEmail],
          subject: params.subject,
          html,
        }),
      });
      if (res.ok) {
        deliveryStatus = "sent_resend";
      }
    } catch (err) {
      console.warn("[Mailer] Resend send failed, falling back to outbox:", err);
    }
  }

  const { data } = await params.supabase
    .from("email_notifications")
    .insert({
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      email_type: params.emailType,
      subject: params.subject,
      body: params.body,
      action_url: params.actionUrl || null,
      delivery_status: deliveryStatus,
    })
    .select("*")
    .single();

  return { notification: data, deliveryStatus };
}

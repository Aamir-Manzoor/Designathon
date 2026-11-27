import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { dispatchEmailNotification } from "@/lib/engines/mailer";

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      supabase,
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  return { supabase, error: null };
}

/**
 * PATCH /api/applications/[id] — Reject an application / revoke pending invite token.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as {
    status?: "rejected";
    notify?: boolean;
  };

  if (body.status !== "rejected") {
    return NextResponse.json({ error: "Unsupported status update" }, { status: 400 });
  }

  const { data: appRow, error: fetchErr } = await supabase
    .from("candidate_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !appRow) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("candidate_applications")
    .update({
      status: "rejected",
      invite_token: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (body.notify !== false && appRow.invite_role !== "evaluator") {
    await dispatchEmailNotification({
      supabase,
      recipientEmail: appRow.email,
      recipientName: appRow.full_name,
      emailType: "invite",
      subject: "Update on Your PromptBench Assessment Request",
      body: `Hi ${appRow.full_name},\n\nThank you for your interest in our engineering assessment. At this time, we are unable to move forward with your assessment invitation.\n\nBest regards,\nPromptBench Assessment Team`,
    }).catch(() => {});
  }

  return NextResponse.json({ application: updated });
}

/**
 * DELETE /api/applications/[id] — Permanently delete an application or invitation.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { error: delErr } = await supabase
    .from("candidate_applications")
    .delete()
    .eq("id", id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, id });
}

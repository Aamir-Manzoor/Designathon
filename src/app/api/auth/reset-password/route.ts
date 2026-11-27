import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
  };

  const token = (body.token ?? "").trim();
  const password = body.password ?? "";

  if (!token || password.length < 6) {
    return NextResponse.json(
      { error: "Valid reset token and password (min 6 characters) are required." },
      { status: 400 }
    );
  }

  const { data: ok, error } = await supabase.rpc(
    "consume_password_reset_token",
    {
      p_token: token,
      p_new_password: password,
    }
  );

  if (error || !ok) {
    return NextResponse.json(
      {
        error:
          "This password reset link is invalid, expired, or has already been used.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

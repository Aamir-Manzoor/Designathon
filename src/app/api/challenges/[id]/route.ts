import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function PATCH(
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
    token_budget?: number;
    time_limit_minutes?: number;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (typeof body.token_budget === "number" && body.token_budget >= 500) {
    updates.token_budget = Math.round(body.token_budget);
  }
  if (
    typeof body.time_limit_minutes === "number" &&
    body.time_limit_minutes >= 5
  ) {
    updates.time_limit_minutes = Math.round(body.time_limit_minutes);
  }
  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("challenges")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ challenge: data });
}

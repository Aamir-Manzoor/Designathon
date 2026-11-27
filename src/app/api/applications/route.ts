import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
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
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("candidate_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const body = (await request.json()) as {
    full_name?: string;
    email?: string;
    track?: string;
    preferred_language?: "python" | "javascript";
    github_url?: string;
  };

  const fullName = body.full_name?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!fullName || !email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid full name and email are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("candidate_applications")
    .insert({
      full_name: fullName,
      email,
      track: body.track?.trim() || "Full-Stack Engineer",
      preferred_language:
        body.preferred_language === "javascript" ? "javascript" : "python",
      github_url: body.github_url?.trim() || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ application: data }, { status: 201 });
}

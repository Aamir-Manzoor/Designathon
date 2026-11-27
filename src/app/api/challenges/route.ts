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

  const { data, error } = await supabase
    .from("challenges")
    .select("*, test_cases(id, name, visibility, sort_order)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ challenges: data ?? [] });
}

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
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    description: string;
    supported_languages: string[];
    time_limit_minutes: number;
    token_budget: number;
    starter_code: Record<string, string>;
    reference_solution: Record<string, string>;
    bug_injection_spec: Record<string, unknown>;
    test_cases: Array<{
      name: string;
      input: string;
      expected_output: string;
      visibility: "public" | "hidden" | "debug";
      weight?: number;
    }>;
  };

  if (!body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json(
      { error: "Title and description are required" },
      { status: 400 }
    );
  }

  const slug =
    body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.floor(1000 + Math.random() * 9000);

  const { data: challenge, error: chErr } = await supabase
    .from("challenges")
    .insert({
      slug,
      title: body.title.trim(),
      difficulty: body.difficulty || "Medium",
      description: body.description.trim(),
      supported_languages: body.supported_languages || ["python", "javascript"],
      time_limit_minutes: Number(body.time_limit_minutes) || 45,
      token_budget: Number(body.token_budget) || 6000,
      starter_code: body.starter_code || {},
      reference_solution: body.reference_solution || {},
      bug_injection_spec: body.bug_injection_spec || {},
      created_by: user.id,
    })
    .select("*")
    .single();

  if (chErr || !challenge) {
    return NextResponse.json(
      { error: chErr?.message || "Failed to create challenge" },
      { status: 500 }
    );
  }

  if (Array.isArray(body.test_cases) && body.test_cases.length > 0) {
    const tcRows = body.test_cases.map((tc, idx) => ({
      challenge_id: challenge.id,
      name: tc.name,
      input: tc.input,
      expected_output: tc.expected_output,
      visibility: tc.visibility,
      weight: tc.weight ?? 1.0,
      sort_order: idx + 1,
    }));
    await supabase.from("test_cases").insert(tcRows);
  }

  return NextResponse.json({ challenge }, { status: 201 });
}

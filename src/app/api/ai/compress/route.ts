import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { compressPromptDraft } from "@/lib/engines/token-optimizer";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    draft?: string;
    current_code?: string;
    challenge_description?: string;
  };

  if (!body.draft?.trim()) {
    return NextResponse.json(
      { error: "draft prompt is required" },
      { status: 400 }
    );
  }

  const result = compressPromptDraft({
    draft: body.draft,
    currentCode: body.current_code || "",
    challengeDescription: body.challenge_description || "",
  });

  return NextResponse.json(result);
}

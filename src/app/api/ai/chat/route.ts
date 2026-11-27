import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildOptimizedContext } from "@/lib/engines/token-optimizer";
import {
  generateWithProvider,
  type AIProviderId,
} from "@/lib/engines/ai-provider";
import type {
  CandidateSession,
  Challenge,
  PromptTurn,
} from "@/types/assessment";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    session_id?: string;
    prompt?: string;
    current_code?: string;
    latest_test_feedback?: string;
    provider?: AIProviderId;
  };

  if (!body.session_id || !body.prompt?.trim()) {
    return NextResponse.json(
      { error: "session_id and prompt are required" },
      { status: 400 }
    );
  }

  const { data: sessionData, error: sessionErr } = await supabase
    .from("candidate_sessions")
    .select("*")
    .eq("id", body.session_id)
    .single();

  if (sessionErr || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = sessionData as CandidateSession;
  if (session.phase === "submitted") {
    return NextResponse.json(
      { error: "Session is already submitted." },
      { status: 400 }
    );
  }

  if (session.tokens_used >= session.token_budget) {
    await supabase.from("integrity_events").insert({
      session_id: session.id,
      event_type: "budget_exceeded",
      metadata: {
        tokens_used: session.tokens_used,
        token_budget: session.token_budget,
      },
    });
    return NextResponse.json(
      {
        error:
          "Token budget exhausted. You can still edit code manually, run tests, and submit.",
      },
      { status: 429 }
    );
  }

  const [{ data: challengeData }, { data: prevTurnsData }] = await Promise.all([
    supabase
      .from("challenges")
      .select("*")
      .eq("id", session.challenge_id)
      .single(),
    supabase
      .from("prompt_turns")
      .select("*")
      .eq("session_id", session.id)
      .order("turn_number", { ascending: true }),
  ]);

  if (!challengeData) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const challenge = challengeData as Challenge;
  const previousTurns = (prevTurnsData ?? []) as PromptTurn[];
  const activeCode =
    typeof body.current_code === "string"
      ? body.current_code
      : session.current_code;

  // Build adaptive token-optimized context payload
  const optimized = buildOptimizedContext({
    challenge,
    language: session.language,
    phase: session.phase,
    currentCode: activeCode,
    latestTestFeedback: body.latest_test_feedback,
    previousTurns,
    userPrompt: body.prompt,
    tokensUsed: session.tokens_used,
    tokenBudget: session.token_budget,
  });

  try {
    const aiResult = await generateWithProvider({
      requestedProvider: body.provider || "auto",
      systemInstruction: optimized.systemInstruction,
      messages: optimized.messages,
      language: session.language,
      maxOutputTokens: optimized.recommendedMaxOutputTokens,
    });

    const turnTokens = aiResult.promptTokens + aiResult.completionTokens;
    const actualSaved = Math.max(
      0,
      optimized.naiveTokensEstimate - aiResult.promptTokens
    );
    const nextTokensUsed = session.tokens_used + turnTokens;
    const nextTokensSaved = session.tokens_saved + actualSaved;
    const turnNumber = previousTurns.length + 1;

    const { data: savedTurn, error: turnError } = await supabase
      .from("prompt_turns")
      .insert({
        session_id: session.id,
        turn_number: turnNumber,
        phase: session.phase,
        user_prompt: body.prompt.trim(),
        ai_response: aiResult.text,
        extracted_code: aiResult.extractedCode,
        prompt_tokens: aiResult.promptTokens,
        completion_tokens: aiResult.completionTokens,
        cached_tokens: aiResult.cachedTokens,
        naive_tokens_estimate: optimized.naiveTokensEstimate,
        tokens_saved: actualSaved,
        context_strategy: `${optimized.contextStrategy} [${aiResult.provider}:${aiResult.model}]`,
        efficiency_hints: optimized.efficiencyHints,
      })
      .select("*")
      .single();

    if (turnError) {
      return NextResponse.json({ error: turnError.message }, { status: 500 });
    }

    await supabase
      .from("candidate_sessions")
      .update({
        current_code: activeCode,
        tokens_used: nextTokensUsed,
        tokens_saved: nextTokensSaved,
        rolling_summary:
          optimized.updatedRollingSummary || session.rolling_summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    const pct = Math.round((nextTokensUsed / session.token_budget) * 100);
    if (pct >= 75) {
      await supabase.from("integrity_events").insert({
        session_id: session.id,
        event_type: "budget_warning",
        metadata: { percent: pct, tokens_used: nextTokensUsed },
      });
    }

    return NextResponse.json({
      turn: savedTurn,
      tokens_used: nextTokensUsed,
      tokens_saved: nextTokensSaved,
      token_budget: session.token_budget,
      context_mode: optimized.contextMode,
      provider: aiResult.provider,
      model: aiResult.model,
      efficiency_hints: optimized.efficiencyHints,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate AI response";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

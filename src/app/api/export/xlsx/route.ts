import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerSupabase } from "@/lib/supabase/server";
import { estimateSessionCostUsd } from "@/lib/engines/ai-provider";
import type { ScorecardBreakdown } from "@/types/assessment";

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

  if (profile?.role !== "admin" && profile?.role !== "evaluator") {
    return NextResponse.json(
      { error: "Admin or Evaluator access required" },
      { status: 403 }
    );
  }

  const [{ data: sessions }, { data: turns }] = await Promise.all([
    supabase
      .from("candidate_sessions")
      .select(
        `
        *,
        challenge:challenges(title, difficulty),
        scorecard:scorecards(*)
      `
      )
      .order("started_at", { ascending: false }),
    supabase
      .from("prompt_turns")
      .select(
        `
        *,
        session:candidate_sessions(candidate_name, candidate_email)
      `
      )
      .order("created_at", { ascending: true }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PromptBench AI Coding Assessment Platform";
  workbook.created = new Date();

  // Sheet 1: Candidate Scorecards Summary
  const summarySheet = workbook.addWorksheet("Candidate Scorecards");
  summarySheet.columns = [
    { header: "Candidate Name", key: "name", width: 22 },
    { header: "Email", key: "email", width: 30 },
    { header: "Challenge", key: "challenge", width: 28 },
    { header: "Language", key: "language", width: 12 },
    { header: "Type", key: "type", width: 12 },
    { header: "Prompt Quality (/40)", key: "pq", width: 20 },
    { header: "Prompt Improvement (/10)", key: "pi", width: 24 },
    { header: "Test Cases (/30)", key: "tc", width: 18 },
    { header: "Debug Tests (/20)", key: "dt", width: 18 },
    { header: "Total Score (/100)", key: "total", width: 18 },
    { header: "Tokens Used", key: "tokens_used", width: 14 },
    { header: "Token Budget", key: "token_budget", width: 14 },
    { header: "Budget %", key: "budget_pct", width: 12 },
    { header: "Tokens Saved", key: "tokens_saved", width: 14 },
    { header: "Est. Cost (USD)", key: "cost_usd", width: 16 },
    { header: "Cost Saved (USD)", key: "saved_usd", width: 16 },
    { header: "Efficiency (Pts/1K Tok)", key: "efficiency_idx", width: 22 },
    { header: "Verdict", key: "verdict", width: 42 },
  ];

  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };

  for (const s of sessions ?? []) {
    const sc = Array.isArray(s.scorecard) ? s.scorecard[0] : s.scorecard;
    const breakdown = sc?.rubric_breakdown as ScorecardBreakdown | undefined;
    const budgetPct =
      s.token_budget > 0
        ? Math.round((s.tokens_used / s.token_budget) * 100)
        : 0;

    const cost = estimateSessionCostUsd(s.tokens_used, s.tokens_saved);
    const totalScoreNum = sc ? Number(sc.total_score) : 0;
    const efficiencyIdx =
      s.tokens_used > 0
        ? Number((totalScoreNum / (s.tokens_used / 1000)).toFixed(1))
        : 0;

    summarySheet.addRow({
      name: s.candidate_name,
      email: s.candidate_email,
      challenge: s.challenge?.title || "—",
      language: s.language,
      type: s.is_synthetic ? "Benchmark" : "Live",
      pq: sc ? Number(sc.prompt_quality_score) : 0,
      pi: sc ? Number(sc.prompt_improvement_score) : 0,
      tc: sc ? Number(sc.test_cases_score) : 0,
      dt: sc ? Number(sc.debug_test_cases_score) : 0,
      total: totalScoreNum,
      tokens_used: s.tokens_used,
      token_budget: s.token_budget,
      budget_pct: `${budgetPct}%`,
      tokens_saved: s.tokens_saved,
      cost_usd: `$${cost.costUsd.toFixed(5)}`,
      saved_usd: `$${cost.savedUsd.toFixed(5)}`,
      efficiency_idx: efficiencyIdx,
      verdict: breakdown?.overall_verdict || s.phase,
    });
  }

  // Sheet 2: Explainable Rubric Breakdown
  const rubricSheet = workbook.addWorksheet("Explainable Rubric");
  rubricSheet.columns = [
    { header: "Candidate", key: "name", width: 22 },
    { header: "Category", key: "category", width: 26 },
    { header: "Score", key: "score", width: 12 },
    { header: "Max", key: "max", width: 10 },
    { header: "Cited Turns", key: "turns", width: 16 },
    { header: "Explanation", key: "explanation", width: 64 },
  ];
  rubricSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  rubricSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF312E81" },
  };

  for (const s of sessions ?? []) {
    const sc = Array.isArray(s.scorecard) ? s.scorecard[0] : s.scorecard;
    const b = sc?.rubric_breakdown as ScorecardBreakdown | undefined;
    if (!b) continue;
    for (const c of b.prompt_quality?.criteria ?? []) {
      rubricSheet.addRow({
        name: s.candidate_name,
        category: `Prompt Quality: ${c.criterion}`,
        score: c.score,
        max: c.max_score,
        turns: (c.cited_turns || []).join(", "),
        explanation: c.explanation,
      });
    }
    rubricSheet.addRow({
      name: s.candidate_name,
      category: "Prompt Improvement",
      score: b.prompt_improvement?.total ?? 0,
      max: b.prompt_improvement?.max ?? 10,
      turns: (b.prompt_improvement?.cited_turns || []).join(", "),
      explanation: b.prompt_improvement?.summary || "",
    });
    rubricSheet.addRow({
      name: s.candidate_name,
      category: "Test Cases",
      score: b.test_cases?.total ?? 0,
      max: b.test_cases?.max ?? 30,
      turns: "—",
      explanation: b.test_cases?.summary || "",
    });
    rubricSheet.addRow({
      name: s.candidate_name,
      category: "Debug Test Cases",
      score: b.debug_test_cases?.total ?? 0,
      max: b.debug_test_cases?.max ?? 20,
      turns: "—",
      explanation: b.debug_test_cases?.summary || "",
    });
  }

  // Sheet 3: Per-Turn Token Analytics
  const tokenSheet = workbook.addWorksheet("Token Usage Logs");
  tokenSheet.columns = [
    { header: "Candidate", key: "name", width: 22 },
    { header: "Turn #", key: "turn", width: 10 },
    { header: "Phase", key: "phase", width: 12 },
    { header: "Prompt Tokens", key: "pt", width: 16 },
    { header: "Completion Tokens", key: "ct", width: 18 },
    { header: "Cached Tokens", key: "cached", width: 16 },
    { header: "Naive Estimate", key: "naive", width: 16 },
    { header: "Tokens Saved", key: "saved", width: 16 },
    { header: "Prompt Excerpt", key: "excerpt", width: 60 },
  ];
  tokenSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  tokenSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF065F46" },
  };

  for (const t of turns ?? []) {
    tokenSheet.addRow({
      name: t.session?.candidate_name || "Unknown",
      turn: t.turn_number,
      phase: t.phase,
      pt: t.prompt_tokens,
      ct: t.completion_tokens,
      cached: t.cached_tokens,
      naive: t.naive_tokens_estimate,
      saved: t.tokens_saved,
      excerpt: String(t.user_prompt || "").slice(0, 140),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="promptbench-scorecards-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}

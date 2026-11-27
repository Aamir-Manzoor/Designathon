"use client";

import type { Scorecard } from "@/types/assessment";
import { Award, CheckCircle2, Sparkles, Bug, MessageSquare } from "lucide-react";

interface ScorecardViewProps {
  scorecard: Scorecard;
  candidateName?: string;
}

export function ScorecardView({
  scorecard,
  candidateName,
}: ScorecardViewProps) {
  const b = scorecard.rubric_breakdown;

  return (
    <div className="space-y-6">
      {/* Top Hero Score */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-[#111827] to-[#111827] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Award className="h-4 w-4" />
              Explainable Assessment Scorecard
            </div>
            {candidateName && (
              <h2 className="mt-1 text-xl font-bold text-white">
                {candidateName}
              </h2>
            )}
            <p className="mt-1.5 text-sm text-slate-300">
              {b?.overall_verdict}
            </p>
            {b?.token_efficiency_summary && (
              <p className="mt-1 text-xs text-emerald-300">
                {b.token_efficiency_summary}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-indigo-500/40 bg-[#090d16] px-6 py-4">
            <span className="text-3xl font-extrabold text-white">
              {Number(scorecard.total_score).toFixed(1)}
            </span>
            <span className="text-xs font-medium text-slate-400">
              out of 100
            </span>
          </div>
        </div>
      </div>

      {/* 4 Rubric Pillar Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Prompt Quality",
            score: Number(scorecard.prompt_quality_score),
            max: 40,
            icon: Sparkles,
            color: "text-indigo-400",
          },
          {
            label: "Prompt Improvement",
            score: Number(scorecard.prompt_improvement_score),
            max: 10,
            icon: MessageSquare,
            color: "text-cyan-400",
          },
          {
            label: "Test Cases",
            score: Number(scorecard.test_cases_score),
            max: 30,
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
          {
            label: "Debug Test Cases",
            score: Number(scorecard.debug_test_cases_score),
            max: 20,
            icon: Bug,
            color: "text-amber-400",
          },
        ].map((item) => {
          const pct = Math.min(100, Math.round((item.score / item.max) * 100));
          return (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800 bg-[#111827] p-4"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{item.label}</span>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">
                  {item.score.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">/ {item.max}</span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Explainable Criteria */}
      {b?.prompt_quality?.criteria && (
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
          <h3 className="text-sm font-semibold text-white">
            Prompt Quality Breakdown ({b.prompt_quality.total} /{" "}
            {b.prompt_quality.max})
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {b.prompt_quality.summary}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {b.prompt_quality.criteria.map((c) => (
              <div
                key={c.criterion}
                className="rounded-lg border border-slate-800 bg-[#0b1120] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    {c.criterion}
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-300">
                    {c.score} / {c.max_score}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {c.explanation}
                </p>
                {c.cited_turns?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.cited_turns.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
                      >
                        Turn #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other 3 Pillars Summaries */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="text-xs font-semibold text-cyan-300">
            Prompt Improvement ({b?.prompt_improvement?.total ?? 0}/10)
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {b?.prompt_improvement?.summary}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="text-xs font-semibold text-emerald-300">
            Test Cases ({b?.test_cases?.total ?? 0}/30)
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {b?.test_cases?.summary}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="text-xs font-semibold text-amber-300">
            Debug Test Cases ({b?.debug_test_cases?.total ?? 0}/20)
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {b?.debug_test_cases?.summary}
          </p>
        </div>
      </div>
    </div>
  );
}

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
      <div className="surface-card rounded-2xl border-[var(--accent-border)] p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              <Award className="h-4 w-4" />
              Explainable Assessment Scorecard
            </div>
            {candidateName && (
              <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                {candidateName}
              </h2>
            )}
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              {b?.overall_verdict}
            </p>
            {b?.token_efficiency_summary && (
              <p className="mt-1 text-xs font-medium text-emerald-500">
                {b.token_efficiency_summary}
              </p>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-6 py-4 sm:w-auto">
            <span className="tabular-nums font-mono text-3xl font-extrabold text-[var(--text-primary)]">
              {Number(scorecard.total_score).toFixed(1)}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)]">
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
            color: "text-[var(--accent)]",
          },
          {
            label: "Prompt Improvement",
            score: Number(scorecard.prompt_improvement_score),
            max: 10,
            icon: MessageSquare,
            color: "text-cyan-500",
          },
          {
            label: "Test Cases",
            score: Number(scorecard.test_cases_score),
            max: 30,
            icon: CheckCircle2,
            color: "text-emerald-500",
          },
          {
            label: "Debug Test Cases",
            score: Number(scorecard.debug_test_cases_score),
            max: 20,
            icon: Bug,
            color: "text-amber-500",
          },
        ].map((item) => {
          const pct = Math.min(100, Math.round((item.score / item.max) * 100));
          return (
            <div key={item.label} className="surface-card rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{item.label}</span>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="tabular-nums mt-2 flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-[var(--text-primary)]">
                  {item.score.toFixed(1)}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  / {item.max}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Explainable Criteria */}
      {b?.prompt_quality?.criteria && (
        <div className="surface-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Prompt Quality Breakdown ({b.prompt_quality.total} /{" "}
            {b.prompt_quality.max})
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {b.prompt_quality.summary}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {b.prompt_quality.criteria.map((c) => (
              <div
                key={c.criterion}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {c.criterion}
                  </span>
                  <span className="tabular-nums font-mono text-xs font-bold text-[var(--accent)]">
                    {c.score} / {c.max_score}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {c.explanation}
                </p>
                {c.cited_turns?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.cited_turns.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-[var(--border-subtle)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
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
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs font-semibold text-cyan-500">
            Prompt Improvement ({b?.prompt_improvement?.total ?? 0}/10)
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            {b?.prompt_improvement?.summary}
          </p>
        </div>
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs font-semibold text-emerald-500">
            Test Cases ({b?.test_cases?.total ?? 0}/30)
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            {b?.test_cases?.summary}
          </p>
        </div>
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs font-semibold text-amber-500">
            Debug Test Cases ({b?.debug_test_cases?.total ?? 0}/20)
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            {b?.debug_test_cases?.summary}
          </p>
        </div>
      </div>
    </div>
  );
}

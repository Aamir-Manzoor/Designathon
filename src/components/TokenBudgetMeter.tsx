"use client";

import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import {
  Gauge,
  Sparkles,
  AlertTriangle,
  Info,
  ShieldAlert,
  Layers,
} from "lucide-react";
import type { EfficiencyHint, PromptTurn } from "@/types/assessment";
import { resolveAdaptiveContextMode } from "@/lib/engines/token-optimizer";
import { formatNumber } from "@/lib/utils";

interface TokenBudgetMeterProps {
  tokensUsed: number;
  tokenBudget: number;
  tokensSaved: number;
  turns: PromptTurn[];
  liveHints: EfficiencyHint[];
}

export function TokenBudgetMeter({
  tokensUsed,
  tokenBudget,
  tokensSaved,
  turns,
  liveHints,
}: TokenBudgetMeterProps) {
  const remaining = Math.max(0, tokenBudget - tokensUsed);
  const pct =
    tokenBudget > 0
      ? Math.min(100, Math.round((tokensUsed / tokenBudget) * 100))
      : 0;

  const adaptive = resolveAdaptiveContextMode(tokensUsed, tokenBudget);

  const statusColor =
    pct >= 85
      ? "bg-red-500"
      : pct >= 60
      ? "bg-amber-500"
      : "bg-emerald-500";

  const textStatusColor =
    pct >= 85
      ? "text-red-500"
      : pct >= 60
      ? "text-amber-500"
      : "text-emerald-500";

  const modeBadge =
    adaptive.mode === "ultra_lean"
      ? {
          label: "Ultra-Lean Context",
          cls: "bg-red-500/15 text-red-500 ring-red-500/30",
        }
      : adaptive.mode === "compact"
      ? {
          label: "Compact Context",
          cls: "bg-amber-500/15 text-amber-500 ring-amber-500/30",
        }
      : {
          label: "Standard Context",
          cls: "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent-border)]",
        };

  const chartData = turns.map((t) => ({
    turn: `T${t.turn_number}`,
    used: t.prompt_tokens + t.completion_tokens,
    saved: t.tokens_saved,
  }));

  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          <Gauge className="h-3.5 w-3.5 text-[var(--accent)]" />
          Live Token Budget
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${modeBadge.cls}`}
            title="Adaptive Context-Window Management shifts automatically based on remaining budget"
          >
            <Layers className="h-2.5 w-2.5" />
            {modeBadge.label}
          </span>
          <span className="tabular-nums flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 ring-1 ring-emerald-500/30">
            <Sparkles className="h-2.5 w-2.5" />
            {formatNumber(tokensSaved)} saved
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2.5">
        <div className="tabular-nums flex items-baseline justify-between text-xs">
          <span className="font-mono text-[var(--text-primary)]">
            <strong className={textStatusColor}>{formatNumber(remaining)}</strong>{" "}
            <span className="text-[var(--text-muted)]">remaining</span>
          </span>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            {formatNumber(tokensUsed)} / {formatNumber(tokenBudget)} ({pct}%)
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className={`h-full transition-all duration-300 ${statusColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Usage Trend Sparkline */}
      {chartData.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-1.5">
          <div className="text-[11px] text-[var(--text-muted)]">
            <div className="font-semibold text-[var(--text-primary)]">
              Burn Trend
            </div>
            <div className="tabular-nums">{turns.length} turn(s)</div>
          </div>
          <div className="h-10 w-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-1)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text-primary)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="used"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* High-consumption Warning Banner */}
      {pct >= 75 && (
        <div
          className={`mt-2.5 flex items-start gap-2 rounded-lg border p-2 text-xs ${
            pct >= 90
              ? "border-red-500/40 bg-red-500/10 text-red-500"
              : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300"
          }`}
        >
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {pct >= 90
              ? "Critical token burn (>90%). Ultra-Lean context active — ask only for 1–3 line patches."
              : "High token consumption (>75%). Avoid pasting full code; editor state is synced automatically."}
          </span>
        </div>
      )}

      {/* Actionable Prompt-Efficiency Hints */}
      {liveHints.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {liveHints.slice(0, 2).map((hint, idx) => (
            <div
              key={`${hint.code}-${idx}`}
              className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${
                hint.severity === "critical"
                  ? "border-red-500/30 bg-red-500/10 text-red-500"
                  : hint.severity === "warning"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                  : "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
              }`}
            >
              {hint.severity === "info" ? (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
              <span>{hint.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

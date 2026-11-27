"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import {
  Gauge,
  Sparkles,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";
import type { EfficiencyHint, PromptTurn } from "@/types/assessment";
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
    tokenBudget > 0 ? Math.min(100, Math.round((tokensUsed / tokenBudget) * 100)) : 0;

  const statusColor =
    pct >= 85
      ? "bg-red-500"
      : pct >= 60
      ? "bg-amber-500"
      : "bg-emerald-500";

  const textStatusColor =
    pct >= 85
      ? "text-red-400"
      : pct >= 60
      ? "text-amber-400"
      : "text-emerald-400";

  const chartData = turns.map((t) => ({
    turn: `T${t.turn_number}`,
    used: t.prompt_tokens + t.completion_tokens,
    saved: t.tokens_saved,
  }));

  return (
    <div className="border-b border-slate-800 bg-[#0d1424] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Gauge className="h-3.5 w-3.5 text-indigo-400" />
          Live Token Budget
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
          <Sparkles className="h-3 w-3" />
          {formatNumber(tokensSaved)} saved
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-mono text-slate-200">
            <strong className={textStatusColor}>{formatNumber(remaining)}</strong>{" "}
            <span className="text-slate-500">remaining</span>
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {formatNumber(tokensUsed)} / {formatNumber(tokenBudget)} ({pct}%)
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-300 ${statusColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Usage Trend Sparkline */}
      {chartData.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-[#090d16] px-2.5 py-1.5">
          <div className="text-[11px] text-slate-400">
            <div className="font-medium text-slate-300">Burn Trend</div>
            <div>{turns.length} turn(s)</div>
          </div>
          <div className="h-10 w-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="used"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.25}
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
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {pct >= 90
              ? "Critical token burn (>90%). Ask only for 1–3 line targeted fixes."
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
              className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px] leading-snug ${
                hint.severity === "critical"
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : hint.severity === "warning"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
              }`}
            >
              {hint.severity === "info" ? (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              )}
              <span>{hint.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

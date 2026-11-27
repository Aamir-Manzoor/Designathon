"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  FileSpreadsheet,
  Users,
  Award,
  Gauge,
  Sparkles,
  Plus,
  Eye,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface AdminSessionRow {
  id: string;
  candidate_name: string;
  candidate_email: string;
  is_synthetic: boolean;
  language: string;
  phase: string;
  tokens_used: number;
  tokens_saved: number;
  token_budget: number;
  started_at: string;
  challenge: { title: string; difficulty: string } | null;
  scorecard:
    | Array<{
        prompt_quality_score: number;
        prompt_improvement_score: number;
        test_cases_score: number;
        debug_test_cases_score: number;
        total_score: number;
      }>
    | {
        prompt_quality_score: number;
        prompt_improvement_score: number;
        test_cases_score: number;
        debug_test_cases_score: number;
        total_score: number;
      }
    | null;
}

interface AdminChallengeRow {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  time_limit_minutes: number;
  token_budget: number;
  supported_languages: string[];
  is_active: boolean;
  test_cases?: Array<{ id: string; visibility: string }>;
}

export function AdminConsoleClient({
  sessions,
  challenges,
}: {
  sessions: AdminSessionRow[];
  challenges: AdminChallengeRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"scorecards" | "challenges">(
    "scorecards"
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // New Challenge Form state
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Medium"
  );
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState(45);
  const [tokenBudget, setTokenBudget] = useState(6000);
  const [publicInput, setPublicInput] = useState('{"input": [1, 2, 3]}');
  const [publicOutput, setPublicOutput] = useState("[1, 2, 3]");
  const [debugInput, setDebugInput] = useState('{"input": []}');
  const [debugOutput, setDebugOutput] = useState("[]");

  const normalizedSessions = sessions.map((s) => {
    const sc = Array.isArray(s.scorecard) ? s.scorecard[0] : s.scorecard;
    return { ...s, sc };
  });

  const scoredSessions = normalizedSessions.filter((s) => s.sc);
  const avgScore =
    scoredSessions.length > 0
      ? scoredSessions.reduce(
          (sum, s) => sum + Number(s.sc?.total_score || 0),
          0
        ) / scoredSessions.length
      : 0;
  const avgTokens =
    normalizedSessions.length > 0
      ? normalizedSessions.reduce((sum, s) => sum + s.tokens_used, 0) /
        normalizedSessions.length
      : 0;
  const totalSaved = normalizedSessions.reduce(
    (sum, s) => sum + s.tokens_saved,
    0
  );

  const chartData = scoredSessions.slice(0, 8).map((s) => ({
    name: s.candidate_name.split(" ")[0],
    score: Number(s.sc?.total_score || 0),
    budgetPct:
      s.token_budget > 0
        ? Math.round((s.tokens_used / s.token_budget) * 100)
        : 0,
  }));

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          difficulty,
          description,
          supported_languages: ["python", "javascript"],
          time_limit_minutes: timeLimit,
          token_budget: tokenBudget,
          starter_code: {
            python:
              'import sys, json\n\ndef solve(data):\n    # TODO\n    return data\n\nif __name__ == "__main__":\n    print(json.dumps(solve(json.loads(sys.stdin.read()))))\n',
            javascript:
              'const fs = require("fs");\nfunction solve(data) {\n  // TODO\n  return data;\n}\nconsole.log(JSON.stringify(solve(JSON.parse(fs.readFileSync(0, "utf8")))));\n',
          },
          reference_solution: {},
          bug_injection_spec: {
            python: {
              language: "python",
              title: "Boundary Comparison Bug",
              description: "Mutated boundary operator in candidate solution.",
              hint: "Check boundary comparison operators.",
              mutations: [{ pattern: ">=", replacement: ">" }],
              fallback_bug_instruction: "Introduce a subtle off-by-one bug.",
            },
            javascript: {
              language: "javascript",
              title: "Boundary Comparison Bug",
              description: "Mutated boundary operator in candidate solution.",
              hint: "Check boundary comparison operators.",
              mutations: [{ pattern: ">=", replacement: ">" }],
              fallback_bug_instruction: "Introduce a subtle off-by-one bug.",
            },
          },
          test_cases: [
            {
              name: "Public Case 1",
              input: publicInput,
              expected_output: publicOutput,
              visibility: "public",
            },
            {
              name: "Debug Regression Case",
              input: debugInput,
              expected_output: debugOutput,
              visibility: "debug",
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create challenge");
        setCreating(false);
        return;
      }
      setShowCreateForm(false);
      setTitle("");
      setDescription("");
      router.refresh();
    } catch {
      setCreateError("Network error creating challenge");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Admin &amp; Evaluator Console
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure AI-assisted coding challenges, inspect explainable 100-pt
            scorecards, and export token analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/export/xlsx"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Scorecards (.xlsx)
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Evaluated Candidates",
            value: String(normalizedSessions.length),
            sub: `${normalizedSessions.filter((s) => s.is_synthetic).length} synthetic · ${normalizedSessions.filter((s) => !s.is_synthetic).length} live`,
            icon: Users,
            color: "text-indigo-400",
          },
          {
            label: "Average Score",
            value: `${avgScore.toFixed(1)} / 100`,
            sub: "Prompt + Tests + Debug",
            icon: Award,
            color: "text-emerald-400",
          },
          {
            label: "Avg Token Burn",
            value: formatNumber(avgTokens),
            sub: "Tokens per session",
            icon: Gauge,
            color: "text-amber-400",
          },
          {
            label: "Total Tokens Saved",
            value: formatNumber(totalSaved),
            sub: "Via context reduction",
            icon: Sparkles,
            color: "text-cyan-400",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-800 bg-[#111827] p-5"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {kpi.value}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-8 flex items-center justify-between border-b border-slate-800">
        <div className="flex gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("scorecards")}
            className={`pb-3 transition ${
              activeTab === "scorecards"
                ? "border-b-2 border-indigo-500 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Candidate Scorecards &amp; Token Analytics (
            {normalizedSessions.length})
          </button>
          <button
            onClick={() => setActiveTab("challenges")}
            className={`pb-3 transition ${
              activeTab === "challenges"
                ? "border-b-2 border-indigo-500 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Challenges &amp; Rubrics ({challenges.length})
          </button>
        </div>

        {activeTab === "challenges" && (
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New Challenge
          </button>
        )}
      </div>

      {activeTab === "scorecards" ? (
        <div className="mt-6 space-y-6">
          {/* Score vs Token Budget % Chart */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Score (/100) vs. Token Budget Consumption (%)
                  </h2>
                  <p className="text-xs text-slate-400">
                    High score with low budget % indicates token-conscious AI
                    engineering.
                  </p>
                </div>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      name="Total Score (/100)"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="budgetPct"
                      name="Token Budget Used (%)"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Candidate Scorecards Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111827]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-[#0b1120] uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Challenge</th>
                  <th className="px-3 py-3 text-center">Prompt (40)</th>
                  <th className="px-3 py-3 text-center">Improv (10)</th>
                  <th className="px-3 py-3 text-center">Tests (30)</th>
                  <th className="px-3 py-3 text-center">Debug (20)</th>
                  <th className="px-3 py-3 text-center">Total (100)</th>
                  <th className="px-4 py-3">Tokens (Used / Saved)</th>
                  <th className="px-4 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {normalizedSessions.map((s) => {
                  const pct =
                    s.token_budget > 0
                      ? Math.round((s.tokens_used / s.token_budget) * 100)
                      : 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">
                          {s.candidate_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span>{s.candidate_email}</span>
                          {s.is_synthetic && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                              synthetic
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div>{s.challenge?.title || "—"}</div>
                        <div className="text-[11px] capitalize text-slate-500">
                          {s.language}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-200">
                        {s.sc ? Number(s.sc.prompt_quality_score).toFixed(1) : "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-200">
                        {s.sc
                          ? Number(s.sc.prompt_improvement_score).toFixed(1)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-200">
                        {s.sc ? Number(s.sc.test_cases_score).toFixed(1) : "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-200">
                        {s.sc
                          ? Number(s.sc.debug_test_cases_score).toFixed(1)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-sm font-bold text-white">
                        {s.sc ? (
                          <span
                            className={`rounded-md px-2 py-0.5 ${
                              Number(s.sc.total_score) >= 85
                                ? "bg-emerald-500/20 text-emerald-300"
                                : Number(s.sc.total_score) >= 70
                                ? "bg-indigo-500/20 text-indigo-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {Number(s.sc.total_score).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-500">{s.phase}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div className="text-slate-200">
                          {formatNumber(s.tokens_used)}{" "}
                          <span
                            className={
                              pct >= 85
                                ? "text-red-400"
                                : pct >= 60
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }
                          >
                            ({pct}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          +{formatNumber(s.tokens_saved)} saved
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/sessions/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-indigo-300 transition hover:border-indigo-500 hover:bg-slate-800"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {showCreateForm && (
            <form
              onSubmit={handleCreateChallenge}
              className="rounded-xl border border-indigo-500/30 bg-[#111827] p-6"
            >
              <h3 className="text-base font-semibold text-white">
                Create New AI-Assisted Coding Challenge
              </h3>
              {createError && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {createError}
                </div>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-slate-400">
                    Challenge Title
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Distributed Cache Eviction Engine"
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(
                        e.target.value as "Easy" | "Medium" | "Hard"
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 text-sm text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs text-slate-400">
                  Problem Statement (Markdown supported)
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe stdin JSON format, expected stdout JSON, and constraints..."
                  className="w-full rounded-lg border border-slate-700 bg-[#0b1120] p-3 text-sm text-white"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Token Budget
                  </label>
                  <input
                    type="number"
                    min={1000}
                    max={50000}
                    step={500}
                    value={tokenBudget}
                    onChange={(e) => setTokenBudget(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Public Test Input (JSON)
                  </label>
                  <input
                    value={publicInput}
                    onChange={(e) => setPublicInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Public Expected Output (JSON)
                  </label>
                  <input
                    value={publicOutput}
                    onChange={(e) => setPublicOutput(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Debug Test Input (JSON)
                  </label>
                  <input
                    value={debugInput}
                    onChange={(e) => setDebugInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Debug Expected Output (JSON)
                  </label>
                  <input
                    value={debugOutput}
                    onChange={(e) => setDebugOutput(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Challenge
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {challenges.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-800 bg-[#111827] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                    {c.difficulty}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">
                  {c.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {c.time_limit_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-indigo-400" />
                    {formatNumber(c.token_budget)} tokens
                  </span>
                  <span>{c.test_cases?.length ?? 0} test cases</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

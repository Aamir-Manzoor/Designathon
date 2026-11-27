"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  FileSpreadsheet,
  Users,
  Award,
  Sparkles,
  Plus,
  Eye,
  CheckCircle2,
  Loader2,
  DollarSign,
  SlidersHorizontal,
  ShieldCheck,
  Activity,
  Save,
  ArrowLeft,
} from "lucide-react";
import { estimateSessionCostUsd } from "@/lib/engines/ai-provider";
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

interface CalibrationReport {
  status: "CALIBRATED" | "DRIFT_WARNING";
  monotonic_order_valid: boolean;
  all_anchors_in_range: boolean;
  checked_at: string;
  anchors: Array<{
    label: string;
    expected_range: [number, number];
    total_score: number;
    prompt_quality: number;
    prompt_improvement: number;
    test_cases: number;
    debug_tests: number;
    in_range: boolean;
  }>;
}

interface ConcurrencyReport {
  dispatched: number;
  completed: number;
  passed: number;
  total_wall_ms: number;
  max_queue_wait_ms: number;
  p95_latency_ms: number;
  queue_stats: {
    maxConcurrency: number;
    activeWorkers: number;
    pendingJobs: number;
    totalProcessed: number;
  };
  jobs: Array<{
    worker_index: number;
    job_id: string;
    engine: string;
    passed: boolean;
    queue_wait_ms: number;
    runtime_ms: number;
    attempts: number;
  }>;
}

export function AdminConsoleClient({
  sessions,
  challenges,
}: {
  sessions: AdminSessionRow[];
  challenges: AdminChallengeRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "scorecards" | "challenges" | "ops"
  >("scorecards");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [budgetEdits, setBudgetEdits] = useState<
    Record<string, { budget: number; time: number }>
  >(() =>
    Object.fromEntries(
      challenges.map((c) => [
        c.id,
        { budget: c.token_budget, time: c.time_limit_minutes },
      ])
    )
  );
  const [savingBudgetId, setSavingBudgetId] = useState<string | null>(null);

  const [calibrating, setCalibrating] = useState(false);
  const [calibrationReport, setCalibrationReport] =
    useState<CalibrationReport | null>(null);
  const [testingConcurrency, setTestingConcurrency] = useState(false);
  const [concurrencyCount, setConcurrencyCount] = useState(6);
  const [concurrencyReport, setConcurrencyReport] =
    useState<ConcurrencyReport | null>(null);

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
    const cost = estimateSessionCostUsd(s.tokens_used, s.tokens_saved);
    const totalScore = sc ? Number(sc.total_score) : 0;
    const efficiencyIndex =
      s.tokens_used > 0
        ? Number((totalScore / (s.tokens_used / 1000)).toFixed(1))
        : 0;
    return { ...s, sc, cost, efficiencyIndex };
  });

  const scoredSessions = normalizedSessions.filter((s) => s.sc);
  const avgScore =
    scoredSessions.length > 0
      ? scoredSessions.reduce(
          (sum, s) => sum + Number(s.sc?.total_score || 0),
          0
        ) / scoredSessions.length
      : 0;
  const totalCostUsd = normalizedSessions.reduce(
    (sum, s) => sum + s.cost.costUsd,
    0
  );
  const totalSavedUsd = normalizedSessions.reduce(
    (sum, s) => sum + s.cost.savedUsd,
    0
  );
  const totalSavedTokens = normalizedSessions.reduce(
    (sum, s) => sum + s.tokens_saved,
    0
  );

  const barChartData = scoredSessions.slice(0, 8).map((s) => ({
    name: s.candidate_name.split(" ")[0],
    score: Number(s.sc?.total_score || 0),
    budgetPct:
      s.token_budget > 0
        ? Math.round((s.tokens_used / s.token_budget) * 100)
        : 0,
  }));

  const scatterData = scoredSessions.map((s) => ({
    name: s.candidate_name,
    tokens: s.tokens_used,
    score: Number(s.sc?.total_score || 0),
    efficiency: s.efficiencyIndex,
  }));

  async function handleSaveChallengeBudget(challengeId: string) {
    const edit = budgetEdits[challengeId];
    if (!edit) return;
    setSavingBudgetId(challengeId);
    try {
      await fetch(`/api/challenges/${challengeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_budget: edit.budget,
          time_limit_minutes: edit.time,
        }),
      });
      router.refresh();
    } finally {
      setSavingBudgetId(null);
    }
  }

  async function handleRunCalibration() {
    setCalibrating(true);
    try {
      const res = await fetch("/api/admin/calibrate", { method: "POST" });
      if (res.ok) {
        setCalibrationReport((await res.json()) as CalibrationReport);
      }
    } finally {
      setCalibrating(false);
    }
  }

  async function handleRunConcurrencyTest() {
    setTestingConcurrency(true);
    try {
      const res = await fetch("/api/admin/concurrency-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concurrency: concurrencyCount }),
      });
      if (res.ok) {
        setConcurrencyReport((await res.json()) as ConcurrencyReport);
      }
    } finally {
      setTestingConcurrency(false);
    }
  }

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
    <div className="mx-auto max-w-[1600px] px-6 py-7">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Admin &amp; Evaluator Console
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Configure token budgets, analyze correctness vs. AI cost efficiency,
            calibrate rubrics, and export scorecards.
          </p>
        </div>

        <a
          href="/api/export/xlsx"
          className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Scorecards (.xlsx)
        </a>
      </div>

      {/* Expanded KPI Cards */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Evaluated Candidates",
            value: String(normalizedSessions.length),
            sub: `${normalizedSessions.filter((s) => s.is_synthetic).length} benchmark · ${normalizedSessions.filter((s) => !s.is_synthetic).length} live`,
            icon: Users,
            iconBg: "bg-[var(--accent-soft)] border-[var(--accent-border)]",
            color: "text-[var(--accent)]",
          },
          {
            label: "Average Score",
            value: `${avgScore.toFixed(1)} / 100`,
            sub: "Prompt + Tests + Debug",
            icon: Award,
            iconBg: "bg-emerald-500/15 border-emerald-500/30",
            color: "text-emerald-500",
          },
          {
            label: "Total AI Cost (Est.)",
            value: `$${totalCostUsd.toFixed(4)}`,
            sub: `Saved $${totalSavedUsd.toFixed(4)} via optimizer`,
            icon: DollarSign,
            iconBg: "bg-amber-500/15 border-amber-500/30",
            color: "text-amber-500",
          },
          {
            label: "Total Tokens Saved",
            value: formatNumber(totalSavedTokens),
            sub: "Adaptive context reduction",
            icon: Sparkles,
            iconBg: "bg-cyan-500/15 border-cyan-500/30",
            color: "text-cyan-500",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="surface-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {kpi.label}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${kpi.iconBg}`}
              >
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <div className="tabular-nums mt-3 font-mono text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {kpi.value}
            </div>
            <div className="mt-1.5 text-xs text-[var(--text-muted)]">
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Pill-Styled Segmented Tabs */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-1">
          <button
            onClick={() => setActiveTab("scorecards")}
            className={`btn-tactile rounded-lg px-4 py-2 text-xs font-semibold ${
              activeTab === "scorecards"
                ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Scorecards &amp; Cost Analytics ({normalizedSessions.length})
          </button>
          <button
            onClick={() => setActiveTab("challenges")}
            className={`btn-tactile rounded-lg px-4 py-2 text-xs font-semibold ${
              activeTab === "challenges"
                ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Challenges &amp; Token Budgets ({challenges.length})
          </button>
          <button
            onClick={() => setActiveTab("ops")}
            className={`btn-tactile rounded-lg px-4 py-2 text-xs font-semibold ${
              activeTab === "ops"
                ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Calibration &amp; Queue Ops
          </button>
        </div>

        {activeTab === "challenges" && (
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5" />
            New Challenge
          </button>
        )}
      </div>

      {/* TAB 1: SCORECARDS & COST ANALYTICS */}
      {activeTab === "scorecards" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bar Chart */}
            <div className="surface-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Score (/100) vs. Token Budget Used (%)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Compare assessment scores against budget burn rate per candidate.
              </p>
              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--text-muted)"
                      fontSize={11}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={11}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--surface-1)",
                        border: "1px solid var(--border-strong)",
                        color: "var(--text-primary)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      name="Score (/100)"
                      fill="var(--accent)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="budgetPct"
                      name="Budget Used (%)"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scatter Chart */}
            <div className="surface-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Correctness vs. AI Token Efficiency (Scatter)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Top-left quadrant = highest score with lowest token footprint
                (most cost-efficient engineers).
              </p>
              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      type="number"
                      dataKey="tokens"
                      name="Tokens Used"
                      stroke="var(--text-muted)"
                      fontSize={11}
                    />
                    <YAxis
                      type="number"
                      dataKey="score"
                      name="Total Score"
                      domain={[40, 100]}
                      stroke="var(--text-muted)"
                      fontSize={11}
                    />
                    <ZAxis
                      type="number"
                      dataKey="efficiency"
                      range={[70, 260]}
                      name="Pts / 1K Tok"
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        backgroundColor: "var(--surface-1)",
                        border: "1px solid var(--border-strong)",
                        color: "var(--text-primary)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                    />
                    <Scatter
                      name="Candidates"
                      data={scatterData}
                      fill="#06b6d4"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Candidate Scorecards Table */}
          <div className="surface-card overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-3 py-3 text-center">Prompt (40)</th>
                  <th className="px-3 py-3 text-center">Improv (10)</th>
                  <th className="px-3 py-3 text-center">Tests (30)</th>
                  <th className="px-3 py-3 text-center">Debug (20)</th>
                  <th className="px-3 py-3 text-center">Total (100)</th>
                  <th className="px-4 py-3">Tokens (Used / Saved)</th>
                  <th className="px-3 py-3">Est. Cost &amp; Efficiency</th>
                  <th className="px-4 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {normalizedSessions.map((s) => {
                  const pct =
                    s.token_budget > 0
                      ? Math.round((s.tokens_used / s.token_budget) * 100)
                      : 0;
                  return (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-[var(--surface-2)]/60"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {s.candidate_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                          <span>{s.challenge?.title || "—"}</span>
                          {s.is_synthetic && (
                            <span className="rounded border border-[var(--border-subtle)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                              benchmark
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="tabular-nums px-3 py-3 text-center font-mono text-[var(--text-secondary)]">
                        {s.sc ? Number(s.sc.prompt_quality_score).toFixed(1) : "—"}
                      </td>
                      <td className="tabular-nums px-3 py-3 text-center font-mono text-[var(--text-secondary)]">
                        {s.sc
                          ? Number(s.sc.prompt_improvement_score).toFixed(1)
                          : "—"}
                      </td>
                      <td className="tabular-nums px-3 py-3 text-center font-mono text-[var(--text-secondary)]">
                        {s.sc ? Number(s.sc.test_cases_score).toFixed(1) : "—"}
                      </td>
                      <td className="tabular-nums px-3 py-3 text-center font-mono text-[var(--text-secondary)]">
                        {s.sc
                          ? Number(s.sc.debug_test_cases_score).toFixed(1)
                          : "—"}
                      </td>
                      <td className="tabular-nums px-3 py-3 text-center font-mono text-sm font-bold">
                        {s.sc ? (
                          <span
                            className={`rounded-md px-2 py-0.5 ${
                              Number(s.sc.total_score) >= 85
                                ? "bg-emerald-500/15 text-emerald-500"
                                : Number(s.sc.total_score) >= 70
                                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                                : "bg-amber-500/15 text-amber-500"
                            }`}
                          >
                            {Number(s.sc.total_score).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">
                            {s.phase}
                          </span>
                        )}
                      </td>
                      <td className="tabular-nums px-4 py-3 font-mono">
                        <div className="text-[var(--text-primary)]">
                          {formatNumber(s.tokens_used)}{" "}
                          <span
                            className={
                              pct >= 85
                                ? "text-red-500"
                                : pct >= 60
                                ? "text-amber-500"
                                : "text-emerald-500"
                            }
                          >
                            ({pct}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-500">
                          +{formatNumber(s.tokens_saved)} saved
                        </div>
                      </td>
                      <td className="tabular-nums px-3 py-3 font-mono">
                        <div className="text-[var(--text-primary)]">
                          ${s.cost.costUsd.toFixed(5)}
                        </div>
                        <div className="text-[11px] text-cyan-500">
                          {s.efficiencyIndex} pts/1K tok
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/sessions/${s.id}`}
                          className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
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
      )}

      {/* TAB 2: CHALLENGES & CONFIGURABLE TOKEN BUDGETS */}
      {activeTab === "challenges" && (
        <div className="mt-6 space-y-6">
          {showCreateForm && (
            <form
              onSubmit={handleCreateChallenge}
              className="surface-card rounded-2xl border-[var(--accent-border)] p-6"
            >
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Create New AI-Assisted Coding Challenge
              </h3>
              {createError && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                  {createError}
                </div>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Challenge Title
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Distributed Cache Eviction Engine"
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(
                        e.target.value as "Easy" | "Medium" | "Hard"
                      )
                    }
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Problem Statement (Markdown supported)
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe stdin JSON format, expected stdout JSON, and constraints..."
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Token Budget
                  </label>
                  <input
                    type="number"
                    min={1000}
                    max={50000}
                    step={500}
                    value={tokenBudget}
                    onChange={(e) => setTokenBudget(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Public Test Input (JSON)
                  </label>
                  <input
                    value={publicInput}
                    onChange={(e) => setPublicInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Public Expected Output (JSON)
                  </label>
                  <input
                    value={publicOutput}
                    onChange={(e) => setPublicOutput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Debug Test Input (JSON)
                  </label>
                  <input
                    value={debugInput}
                    onChange={(e) => setDebugInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Debug Expected Output (JSON)
                  </label>
                  <input
                    value={debugOutput}
                    onChange={(e) => setDebugOutput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-tactile rounded-xl border border-[var(--border-strong)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Challenge
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {challenges.map((c) => {
              const edit = budgetEdits[c.id] || {
                budget: c.token_budget,
                time: c.time_limit_minutes,
              };
              return (
                <div key={c.id} className="surface-card rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      {c.difficulty}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active · {c.test_cases?.length ?? 0} tests
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-[var(--text-primary)]">
                    {c.title}
                  </h3>

                  <div className="mt-4 space-y-2.5 border-t border-[var(--border-subtle)] pt-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      <SlidersHorizontal className="h-3 w-3 text-[var(--accent)]" />
                      Configure Limits
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)]">
                          Token Budget
                        </label>
                        <input
                          type="number"
                          min={500}
                          step={500}
                          value={edit.budget}
                          onChange={(e) =>
                            setBudgetEdits((prev) => ({
                              ...prev,
                              [c.id]: {
                                ...edit,
                                budget: Number(e.target.value),
                              },
                            }))
                          }
                          className="tabular-nums mt-0.5 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)]">
                          Time (min)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={edit.time}
                          onChange={(e) =>
                            setBudgetEdits((prev) => ({
                              ...prev,
                              [c.id]: {
                                ...edit,
                                time: Number(e.target.value),
                              },
                            }))
                          }
                          className="tabular-nums mt-0.5 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveChallengeBudget(c.id)}
                      disabled={savingBudgetId === c.id}
                      className="btn-tactile inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] py-1.5 text-xs font-semibold text-[var(--accent)] hover:opacity-90 disabled:opacity-60"
                    >
                      {savingBudgetId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save Budget Config
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CALIBRATED RUBRIC CHECKS & QUEUE CONCURRENCY OPS */}
      {activeTab === "ops" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Calibrated Rubric Check */}
          <div className="surface-card rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Calibrated Rubric Verification
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Evaluates 3 gold-standard benchmark anchors to verify monotonic
                  ranking and score-drift tolerance.
                </p>
              </div>
              <button
                onClick={handleRunCalibration}
                disabled={calibrating}
                className="btn-tactile inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60"
              >
                {calibrating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Run Calibration
              </button>
            </div>

            {calibrationReport && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 text-xs">
                  <span className="text-[var(--text-muted)]">
                    Calibration Status
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-semibold ${
                      calibrationReport.status === "CALIBRATED"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-amber-500/15 text-amber-500"
                    }`}
                  >
                    {calibrationReport.status}
                  </span>
                </div>

                {calibrationReport.anchors.map((a) => (
                  <div
                    key={a.label}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {a.label}
                      </span>
                      <span
                        className={`tabular-nums font-mono font-bold ${
                          a.in_range ? "text-emerald-500" : "text-amber-500"
                        }`}
                      >
                        {a.total_score.toFixed(1)} / 100 (target{" "}
                        {a.expected_range[0]}–{a.expected_range[1]})
                      </span>
                    </div>
                    <div className="tabular-nums mt-1 font-mono text-[11px] text-[var(--text-muted)]">
                      PQ: {a.prompt_quality} · PI: {a.prompt_improvement} ·
                      Tests: {a.test_cases} · Debug: {a.debug_tests}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Queue-Based Execution & Concurrency Stress Test */}
          <div className="surface-card rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
                  <Activity className="h-4 w-4 text-cyan-500" />
                  Queue Execution &amp; Concurrency Test
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Dispatches parallel sandbox jobs through the bounded FIFO
                  execution queue (max 3 workers + auto-retry).
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={concurrencyCount}
                  onChange={(e) => setConcurrencyCount(Number(e.target.value))}
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
                >
                  <option value={4}>4 jobs</option>
                  <option value={6}>6 jobs</option>
                  <option value={10}>10 jobs</option>
                </select>
                <button
                  onClick={handleRunConcurrencyTest}
                  disabled={testingConcurrency}
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
                >
                  {testingConcurrency ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Activity className="h-3.5 w-3.5" />
                  )}
                  Run Test
                </button>
              </div>
            </div>

            {concurrencyReport && (
              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-2.5">
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Completed
                    </div>
                    <div className="tabular-nums font-mono text-sm font-bold text-emerald-500">
                      {concurrencyReport.passed}/{concurrencyReport.dispatched}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-2.5">
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Max Queue Wait
                    </div>
                    <div className="tabular-nums font-mono text-sm font-bold text-cyan-500">
                      {concurrencyReport.max_queue_wait_ms}ms
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-2.5">
                    <div className="text-[10px] text-[var(--text-muted)]">
                      P95 Latency
                    </div>
                    <div className="tabular-nums font-mono text-sm font-bold text-[var(--accent)]">
                      {concurrencyReport.p95_latency_ms}ms
                    </div>
                  </div>
                </div>

                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {concurrencyReport.jobs.map((j) => (
                    <div
                      key={j.job_id}
                      className="tabular-nums flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-[11px]"
                    >
                      <span className="text-[var(--text-primary)]">
                        #{j.worker_index} · {j.job_id}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        wait:{j.queue_wait_ms}ms · run:{j.runtime_ms}ms
                      </span>
                      <span
                        className={
                          j.passed
                            ? "font-semibold text-emerald-500"
                            : "font-semibold text-red-500"
                        }
                      >
                        {j.passed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

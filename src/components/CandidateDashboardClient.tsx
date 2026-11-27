"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Gauge,
  Play,
  Code2,
  CheckCircle2,
  Bug,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { Challenge, SupportedLanguage } from "@/types/assessment";
import { formatNumber } from "@/lib/utils";

interface SessionSummary {
  id: string;
  phase: string;
  language: string;
  tokens_used: number;
  token_budget: number;
  started_at: string;
  challenge: { title: string; difficulty: string } | null;
  scorecard: Array<{ total_score: number }> | { total_score: number } | null;
}

export function CandidateDashboardClient({
  challenges,
  sessions,
}: {
  challenges: Challenge[];
  sessions: SessionSummary[];
}) {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<
    Record<string, SupportedLanguage>
  >({});
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function launchChallenge(challengeId: string) {
    setError(null);
    setLaunchingId(challengeId);
    const language = selectedLang[challengeId] || "python";

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not launch session");
        setLaunchingId(null);
        return;
      }
      router.push(`/assess/${data.session.id}`);
    } catch {
      setError("Network error while launching challenge");
      setLaunchingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          AI-Assisted Coding Challenges
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Select a challenge to start a timed assessment with live AI prompting,
          token-budget guidance, controlled bug injection, and explainable
          scoring.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map((ch) => {
          const lang = selectedLang[ch.id] || "python";
          return (
            <div
              key={ch.id}
              className="surface-card flex flex-col justify-between rounded-2xl p-6 transition-colors hover:border-[var(--accent-border)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      ch.difficulty === "Easy"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : ch.difficulty === "Hard"
                        ? "bg-red-500/15 text-red-500"
                        : "bg-amber-500/15 text-amber-500"
                    }`}
                  >
                    {ch.difficulty}
                  </span>
                  <div className="tabular-nums flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {ch.time_limit_minutes}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5 text-[var(--accent)]" />
                      {formatNumber(ch.token_budget)} tok
                    </span>
                  </div>
                </div>

                <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
                  {ch.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--text-muted)]">
                  {ch.description.replace(/[#`*]/g, "")}
                </p>
              </div>

              <div className="mt-6 space-y-3 border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Code2 className="h-3.5 w-3.5" />
                    Language
                  </span>
                  <div className="flex gap-1.5">
                    {(["python", "javascript"] as SupportedLanguage[]).map(
                      (l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() =>
                            setSelectedLang((prev) => ({
                              ...prev,
                              [ch.id]: l,
                            }))
                          }
                          className={`btn-tactile rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                            lang === l
                              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                              : "border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {l}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <button
                  onClick={() => launchChallenge(ch.id)}
                  disabled={launchingId === ch.id}
                  className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60"
                >
                  {launchingId === ch.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Assessment
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Previous Candidate Sessions */}
      {sessions.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
            Your Assessment Sessions
          </h2>
          <div className="surface-card overflow-hidden rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">Challenge</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Tokens Used</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sessions.map((s) => {
                  const sc = Array.isArray(s.scorecard)
                    ? s.scorecard[0]
                    : s.scorecard;
                  return (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-[var(--surface-2)]/60"
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        {s.challenge?.title || "Coding Challenge"}
                      </td>
                      <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">
                        {s.language}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            s.phase === "submitted"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : s.phase === "debugging"
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-[var(--accent-soft)] text-[var(--accent)]"
                          }`}
                        >
                          {s.phase === "submitted" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : s.phase === "debugging" ? (
                            <Bug className="h-3 w-3" />
                          ) : null}
                          {s.phase}
                        </span>
                      </td>
                      <td className="tabular-nums px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                        {formatNumber(s.tokens_used)} /{" "}
                        {formatNumber(s.token_budget)}
                      </td>
                      <td className="tabular-nums px-4 py-3 font-mono text-sm font-bold text-[var(--text-primary)]">
                        {sc
                          ? `${Number(sc.total_score).toFixed(1)} / 100`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/assess/${s.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                        >
                          {s.phase === "submitted"
                            ? "View Scorecard"
                            : "Resume"}
                          <ArrowRight className="h-3.5 w-3.5" />
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
    </div>
  );
}

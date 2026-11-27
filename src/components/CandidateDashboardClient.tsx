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
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Lock,
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
  scorecard:
    | Array<{ total_score: number; score_released?: boolean }>
    | { total_score: number; score_released?: boolean }
    | null;
}

export function CandidateDashboardClient({
  challenges,
  sessions,
  isAssignedScoped = false,
  assignedTrack = null,
}: {
  challenges: Challenge[];
  sessions: SessionSummary[];
  isAssignedScoped?: boolean;
  assignedTrack?: string | null;
}) {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<
    Record<string, SupportedLanguage>
  >({});
  const [briefingChallenge, setBriefingChallenge] = useState<Challenge | null>(
    null
  );
  const [agreedRules, setAgreedRules] = useState(false);
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

  // Dedicated Pre-Test "Start Test" Briefing Screen
  if (briefingChallenge) {
    const lang = selectedLang[briefingChallenge.id] || "python";
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <button
          type="button"
          onClick={() => {
            setBriefingChallenge(null);
            setAgreedRules(false);
          }}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Challenges
        </button>

        <div className="surface-card rounded-2xl p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Assessment Briefing · Ready to Begin
              </span>
              <h1 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)]">
                {briefingChallenge.title}
              </h1>
            </div>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500">
              {briefingChallenge.difficulty}
            </span>
          </div>

          {/* Rules Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Clock className="h-4 w-4 text-[var(--accent)]" />
                Time Limit
              </div>
              <div className="tabular-nums mt-1.5 font-mono text-xl font-bold text-[var(--text-primary)]">
                {briefingChallenge.time_limit_minutes} Minutes
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Gauge className="h-4 w-4 text-emerald-500" />
                AI Token Budget
              </div>
              <div className="tabular-nums mt-1.5 font-mono text-xl font-bold text-[var(--text-primary)]">
                {formatNumber(briefingChallenge.token_budget)} Tokens
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                Evaluation Model
              </div>
              <div className="mt-1.5 font-mono text-sm font-bold text-[var(--text-primary)]">
                40 / 10 / 30 / 20 Rubric
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5 text-xs leading-relaxed text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)]">
              Assessment Guidelines &amp; Integrity Policy
            </div>
            <ul className="ml-4 list-disc space-y-1.5">
              <li>
                <strong>Phase 1 (Prompt &amp; Build):</strong> Prompt the
                integrated AI assistant clearly and concisely to generate code
                and pass all public tests.
              </li>
              <li>
                <strong>Phase 2 (Controlled Bug Injection):</strong> Once your
                initial tests pass, one reproducible bug will be injected.
                Diagnose and fix it using your remaining token budget.
              </li>
              <li>
                <strong>Token Efficiency &amp; Proctoring:</strong> Token usage,
                prompt quality, code revisions, and tab-switch integrity events
                are recorded automatically.
              </li>
              <li>
                <strong>Score Release:</strong> After submission, your work is
                reviewed by an Evaluator and your official score report will be
                released by the Admin via email notification.
              </li>
            </ul>
          </div>

          {/* Language Selector */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Select Language:
              </span>
              {(["python", "javascript"] as SupportedLanguage[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() =>
                    setSelectedLang((prev) => ({
                      ...prev,
                      [briefingChallenge.id]: l,
                    }))
                  }
                  className={`btn-tactile rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                    lang === l
                      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-muted)]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-6 flex cursor-pointer items-center gap-2.5 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={agreedRules}
              onChange={(e) => setAgreedRules(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              I have read the instructions and agree to start the timed
              assessment.
            </span>
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setBriefingChallenge(null);
                setAgreedRules(false);
              }}
              className="btn-tactile rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!agreedRules || launchingId === briefingChallenge.id}
              onClick={() => launchChallenge(briefingChallenge.id)}
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-fg)] shadow-sm hover:opacity-95 disabled:opacity-50"
            >
              {launchingId === briefingChallenge.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Test Now
            </button>
          </div>
        </div>
      </div>
    );
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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {isAssignedScoped
                ? "Your Assigned Coding Challenges"
                : "AI-Assisted Coding Challenges"}
            </h1>
            {isAssignedScoped && (
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent-border)]">
                Assigned{assignedTrack ? ` · ${assignedTrack}` : ""}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Review test instructions, launch your timed workspace, optimize
            token usage, and debug injected bugs.
          </p>
        </div>
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
                  onClick={() => {
                    setBriefingChallenge(ch);
                    setAgreedRules(false);
                  }}
                  className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-95"
                >
                  <Play className="h-4 w-4" />
                  Start Test
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
          <div className="surface-card overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">Challenge</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Tokens Used</th>
                  <th className="px-4 py-3">Score Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sessions.map((s) => {
                  const sc = Array.isArray(s.scorecard)
                    ? s.scorecard[0]
                    : s.scorecard;
                  const isReleased = sc ? Boolean(sc.score_released) : false;
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
                      <td className="tabular-nums px-4 py-3 font-mono text-xs font-bold">
                        {sc ? (
                          isReleased ? (
                            <span className="text-emerald-500">
                              {Number(sc.total_score).toFixed(1)} / 100
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-sans text-[11px] font-semibold text-amber-500">
                              <Lock className="h-3 w-3" />
                              Pending Admin Release
                            </span>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/assess/${s.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                        >
                          {s.phase === "submitted"
                            ? isReleased
                              ? "View Score Report"
                              : "View Status"
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

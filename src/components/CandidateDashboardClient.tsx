"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Gauge,
  Play,
  CheckCircle2,
  Bug,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Lock,
  BookOpen,
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
  const [selectedLang, setSelectedLang] =
    useState<SupportedLanguage>("python");
  const [showInstructions, setShowInstructions] = useState(false);
  const [agreedRules, setAgreedRules] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pick the next assigned/official challenge without revealing its title or statement before start
  const primaryChallenge = challenges[0] || null;
  // Optional warm-up challenge (uses the Easy challenge if available, marked as practice)
  const practiceChallenge =
    challenges.find((c) => c.difficulty === "Easy") || challenges[challenges.length - 1] || null;

  async function launchChallenge(challengeId: string) {
    setError(null);
    setLaunching(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          language: selectedLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not launch assessment");
        setLaunching(false);
        return;
      }
      router.push(`/assess/${data.session.id}`);
    } catch {
      setError("Network error while launching assessment");
      setLaunching(false);
    }
  }

  // Dedicated Pre-Test Instructions Screen (actual problem remains hidden until Begin!)
  if (showInstructions && primaryChallenge) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <button
          type="button"
          onClick={() => {
            setShowInstructions(false);
            setAgreedRules(false);
          }}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Candidate Portal
        </button>

        <div className="surface-card rounded-2xl p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Official Assessment Instructions
              </span>
              <h1 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)]">
                AI-Assisted Coding Assessment
              </h1>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Your challenge statement will be revealed immediately after you
                begin and the countdown timer starts.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500">
              <Lock className="h-3 w-3" />
              Problem Sealed
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Clock className="h-4 w-4 text-[var(--accent)]" />
                Time Limit
              </div>
              <div className="tabular-nums mt-1.5 font-mono text-xl font-bold text-[var(--text-primary)]">
                {primaryChallenge.time_limit_minutes} Minutes
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Gauge className="h-4 w-4 text-emerald-500" />
                AI Token Budget
              </div>
              <div className="tabular-nums mt-1.5 font-mono text-xl font-bold text-[var(--text-primary)]">
                {formatNumber(primaryChallenge.token_budget)} Tokens
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                Evaluation Rubric
              </div>
              <div className="mt-1.5 font-mono text-sm font-bold text-[var(--text-primary)]">
                40 / 10 / 30 / 20 (100 pts)
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5 text-xs leading-relaxed text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)]">
              Important Rules Before You Start
            </div>
            <ul className="ml-4 list-disc space-y-1.5">
              <li>
                <strong>Phase 1 (Prompt &amp; Build):</strong> Prompt the AI
                assistant clearly and concisely to generate code and pass all
                public tests.
              </li>
              <li>
                <strong>Phase 2 (Controlled Bug Injection):</strong> Once your
                initial tests pass, one reproducible bug will be injected.
                Diagnose and fix it efficiently with your remaining token
                budget.
              </li>
              <li>
                <strong>Strict Timer Enforcement:</strong> When the countdown
                timer reaches <code className="font-mono">00:00</code>, the
                assessment window locks automatically and submits your latest
                work.
              </li>
              <li>
                <strong>Proctoring &amp; Score Release:</strong> Tab switches,
                prompt history, and token usage are logged. After submission, an
                Evaluator reviews your work and the Admin releases your official
                score report via email.
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Choose Programming Language:
            </span>
            {(["python", "javascript"] as SupportedLanguage[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setSelectedLang(l)}
                className={`btn-tactile rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize ${
                  selectedLang === l
                    ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-muted)]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <label className="mt-6 flex cursor-pointer items-center gap-2.5 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={agreedRules}
              onChange={(e) => setAgreedRules(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              I have read all instructions and am ready to start my timed
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
                setShowInstructions(false);
                setAgreedRules(false);
              }}
              className="btn-tactile rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!agreedRules || launching}
              onClick={() => launchChallenge(primaryChallenge.id)}
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-fg)] shadow-sm hover:opacity-95 disabled:opacity-50"
            >
              {launching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Begin Timed Assessment
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

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Candidate Assessment Portal
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Actual assessment questions remain sealed until you read the
          instructions and start your timed test.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Sealed Official Assessment + Practice Warm-Up */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Official Sealed Assessment Card */}
        <div className="surface-card flex flex-col justify-between rounded-2xl border-[var(--accent-border)] p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent-border)]">
                <Lock className="h-3.5 w-3.5" />
                Official Timed Assessment
                {isAssignedScoped && assignedTrack ? ` · ${assignedTrack}` : ""}
              </span>
              {primaryChallenge && (
                <div className="tabular-nums flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
                    {primaryChallenge.time_limit_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-emerald-500" />
                    {formatNumber(primaryChallenge.token_budget)} token budget
                  </span>
                </div>
              )}
            </div>

            <h2 className="mt-4 text-2xl font-extrabold text-[var(--text-primary)]">
              AI-Assisted Coding &amp; Debugging Evaluation
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              Includes {challenges.length} sealed challenge module(s) covering
              prompt-driven code generation, automated test validation,
              controlled bug debugging, and token-budget optimization. Problem
              details unlock only after you confirm the instructions.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
            <span className="text-xs text-[var(--text-muted)]">
              Languages supported: <strong>Python 3</strong>,{" "}
              <strong>JavaScript (Node.js)</strong>
            </span>
            <button
              type="button"
              disabled={!primaryChallenge}
              onClick={() => {
                setShowInstructions(true);
                setAgreedRules(false);
              }}
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-fg)] shadow-sm hover:opacity-95 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Review Instructions &amp; Start Test
            </button>
          </div>
        </div>

        {/* Practice / Warm-up Card */}
        <div className="surface-card flex flex-col justify-between rounded-2xl p-7 lg:col-span-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-500">
              <BookOpen className="h-3.5 w-3.5" />
              Practice Warm-Up Sandbox
            </span>
            <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              Familiarize Yourself with the AI IDE
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              Try out the Monaco editor, test runner, Live Token Budget Meter,
              and prompt compression on a short warm-up exercise before starting
              your official timed test.
            </p>
          </div>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
            <button
              type="button"
              disabled={!practiceChallenge || launching}
              onClick={() =>
                practiceChallenge && launchChallenge(practiceChallenge.id)
              }
              className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50"
            >
              {launching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-cyan-500" />
              )}
              Launch Practice Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* Previous Candidate Sessions */}
      {sessions.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
            Your Assessment History
          </h2>
          <div className="surface-card overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">Assessment</th>
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
                        {s.challenge?.title || "Coding Assessment"}
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

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSentMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not process request.");
      } else {
        setSentMsg(data.message);
      }
    } catch {
      setError("Network error requesting password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-canvas)] px-4 py-12 text-[var(--text-primary)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_35%,transparent_100%)]"
      />
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          ← Back to Sign In
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
              <Cpu className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              PromptBench
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-[var(--text-primary)]">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Enter your Candidate or Evaluator email to receive a reset link
          </p>
        </div>

        <div className="surface-card rounded-2xl p-6 sm:p-7">
          {sentMsg ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {sentMsg}
              </p>
              <Link
                href="/login"
                className="btn-tactile inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

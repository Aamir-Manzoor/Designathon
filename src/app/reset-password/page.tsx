"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Cpu,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token. Please request a new password reset link.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not reset password.");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setError("Network error resetting password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface-card rounded-2xl p-6 sm:p-7">
      {done ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Password updated successfully!
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Redirecting you to Sign In...
          </p>
          <Link
            href="/login"
            className="btn-tactile inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
          >
            Sign In Now
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
              New Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
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
                Set New Password
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-canvas)] px-4 py-12 text-[var(--text-primary)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_35%,transparent_100%)]"
      />
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
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Your new password will take effect immediately
          </p>
        </div>

        <Suspense
          fallback={
            <div className="text-center text-xs text-[var(--text-muted)]">
              Loading...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

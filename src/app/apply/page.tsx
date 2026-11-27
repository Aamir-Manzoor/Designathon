"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Cpu,
  User,
  Mail,
  Briefcase,
  Code2,
  Link2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function ApplyPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [track, setTrack] = useState("Backend Engineer");
  const [preferredLanguage, setPreferredLanguage] = useState<
    "python" | "javascript"
  >("python");
  const [githubUrl, setGithubUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          track,
          preferred_language: preferredLanguage,
          github_url: githubUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit application.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error submitting application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-canvas)] px-4 py-12 text-[var(--text-primary)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_35%,transparent_100%)]"
      />
      <div className="absolute left-6 top-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
              <Cpu className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <span className="text-xl font-bold tracking-tight">PromptBench</span>
          </Link>
          <h1 className="text-balance mt-6 text-2xl font-extrabold">
            Candidate Assessment Registration Request
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Submit your details below. An Admin will assign your coding
            challenges and send your personal assessment access link.
          </p>
        </div>

        <div className="surface-card rounded-2xl p-7">
          {submitted ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
                Application Received!
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                Thank you, <strong className="text-[var(--text-primary)]">{fullName}</strong>.
                Your request has been sent to the Assessment Admin. Once your
                challenges are assigned, you will receive your personal access
                link at <span className="font-mono text-[var(--accent)]">{email}</span>.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/"
                  className="btn-tactile rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)]"
                >
                  Back to Home
                </Link>
                <Link
                  href="/login"
                  className="btn-tactile rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)]"
                >
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ananya Rao"
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ananya@example.com"
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Target Track
                  </label>
                  <div className="relative">
                    <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <select
                      value={track}
                      onChange={(e) => setTrack(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                    >
                      <option value="Backend Engineer">Backend Engineer</option>
                      <option value="Full-Stack Engineer">
                        Full-Stack Engineer
                      </option>
                      <option value="AI / ML Engineer">AI / ML Engineer</option>
                      <option value="Systems & SRE">Systems &amp; SRE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Preferred Language
                  </label>
                  <div className="relative">
                    <Code2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <select
                      value={preferredLanguage}
                      onChange={(e) =>
                        setPreferredLanguage(
                          e.target.value as "python" | "javascript"
                        )
                      }
                      className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                    >
                      <option value="python">Python 3</option>
                      <option value="javascript">JavaScript (Node.js)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  GitHub / Portfolio URL (Optional)
                </label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-tactile mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-fg)] shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Request Assessment Access
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

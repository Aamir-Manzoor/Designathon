"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeSwitcher } from "@/components/ThemeProvider";
import {
  Cpu,
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

interface InviteInfo {
  id: string;
  full_name: string;
  email: string;
  track: string;
  preferred_language: string;
  status: string;
  assigned_count: number;
}

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteToken));

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "evaluator" | "admin">(
    "candidate"
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    const supabase = createClient();
    supabase
      .rpc("get_invite_by_token", { p_token: inviteToken })
      .then(({ data, error: rpcErr }) => {
        if (!rpcErr && Array.isArray(data) && data.length > 0) {
          const row = data[0] as InviteInfo;
          setInvite(row);
          setFullName(row.full_name);
          setEmail(row.email);
          setRole("candidate");
        } else {
          setError("This assessment invite link is invalid or has expired.");
        }
        setInviteLoading(false);
      });
  }, [inviteToken]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: invite ? "candidate" : role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        if (inviteToken) {
          await supabase.rpc("claim_candidate_invite", {
            p_token: inviteToken,
          });
        }
        const effectiveRole = invite ? "candidate" : role;
        router.push(
          effectiveRole === "admin" || effectiveRole === "evaluator"
            ? "/admin"
            : "/dashboard"
        );
        router.refresh();
      } else {
        setInfo(
          "Account created! Please check your inbox to verify your email address, then sign in."
        );
        setLoading(false);
      }
    } catch {
      setError("Registration failed. Please try again.");
      setLoading(false);
    }
  }

  return (
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
        <h1 className="text-balance mt-6 text-2xl font-bold text-[var(--text-primary)]">
          {invite ? "Accept Assessment Invitation" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {invite
            ? `Set your password to access your ${invite.assigned_count} assigned challenge(s)`
            : "Choose Candidate to take challenges or Admin / Evaluator to manage assessments"}
        </p>
      </div>

      <div className="surface-card rounded-2xl p-7">
        {inviteLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validating assessment invite link...
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            {invite && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3.5 text-xs text-[var(--text-primary)]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                <div>
                  <div className="font-semibold text-[var(--accent)]">
                    Verified Assessment Invite · {invite.track}
                  </div>
                  <div className="mt-0.5 text-[var(--text-secondary)]">
                    {invite.assigned_count} coding challenge(s) have been
                    assigned to your portal.
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-500">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{info}</span>
              </div>
            )}

            {!invite && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Account Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("candidate")}
                    className={`btn-tactile flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold ${
                      role === "candidate"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("evaluator")}
                    className={`btn-tactile flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold ${
                      role === "evaluator"
                        ? "border-cyan-500 bg-cyan-500/15 text-cyan-500"
                        : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Evaluator
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`btn-tactile flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold ${
                      role === "admin"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </button>
                </div>
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
                  placeholder="Alex Rivera"
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
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
                  readOnly={Boolean(invite)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={`w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] ${
                    invite ? "cursor-not-allowed opacity-75" : ""
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Password (min 6 characters)
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
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-tactile mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {invite ? "Create Account & Enter Portal" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-[var(--border-subtle)] pt-5 text-center text-sm text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
      <div className="absolute right-6 top-6 z-20">
        <ThemeSwitcher />
      </div>

      <Suspense
        fallback={
          <div className="text-sm text-[var(--text-muted)]">Loading...</div>
        }
      >
        <RegisterFormContent />
      </Suspense>
    </div>
  );
}

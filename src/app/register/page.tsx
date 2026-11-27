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
  invite_role: "candidate" | "evaluator";
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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    const supabase = createClient();
    supabase
      .rpc("get_invite_details_by_token", { p_token: inviteToken })
      .then(({ data, error: rpcErr }) => {
        if (!rpcErr && Array.isArray(data) && data.length > 0) {
          const row = data[0] as InviteInfo;
          setInvite(row);
          setFullName(row.full_name);
          setEmail(row.email);
        } else {
          setError(
            "This invitation link is invalid, expired, or has already been used."
          );
        }
        setInviteLoading(false);
      });
  }, [inviteToken]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!invite || !inviteToken) {
      setError("A valid Admin invitation link is required to create an account.");
      return;
    }

    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const targetRole =
        invite.invite_role === "evaluator" ? "evaluator" : "candidate";

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invite.email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: targetRole,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        await supabase.rpc("claim_candidate_invite", {
          p_token: inviteToken,
        });
        router.push(targetRole === "evaluator" ? "/admin" : "/dashboard");
        router.refresh();
      } else {
        setInfo(
          "Account created! Please check your email inbox to confirm your account, then sign in."
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
          {invite
            ? invite.invite_role === "evaluator"
              ? "Accept Evaluator Invitation"
              : "Accept Assessment Invitation"
            : "Invitation Required"}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {invite
            ? invite.invite_role === "evaluator"
              ? "Set your password to access your Evaluator Review Queue"
              : `Set your password to access your ${invite.assigned_count} assigned challenge(s)`
            : "Candidate and Evaluator accounts can only be created via an Admin invitation email."}
        </p>
      </div>

      <div className="surface-card rounded-2xl p-7">
        {inviteLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validating invitation link...
          </div>
        ) : !invite ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30">
              <Lock className="h-6 w-6" />
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-red-500">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Direct account registration is disabled. Candidates must first
              submit an application and use the personal invite link emailed by
              the Admin. Evaluators must use the Evaluator invite link sent by
              the Admin.
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/apply"
                className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
              >
                Apply as a Candidate
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)]"
              >
                Already registered? Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3.5 text-xs text-[var(--text-primary)]">
              {invite.invite_role === "evaluator" ? (
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
              ) : (
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              )}
              <div>
                <div className="font-semibold text-[var(--accent)]">
                  {invite.invite_role === "evaluator"
                    ? "Verified Evaluator Invitation"
                    : `Verified Candidate Invite · ${invite.track}`}
                </div>
                <div className="mt-0.5 text-[var(--text-secondary)]">
                  {invite.invite_role === "evaluator"
                    ? "Your account will be provisioned with Evaluator review access."
                    : `${invite.assigned_count} sealed challenge(s) assigned to your portal.`}
                </div>
              </div>
            </div>

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
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Invited Email Address (Locked)
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  required
                  readOnly
                  value={email}
                  className="w-full cursor-not-allowed rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] opacity-75"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Create Password (min 6 characters)
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
                  Create Account &amp; Enter Portal
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

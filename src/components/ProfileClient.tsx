"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeSwitcher } from "./ThemeProvider";
import {
  ArrowLeft,
  User,
  Shield,
  Mail,
  Eye,
  EyeOff,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
  Gauge,
  Sparkles,
  Calendar,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface ProfileClientProps {
  profile: {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "candidate";
    created_at: string;
  };
  stats: {
    totalSessions: number;
    avgScore: number;
    totalTokensUsed: number;
    totalTokensSaved: number;
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] || "*"}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(5, local.length - 2))}${
    local[local.length - 1]
  }@${domain}`;
}

export function ProfileClient({ profile, stats }: ProfileClientProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [showEmail, setShowEmail] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameMsg({ type: "err", text: data.error || "Update failed" });
      } else {
        setNameMsg({ type: "ok", text: "Profile name updated." });
        router.refresh();
      }
    } catch {
      setNameMsg({ type: "err", text: "Network error updating profile." });
    } finally {
      setSavingName(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(null);
    if (newPassword.length < 6) {
      setPassMsg({
        type: "err",
        text: "Password must be at least 6 characters.",
      });
      return;
    }
    setSavingPass(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        setPassMsg({ type: "err", text: error.message });
      } else {
        setNewPassword("");
        setPassMsg({ type: "ok", text: "Password updated successfully." });
      }
    } catch {
      setPassMsg({ type: "err", text: "Could not update password." });
    } finally {
      setSavingPass(false);
    }
  }

  const initials = (profile.full_name || profile.email || "U")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-5">
        <Link
          href={profile.role === "admin" ? "/admin" : "/dashboard"}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {profile.role === "admin" ? "Evaluator Console" : "Challenges"}
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="surface-card flex flex-col justify-between gap-6 rounded-2xl p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] font-mono text-xl font-extrabold text-[var(--accent)]">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {profile.full_name || "User"}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                  profile.role === "admin"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent-border)]"
                    : "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
                }`}
              >
                {profile.role === "admin" ? (
                  <Shield className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                {profile.role === "admin" ? "Admin / Evaluator" : "Candidate"}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span className="font-mono">
                  {showEmail ? profile.email : maskEmail(profile.email)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmail((v) => !v)}
                  className="ml-1 rounded p-0.5 text-[var(--accent)] hover:bg-[var(--surface-2)]"
                  title={showEmail ? "Hide email" : "Reveal email"}
                >
                  {showEmail ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Joined{" "}
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Theme:
          </span>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Activity Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label:
              profile.role === "admin"
                ? "Cohort Sessions"
                : "Assessment Sessions",
            value: String(stats.totalSessions),
            icon: User,
            color: "text-[var(--accent)]",
          },
          {
            label:
              profile.role === "admin" ? "Cohort Avg Score" : "Average Score",
            value:
              stats.avgScore > 0 ? `${stats.avgScore.toFixed(1)} / 100` : "—",
            icon: Award,
            color: "text-emerald-500",
          },
          {
            label:
              profile.role === "admin"
                ? "Cohort Tokens Used"
                : "Total Tokens Used",
            value: formatNumber(stats.totalTokensUsed),
            icon: Gauge,
            color: "text-amber-500",
          },
          {
            label:
              profile.role === "admin"
                ? "Cohort Tokens Saved"
                : "Tokens Saved",
            value: formatNumber(stats.totalTokensSaved),
            icon: Sparkles,
            color: "text-cyan-500",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="surface-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="tabular-nums mt-2 font-mono text-2xl font-bold text-[var(--text-primary)]">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Settings Forms */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Display Name Form */}
        <form
          onSubmit={handleUpdateName}
          className="surface-card rounded-2xl p-6"
        >
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Profile Details
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Update how your name appears in the workspace and scorecards.
          </p>

          {nameMsg && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs ${
                nameMsg.type === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-red-500/30 bg-red-500/10 text-red-500"
              }`}
            >
              {nameMsg.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{nameMsg.text}</span>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Display Name
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={savingName}
            className="btn-tactile mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60"
          >
            {savingName ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Display Name
          </button>
        </form>

        {/* Security / Change Password Form */}
        <form
          onSubmit={handleUpdatePassword}
          className="surface-card rounded-2xl p-6"
        >
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Security &amp; Password
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Change your account password. Your active session stays signed in.
          </p>

          {passMsg && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs ${
                passMsg.type === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-red-500/30 bg-red-500/10 text-red-500"
              }`}
            >
              {passMsg.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{passMsg.text}</span>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              New Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPass}
            className="btn-tactile mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-60"
          >
            {savingPass ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

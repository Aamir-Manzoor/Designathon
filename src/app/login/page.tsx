"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeSwitcher } from "@/components/ThemeProvider";
import {
  Cpu,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Shield,
  User,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        router.push(profile?.role === "admin" ? "/admin" : "/dashboard");
        router.refresh();
      }
    } catch {
      setError("Unexpected authentication error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-canvas)] px-4 py-12 text-[var(--text-primary)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_35%,transparent_100%)]"
      />
      <div className="absolute right-6 top-6 z-20">
        <ThemeSwitcher />
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
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Authenticated JWT session via Supabase Auth
          </p>
        </div>

        <div className="surface-card rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-slate-700 bg-[#0b1120] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-[#0b1120] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-800 bg-[#0b1120] p-4">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Demo Credentials (Full JWT Auth)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@promptbench.ai");
                  setPassword("Admin@12345");
                  setError(null);
                }}
                className="flex flex-col items-start rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-left transition hover:bg-indigo-500/20"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <Shield className="h-3.5 w-3.5" />
                  Admin / Evaluator
                </span>
                <span className="mt-0.5 truncate text-[10px] text-slate-400">
                  admin@promptbench.ai
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("candidate@promptbench.ai");
                  setPassword("Candidate@12345");
                  setError(null);
                }}
                className="flex flex-col items-start rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-left transition hover:bg-emerald-500/20"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <User className="h-3.5 w-3.5" />
                  Candidate
                </span>
                <span className="mt-0.5 truncate text-[10px] text-slate-400">
                  candidate@promptbench.ai
                </span>
              </button>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-800 pt-5 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-indigo-400 hover:text-indigo-300"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

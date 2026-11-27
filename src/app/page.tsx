import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  Cpu,
  ShieldCheck,
  Gauge,
  Bug,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#0b1120]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/40">
              <Cpu className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tight text-white">
                PromptBench
              </span>
              <span className="ml-2 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300 ring-1 ring-indigo-500/30">
                AI Coding Assessment
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Token-Conscious AI Engineering Evaluation
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Measure how developers{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              guide AI, debug code, and optimize tokens
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-400">
            Move beyond rote syntax tests. PromptBench evaluates prompt craft,
            iterative refinement, controlled bug debugging, and live token
            efficiency — backed by an explainable 100-point rubric and
            exportable evaluator scorecards.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
            >
              Launch Assessment Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Register as Candidate or Evaluator
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Gauge,
              title: "Live Token Budget Meter",
              desc: "Tracks per-turn token usage, context-reduction savings, high-burn warnings, and prompt-efficiency hints in real time.",
              color: "text-emerald-400",
            },
            {
              icon: Bug,
              title: "Controlled Bug Injection",
              desc: "After initial tests pass, injects one reproducible challenge-specific bug to test diagnostic precision and recovery.",
              color: "text-amber-400",
            },
            {
              icon: ShieldCheck,
              title: "Explainable 100-Pt Rubric",
              desc: "Prompt Quality (40), Prompt Improvement (10), Test Cases (30), and Debug Test Cases (20) with turn-level citations.",
              color: "text-indigo-400",
            },
            {
              icon: FileSpreadsheet,
              title: "Evaluator & Excel Analytics",
              desc: "Full prompt/code revision diffs, integrity event logs, candidate comparisons, and formatted multi-sheet .xlsx exports.",
              color: "text-cyan-400",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-800 bg-[#111827] p-6 transition hover:border-slate-700"
            >
              <item.icon className={`h-6 w-6 ${item.color}`} />
              <h3 className="mt-4 text-base font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-slate-800 bg-[#111827]/70 p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Explainable Scoring Breakdown (100 Points)
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Aligned with modern enterprise technical assessment standards.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Prompt Quality", pts: "40 pts" },
                { label: "Prompt Improvement", pts: "10 pts" },
                { label: "Test Cases", pts: "30 pts" },
                { label: "Debug Test Cases", pts: "20 pts" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-slate-800 bg-[#0b1120] px-4 py-3"
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {s.label}
                  </div>
                  <div className="mt-1 text-lg font-bold text-white">
                    {s.pts}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

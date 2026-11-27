"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Cpu,
  ArrowRight,
  Sparkles,
  Gauge,
  Bug,
  Award,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Terminal,
  ShieldCheck,
  Layers,
  Activity,
  ChevronRight,
} from "lucide-react";
import { ThemeSwitcher } from "./ThemeProvider";
import { CursorSpotlight } from "./CursorSpotlight";

const HeroThreeCanvas = dynamic(
  () => import("./HeroThreeCanvas").then((m) => m.HeroThreeCanvas),
  { ssr: false }
);

gsap.registerPlugin(ScrollTrigger);

type PreviewTab = "ide" | "bug" | "scorecard";

export function LandingShowcase({
  signedInRole = null,
}: {
  signedInRole?: "admin" | "evaluator" | "candidate" | null;
}) {
  const [previewTab, setPreviewTab] = useState<PreviewTab>("ide");
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Live Scroll Progress Bar scrubbed across top of viewport
      if (scrollBarRef.current) {
        gsap.to(scrollBarRef.current, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.25,
          },
        });
      }

      // 2. Hero staggered entrance
      gsap.from(".hero-stagger", {
        y: 36,
        opacity: 0,
        duration: 0.85,
        stagger: 0.12,
        ease: "power3.out",
        clearProps: "transform",
      });

      // 3. Hero showcase scrubbed parallax lift on scroll
      gsap.fromTo(
        ".hero-showcase",
        { y: 42, scale: 0.96, opacity: 0 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.95,
          delay: 0.25,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      // 4. Scroll-triggered 5-Stage Workflow cards (scrubbed & replayable feel)
      gsap.from(".workflow-card", {
        y: 44,
        scale: 0.95,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        clearProps: "transform",
        scrollTrigger: {
          trigger: ".workflow-section",
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });

      // 5. Scroll-triggered Bento Grid cards
      gsap.from(".bento-card", {
        y: 50,
        scale: 0.96,
        opacity: 0,
        duration: 0.75,
        stagger: 0.12,
        ease: "power3.out",
        clearProps: "transform",
        scrollTrigger: {
          trigger: ".bento-section",
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-clip bg-[var(--bg-canvas)] text-[var(--text-primary)]"
    >
      {/* Top GSAP Scroll-Scrubbed Progress Bar */}
      <div
        ref={scrollBarRef}
        aria-hidden
        className="fixed inset-x-0 top-0 z-50 h-1 origin-left scale-x-0 bg-gradient-to-r from-[var(--accent)] via-emerald-400 to-cyan-400"
      />
      {/* Cursify-style GPU cursor spotlight & magnetic ring */}
      <CursorSpotlight />

      {/* Three.js 3D Neural Token Constellation behind Hero */}
      <HeroThreeCanvas />

      {/* Subtle ambient hero spotlight & architectural dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-dot-grid [mask-image:radial-gradient(ellipse_75%_65%_at_50%_15%,#000_45%,transparent_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[460px] w-[860px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--glow-a) 0%, var(--glow-b) 35%, transparent 70%)",
        }}
      />

      {/* Sticky Solid-Surface Header (no heavy backdrop-blur over WebGL) */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
              <Cpu className="h-4.5 w-4.5 text-[var(--accent)]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">
                PromptBench
              </span>
              <span className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--text-muted)] sm:inline-block">
                v2.0 · AI Assessment
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            {signedInRole ? (
              <Link
                href={
                  signedInRole === "admin" || signedInRole === "evaluator"
                    ? "/admin"
                    : "/dashboard"
                }
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] shadow-sm hover:opacity-95"
              >
                {signedInRole === "admin"
                  ? "Open Admin Console"
                  : signedInRole === "evaluator"
                  ? "Open Review Queue"
                  : "Open Challenges"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-tactile rounded-lg px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] shadow-sm hover:opacity-95"
                >
                  Launch Portal
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-6 pb-24 pt-16 sm:pt-20">
        {/* HERO SECTION */}
        <section className="mx-auto max-w-4xl text-center">
          <div className="hero-stagger mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
            </span>
            Token-Conscious AI Coding Assessment Platform
          </div>

          <h1 className="hero-stagger text-balance text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-6xl sm:leading-[1.08]">
            Measure how engineers{" "}
            <span className="bg-gradient-to-r from-[var(--accent)] via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              guide AI, debug bugs, and optimize tokens
            </span>
          </h1>

          <p className="hero-stagger text-pretty mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
            Conventional coding tests measure syntax memorization. PromptBench
            evaluates real-world AI-assisted engineering: prompt craft,
            iterative refinement, controlled bug debugging, and live token
            efficiency — scored on an explainable 100-point rubric.
          </p>

          <div className="hero-stagger mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href={
                signedInRole === "admin" || signedInRole === "evaluator"
                  ? "/admin"
                  : signedInRole === "candidate"
                  ? "/dashboard"
                  : "/login"
              }
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-[var(--accent-fg)] shadow-lg hover:opacity-95"
            >
              Launch Assessment Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!signedInRole && (
              <Link
                href="/register"
                className="btn-tactile inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] px-6 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                Create Account
              </Link>
            )}
          </div>

          {/* Key Metric Strip */}
          <div className="hero-stagger mx-auto mt-10 grid max-w-4xl grid-cols-1 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] py-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-6 py-1">
              <div className="tabular-nums whitespace-nowrap font-mono text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                40 / 10 / 30 / 20
              </div>
              <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                Explainable 100-Pt Rubric
              </div>
            </div>
            <div className="px-6 py-1">
              <div className="tabular-nums whitespace-nowrap font-mono text-lg font-bold text-emerald-400 sm:text-xl">
                -45% Tokens
              </div>
              <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                Adaptive Context Savings
              </div>
            </div>
            <div className="px-6 py-1">
              <div className="tabular-nums whitespace-nowrap font-mono text-lg font-bold text-cyan-400 sm:text-xl">
                3-Sheet .XLSX
              </div>
              <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                Audit-Ready Scorecards
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE LIVE PRODUCT PREVIEW WINDOW */}
        <section className="hero-showcase mt-16">
          <div className="surface-card overflow-hidden rounded-2xl p-2">
            {/* Browser Chrome + Interactive View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 hidden font-mono text-[11px] text-[var(--text-muted)] md:inline">
                  promptbench.ai / assess / sliding-window-rate-limiter
                </span>
              </div>

              <div className="flex flex-wrap rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-0.5 text-xs">
                {[
                  { id: "ide" as PreviewTab, label: "1. AI IDE & Token Meter", icon: Terminal },
                  { id: "bug" as PreviewTab, label: "2. Controlled Bug Injection", icon: Bug },
                  { id: "scorecard" as PreviewTab, label: "3. 100-Pt Scorecard", icon: Award },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      previewTab === tab.id
                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Preview Body */}
            <div className="mt-2 rounded-xl border border-[var(--border-subtle)] bg-[#0b0e14] p-5 text-slate-100">
              {previewTab === "ide" && (
                <div className="grid gap-4 lg:grid-cols-12">
                  {/* Mock Code Editor */}
                  <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#0d1117] p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2 text-xs">
                      <span className="font-mono text-slate-300">
                        solution.py · Python 3
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> 3/3 Public Tests
                        Passed · 14ms
                      </span>
                    </div>
                    <pre className="overflow-x-auto font-mono text-xs leading-6 text-slate-200">
                      <code>
                        <span className="text-sky-400">from</span> collections{" "}
                        <span className="text-sky-400">import</span> deque
                        {"\n\n"}
                        <span className="text-amber-300">def</span>{" "}
                        <span className="text-emerald-300">rate_limit</span>
                        (limit: int, window: int, requests: list[int]):
                        {"\n"}
                        {"    "}accepted, out = deque(), []{"\n"}
                        {"    "}
                        <span className="text-sky-400">for</span> t{" "}
                        <span className="text-sky-400">in</span> requests:
                        {"\n"}
                        {"        "}
                        <span className="text-sky-400">while</span> accepted{" "}
                        <span className="text-sky-400">and</span> t -
                        accepted[0] &gt;= window:{"\n"}
                        {"            "}accepted.popleft(){"\n"}
                        {"        "}
                        <span className="text-sky-400">if</span> len(accepted)
                        &lt; limit:{"\n"}
                        {"            "}accepted.append(t); out.append(
                        <span className="text-emerald-300">True</span>){"\n"}
                        {"        "}
                        <span className="text-sky-400">else</span>:{"\n"}
                        {"            "}out.append(
                        <span className="text-rose-300">False</span>){"\n"}
                        {"    "}
                        <span className="text-sky-400">return</span> out
                      </code>
                    </pre>
                  </div>

                  {/* Mock Live Token Meter + Prompt Chat */}
                  <div className="lg:col-span-5 flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-[#11151e] p-4">
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                          <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                          Live Token Budget
                        </span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                          +1,180 saved
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between font-mono text-xs tabular-nums">
                        <span className="font-bold text-emerald-400">
                          4,580 remaining
                        </span>
                        <span className="text-slate-400">
                          1,420 / 6,000 (24%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full w-[24%] rounded-full bg-emerald-500" />
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-slate-100">
                        <div className="mb-1 flex justify-between font-mono text-[10px] text-emerald-300">
                          <span>Turn #1 · Candidate</span>
                          <span>600 tok</span>
                        </div>
                        Implement O(n) sliding window rate_limit with deque.
                        Evict where t - q[0] &gt;= window; count accepted only;
                        handle limit=0.
                      </div>
                      <div className="rounded-lg border border-white/10 bg-[#0b0e14] p-2.5 text-[11px] text-slate-300">
                        <span className="font-semibold text-cyan-400">
                          Adaptive Context Active:
                        </span>{" "}
                        Standard mode · Reusable instructions + code
                        deduplication saved 45% input tokens.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === "bug" && (
                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-7 rounded-xl border border-amber-500/30 bg-[#0d1117] p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2 text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                        <Bug className="h-3.5 w-3.5" />
                        Phase 2 — Controlled Bug Injected (Diff)
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Deterministic AST / Rule Mutator
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                      <div className="px-2 py-0.5 text-slate-400">
                        {"  "}for t in requests:
                      </div>
                      <div className="rounded bg-red-500/15 px-2 py-1 text-red-300">
                        - {"  "}while accepted and t - accepted[0] &gt;= window:
                      </div>
                      <div className="rounded bg-amber-500/15 px-2 py-1 text-amber-200">
                        + {"  "}while accepted and t - accepted[0] &gt; window:
                      </div>
                      <div className="px-2 py-0.5 text-slate-400">
                        {"    "}accepted.popleft()
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-red-300">
                      <XCircle className="h-4 w-4" />
                      DEBUG TEST FAILED: Exact Window Boundary
                    </div>
                    <div className="mt-3 space-y-1.5 break-all font-mono text-[11px]">
                      <div className="text-slate-400">
                        Input: {"{\"limit\":2,\"window\":10,\"requests\":[0,5,10]}"}
                      </div>
                      <div className="text-emerald-300">
                        Expected: [true, true, true]
                      </div>
                      <div className="text-red-300">
                        Actual: [true, true, false]
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-300">
                      Guided Debugging blocks lazy &ldquo;solve this bug&rdquo;
                      prompts — candidates must diagnose the failing boundary
                      condition before receiving a targeted fix.
                    </p>
                  </div>
                </div>
              )}

              {previewTab === "scorecard" && (
                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Aarav Sharma · Strong Hire
                    </div>
                    <div className="tabular-nums mt-2 font-mono text-5xl font-extrabold text-white">
                      92.0
                    </div>
                    <div className="text-xs text-slate-400">out of 100</div>
                    <div className="mt-3 rounded-full bg-black/30 px-3 py-1 font-mono text-[11px] text-emerald-300">
                      1,420 tok · $0.00029 · 64.8 pts/1K tok
                    </div>
                  </div>
                  <div className="lg:col-span-8 grid grid-cols-2 gap-3 text-xs">
                    {[
                      {
                        label: "Prompt Quality",
                        val: "37 / 40",
                        desc: "Cited Turn #1: explicit O(n) deque, limit=0, accepted-only constraints.",
                      },
                      {
                        label: "Prompt Improvement",
                        val: "9 / 10",
                        desc: "Cited Turn #2: isolated failing boundary test t=10 with 1-line fix request.",
                      },
                      {
                        label: "Public + Hidden Tests",
                        val: "30 / 30",
                        desc: "Passed 5/5 automated sandbox test cases via Judge0 CE.",
                      },
                      {
                        label: "Debug Regression Tests",
                        val: "16 / 20",
                        desc: "Resolved injected boundary bug cleanly in 1 debug iteration.",
                      },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className="rounded-xl border border-white/10 bg-[#11151e] p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            {c.label}
                          </span>
                          <span className="tabular-nums font-mono font-bold text-emerald-400">
                            {c.val}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                          {c.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* WHY CONVENTIONAL TESTS FAIL — DIRECT PROBLEM STATEMENT TIE-IN */}
        <section className="mt-20">
          <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                The Assessment Gap
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Why conventional coding tests break in the AI era
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Built to measure coding outcomes and token-conscious AI engineering
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="surface-card rounded-2xl border-rose-500/25 p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500">
                <XCircle className="h-3.5 w-3.5" />
                Conventional Coding Tests
              </div>
              <ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    Rarely measure how effectively developers{" "}
                    <strong className="text-[var(--text-primary)]">
                      guide AI or validate its output
                    </strong>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    Excessive prompting, repeated context, and unnecessary model
                    calls{" "}
                    <strong className="text-[var(--text-primary)]">
                      spike assessment API costs
                    </strong>{" "}
                    without improving code quality.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    Binary pass/fail test results hide whether a candidate can{" "}
                    <strong className="text-[var(--text-primary)]">
                      debug subtle injected regressions
                    </strong>
                    .
                  </span>
                </li>
              </ul>
            </div>

            <div className="surface-card rounded-2xl border-[var(--accent-border)] p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                PromptBench AI Assessment Platform
              </div>
              <ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    Prompt-faithful AI generation +{" "}
                    <strong className="text-[var(--text-primary)]">
                      controlled reproducible bug injection
                    </strong>{" "}
                    and guided debugging.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    Live candidate{" "}
                    <strong className="text-[var(--text-primary)]">
                      Token Budget Meter
                    </strong>
                    , burn warnings, prompt compression, and adaptive context
                    reduction.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    Explainable{" "}
                    <strong className="text-[var(--text-primary)]">
                      100-point rubric
                    </strong>{" "}
                    (40 / 10 / 30 / 20) with turn citations, integrity logs, and
                    3-sheet Excel scorecards.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5-STAGE ASSESSMENT WORKFLOW */}
        <section className="workflow-section mt-20">
          <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                End-to-End Assessment Loop
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Built for real AI-assisted engineering workflows
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Aligned with modern enterprise technical assessment standards
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {[
              { step: "01", title: "Configure", desc: "Set problem, languages, test suites, rubric & token budget." },
              { step: "02", title: "Prompt AI", desc: "Prompt-faithful code generation with live efficiency hints." },
              { step: "03", title: "Run & Refine", desc: "Execute isolated tests and iteratively improve prompts." },
              { step: "04", title: "Debug Bug", desc: "Reproducible bug injected after pass; diagnose & fix." },
              { step: "05", title: "Score & Export", desc: "100-pt explainable scorecard + 3-sheet .xlsx analytics." },
            ].map((item, idx) => (
              <div
                key={item.step}
                className="workflow-card surface-card relative rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[var(--accent)]">
                    {item.step}
                  </span>
                  {idx < 4 && (
                    <ChevronRight className="hidden h-4 w-4 text-[var(--text-muted)] md:block" />
                  )}
                </div>
                <h3 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ASYMMETRIC BENTO FEATURE GRID */}
        <section className="bento-section mt-20 grid gap-5 lg:grid-cols-12">
          {/* Bento 1 (Wide 7) */}
          <div className="bento-card surface-card rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1 lg:col-span-7">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
              <Layers className="h-4 w-4" />
              Adaptive Token Optimization Engine
            </div>
            <h3 className="mt-2 text-xl font-bold">
              Cut assessment AI spend without hurting developer experience
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Automatically shifts context compression across{" "}
              <strong className="text-[var(--text-primary)]">Standard</strong>,{" "}
              <strong className="text-[var(--text-primary)]">Compact</strong>,
              and{" "}
              <strong className="text-[var(--text-primary)]">Ultra-Lean</strong>{" "}
              tiers as token budgets tighten — paired with 1-click prompt
              compression and multi-provider failover.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2.5 text-center font-mono text-xs">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3">
                <div className="text-[10px] text-[var(--text-muted)]">
                  &lt;50% Used
                </div>
                <div className="mt-1 font-bold text-emerald-400">Standard</div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3">
                <div className="text-[10px] text-[var(--text-muted)]">
                  50–80% Used
                </div>
                <div className="mt-1 font-bold text-amber-400">Compact</div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3">
                <div className="text-[10px] text-[var(--text-muted)]">
                  &gt;80% Used
                </div>
                <div className="mt-1 font-bold text-rose-400">Ultra-Lean</div>
              </div>
            </div>
          </div>

          {/* Bento 2 (Narrow 5) */}
          <div className="bento-card surface-card rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1 lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Calibrated 100-Point Rubric
            </div>
            <h3 className="mt-2 text-xl font-bold">
              Transparent, turn-cited scoring
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Every score links directly to candidate prompt turns, test runs,
              and gold-standard rubric calibration checks.
            </p>
            <div className="mt-5 space-y-2.5 text-xs">
              {[
                { label: "Prompt Quality", pts: 40, color: "bg-emerald-500" },
                { label: "Test Cases (Public + Hidden)", pts: 30, color: "bg-cyan-500" },
                { label: "Debug Regression Tests", pts: 20, color: "bg-amber-500" },
                { label: "Prompt Improvement", pts: 10, color: "bg-indigo-500" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="mb-1 flex justify-between font-mono text-[11px]">
                    <span className="text-[var(--text-secondary)]">{r.label}</span>
                    <span className="tabular-nums font-bold">{r.pts} pts</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className={`h-full rounded-full ${r.color}`}
                      style={{ width: `${r.pts * 2.2}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bento 3 (Narrow 5) */}
          <div className="bento-card surface-card rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1 lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Activity className="h-4 w-4" />
              Queue Execution &amp; Auto-Recovery
            </div>
            <h3 className="mt-2 text-xl font-bold">
              Built for live concurrency
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Bounded-concurrency FIFO sandbox queue (Judge0 CE + local
              fallback), automatic retry recovery, integrity event logging, and
              instant local draft recovery on reload.
            </p>
          </div>

          {/* Bento 4 (Wide 7) */}
          <div className="bento-card surface-card rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <FileSpreadsheet className="h-4 w-4" />
                Evaluator Console &amp; Cost-vs-Correctness Analytics
              </div>
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                Benchmark Cohort Analytics
              </span>
            </div>
            <h3 className="mt-2 text-xl font-bold">
              Compare solution accuracy against AI token efficiency
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Spot token-conscious engineers immediately with scatter analytics,
              per-turn audit timelines, and 1-click formatted 3-sheet{" "}
              <code className="font-mono text-xs text-[var(--accent)]">
                .xlsx
              </code>{" "}
              exports.
            </p>
          </div>
        </section>

        {/* BENCHMARK COHORT SPOTLIGHT */}
        <section className="mt-20">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-500">
                Correctness vs. Token Efficiency
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Benchmark Candidate Scorecards
              </h2>
            </div>
            <Link
              href={
                signedInRole === "admin" || signedInRole === "evaluator"
                  ? "/admin"
                  : "/login"
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Open Evaluator Console
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="surface-card overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3.5">Candidate</th>
                  <th className="px-4 py-3.5 text-center">Score (/100)</th>
                  <th className="px-4 py-3.5">Token Burn (of 6,000)</th>
                  <th className="px-4 py-3.5">Tokens Saved</th>
                  <th className="px-5 py-3.5">Evaluation Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[
                  {
                    name: "Aarav Sharma",
                    tag: "Optimal Engineer",
                    score: "92.0",
                    tokens: 1420,
                    pct: 24,
                    saved: "+1,180",
                    note: "Spec-driven Turn #1 + surgical 1-line debug prompt.",
                    tone: "emerald",
                  },
                  {
                    name: "Marcus Chen",
                    tag: "Minimalist",
                    score: "89.0",
                    tokens: 1180,
                    pct: 20,
                    saved: "+890",
                    note: "Lowest token footprint in cohort with fast verification.",
                    tone: "emerald",
                  },
                  {
                    name: "Rohan Verma",
                    tag: "Strong Debugger",
                    score: "86.0",
                    tokens: 2380,
                    pct: 40,
                    saved: "+1,520",
                    note: "High prompt improvement (+9/10) across iterative turns.",
                    tone: "cyan",
                  },
                  {
                    name: "Maya Lin",
                    tag: "High Token Burn",
                    score: "74.0",
                    tokens: 5120,
                    pct: 85,
                    saved: "+2,340",
                    note: "Working code, but pasted full files & triggered 85% warning.",
                    tone: "amber",
                  },
                  {
                    name: "Elena Rostova",
                    tag: "Budget Critical",
                    score: "61.0",
                    tokens: 5540,
                    pct: 92,
                    saved: "+2,610",
                    note: "Vague prompts burned 92% budget and missed boundary debug.",
                    tone: "rose",
                  },
                ].map((c) => (
                  <tr
                    key={c.name}
                    className="transition-colors hover:bg-[var(--surface-2)]/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {c.tag}
                      </div>
                    </td>
                    <td className="tabular-nums px-4 py-3.5 text-center font-mono text-sm font-bold text-[var(--text-primary)]">
                      {c.score}
                    </td>
                    <td className="tabular-nums px-4 py-3.5 font-mono">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className={`h-full rounded-full ${
                              c.pct >= 85
                                ? "bg-rose-500"
                                : c.pct >= 60
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>
                        <span className="text-[var(--text-secondary)]">
                          {c.tokens.toLocaleString()} ({c.pct}%)
                        </span>
                      </div>
                    </td>
                    <td className="tabular-nums px-4 py-3.5 font-mono font-semibold text-emerald-500">
                      {c.saved}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {c.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="mt-20">
          <div className="surface-card flex flex-col items-center justify-between gap-6 rounded-2xl p-8 text-center sm:flex-row sm:text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                <Sparkles className="h-3.5 w-3.5" />
                Get Started
              </div>
              <h2 className="mt-1 text-2xl font-bold">
                Start evaluating AI-assisted engineering today
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Role-based access for Evaluators and Candidates with full
                session analytics.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={
                  signedInRole === "admin"
                    ? "/admin"
                    : signedInRole === "candidate"
                    ? "/dashboard"
                    : "/login"
                }
                className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-95"
              >
                {signedInRole ? "Go to Workspace" : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

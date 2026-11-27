"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Play,
  Send,
  Bug,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  History,
  Sparkles,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  SendHorizonal,
  Maximize2,
  Minimize2,
  RotateCcw,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { MarkdownText } from "./MarkdownText";
import { TokenBudgetMeter } from "./TokenBudgetMeter";
import { ScorecardView } from "./ScorecardView";
import {
  analyzePromptEfficiency,
  type PromptCompressionResult,
} from "@/lib/engines/token-optimizer";
import type { AIProviderId } from "@/lib/engines/ai-provider";
import { formatDuration } from "@/lib/utils";
import type {
  CandidateSession,
  Challenge,
  CodeRevision,
  ExecutionRun,
  PromptTurn,
  Scorecard,
  SingleTestResult,
  TestCase,
} from "@/types/assessment";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0d1117] text-xs text-slate-400">
      Loading Code Editor...
    </div>
  ),
});

interface WorkspaceProps {
  initialSession: CandidateSession;
  challenge: Challenge;
  publicTests: TestCase[];
  initialTurns: PromptTurn[];
  initialRevisions: CodeRevision[];
  initialRuns: ExecutionRun[];
  initialScorecard: Scorecard | null;
}

export function AssessmentWorkspace({
  initialSession,
  challenge,
  publicTests,
  initialTurns,
  initialRevisions,
  initialRuns,
  initialScorecard,
}: WorkspaceProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<CandidateSession>(initialSession);
  const [code, setCode] = useState<string>(initialSession.current_code);
  const [turns, setTurns] = useState<PromptTurn[]>(initialTurns);
  const [revisions, setRevisions] = useState<CodeRevision[]>(initialRevisions);
  const [latestResults, setLatestResults] = useState<SingleTestResult[]>(
    initialRuns[0]?.results ?? []
  );
  const [executorEngine, setExecutorEngine] = useState<string>(
    initialRuns[0]?.executor_engine ?? "judge0"
  );
  const [queueMeta, setQueueMeta] = useState<{
    jobId: string;
    waitMs: number;
    attempts: number;
  } | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(
    initialScorecard
  );

  const [promptInput, setPromptInput] = useState("");
  const [provider, setProvider] = useState<AIProviderId>("auto");
  const [compressing, setCompressing] = useState(false);
  const [compressionPreview, setCompressionPreview] =
    useState<PromptCompressionResult | null>(null);

  const [recoveredDraft, setRecoveredDraft] = useState<string | null>(null);

  const [sendingAI, setSendingAI] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [injectingBug, setInjectingBug] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [readyForBugInjection, setReadyForBugInjection] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "retrying">(
    "saved"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"problem" | "revisions">("problem");
  const [showLeftPane, setShowLeftPane] = useState(true);
  const [showRightPane, setShowRightPane] = useState(true);
  const [expandedPane, setExpandedPane] = useState<
    "none" | "left" | "center" | "right"
  >("none");
  const [mobilePane, setMobilePane] = useState<"left" | "center" | "right">(
    "center"
  );
  const [showExitModal, setShowExitModal] = useState(false);

  // Internal editor-only clipboard tracking (allows copy/paste inside Monaco, blocks external paste)
  const editorInstanceRef = useRef<{
    getSelection?: () => unknown;
    getModel?: () => { getValueInRange?: (sel: unknown) => string } | null;
  } | null>(null);
  const internalClipboardRef = useRef<string>("");
  const [timeExpired, setTimeExpired] = useState<boolean>(
    () =>
      initialSession.phase !== "submitted" &&
      new Date(initialSession.expires_at).getTime() <= Date.now()
  );
  const autoSubmittedRef = useRef(false);
  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(
      0,
      Math.floor(
        (new Date(initialSession.expires_at).getTime() - Date.now()) / 1000
      )
    )
  );

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recoveryKey = `promptbench_recovery_${initialSession.id}`;

  // Automatic Recovery: check for newer unsaved local draft on mount
  useEffect(() => {
    if (initialSession.phase === "submitted") return;
    try {
      const raw = window.localStorage.getItem(recoveryKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { code: string; savedAt: number };
        if (
          parsed.code &&
          parsed.code.trim() !== initialSession.current_code.trim()
        ) {
          setRecoveredDraft(parsed.code);
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, [initialSession.current_code, initialSession.phase, recoveryKey]);

  // Persist instant local recovery buffer on every code change
  useEffect(() => {
    if (session.phase === "submitted") return;
    try {
      window.localStorage.setItem(
        recoveryKey,
        JSON.stringify({ code, savedAt: Date.now() })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [code, recoveryKey, session.phase]);

  // Live pre-send efficiency hints calculated client-side as the candidate types
  const liveHints = useMemo(() => {
    if (!promptInput.trim()) return [];
    return analyzePromptEfficiency({
      userPrompt: promptInput,
      currentCode: code,
      challengeDescription: challenge.description,
      tokensUsed: session.tokens_used,
      tokenBudget: session.token_budget,
      previousTurns: turns,
    });
  }, [
    promptInput,
    code,
    challenge.description,
    session.tokens_used,
    session.token_budget,
    turns,
  ]);

  // Exact wall-clock countdown timer (unaffected by typing/re-renders) with automatic close + auto-submit at 00:00
  useEffect(() => {
    if (session.phase === "submitted") return;
    const expiresAtMs = new Date(session.expires_at).getTime();

    const triggerAutoSubmit = () => {
      setTimeExpired(true);
      if (!autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        fetch(`/api/sessions/${session.id}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeRef.current }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.scorecard) {
              setScorecard(data.scorecard);
              setSession((prev) => ({ ...prev, phase: "submitted" }));
            }
          })
          .catch(() => {});
      }
    };

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        triggerAutoSubmit();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.phase, session.expires_at, session.id]);

  // Debounced autosave with automatic retry on transient failure
  useEffect(() => {
    if (session.phase === "submitted") return;
    if (code === session.current_code) return;
    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sessions/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_code: code }),
        });
        if (!res.ok) throw new Error("Autosave failed");
        setSession((prev) => ({ ...prev, current_code: code }));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("retrying");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [code, session.id, session.phase, session.current_code]);

  // Intercept Browser Back button & tab unload during active official exams
  useEffect(() => {
    if (session.phase === "submitted" || session.is_practice) return;

    window.history.pushState({ officialExamGuard: true }, "", window.location.href);
    const onPopState = () => {
      window.history.pushState({ officialExamGuard: true }, "", window.location.href);
      setShowExitModal(true);
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [session.phase, session.is_practice]);

  // Integrity listener: log tab blur events
  useEffect(() => {
    if (session.phase === "submitted") return;
    function onVisibilityChange() {
      if (document.hidden) {
        fetch(`/api/sessions/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            integrity_event: {
              event_type: "tab_blur",
              metadata: { at: new Date().toISOString() },
            },
          }),
        }).catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [session.id, session.phase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function handleCompressPrompt() {
    if (!promptInput.trim() || compressing) return;
    setCompressing(true);
    try {
      const res = await fetch("/api/ai/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: promptInput,
          current_code: code,
          challenge_description: challenge.description,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as PromptCompressionResult;
        setCompressionPreview(data);
      }
    } finally {
      setCompressing(false);
    }
  }

  async function handleSendPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!promptInput.trim() || sendingAI) return;
    setErrorMsg(null);
    setCompressionPreview(null);
    setSendingAI(true);

    const failedTests = latestResults.filter((r) => !r.passed);
    const latestFeedback =
      failedTests.length > 0
        ? failedTests
            .map(
              (f) =>
                `FAILED ${f.name}: expected=${f.expected_output}, actual=${f.actual_output}${
                  f.stderr ? `, stderr=${f.stderr}` : ""
                }`
            )
            .join("\n")
        : undefined;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          prompt: promptInput.trim(),
          current_code: code,
          latest_test_feedback: latestFeedback,
          provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "AI request failed");
        setSendingAI(false);
        return;
      }

      setTurns((prev) => [...prev, data.turn]);
      setSession((prev) => ({
        ...prev,
        tokens_used: data.tokens_used,
        tokens_saved: data.tokens_saved,
      }));
      setPromptInput("");
    } catch {
      setErrorMsg("Network error sending prompt to AI assistant.");
    } finally {
      setSendingAI(false);
    }
  }

  async function applyAiCode(newCode: string, turnNumber: number) {
    setCode(newCode);
    setSaveStatus("saving");
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_code: newCode,
        revision_source: "ai_apply",
        revision_note: `Applied AI code from Turn #${turnNumber}`,
        integrity_event: {
          event_type: "ai_code_applied",
          metadata: { turn_number: turnNumber, chars: newCode.length },
        },
      }),
    });
    setRevisions((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        session_id: session.id,
        revision_number: prev.length + 1,
        source: "ai_apply",
        code: newCode,
        note: `Applied AI code from Turn #${turnNumber}`,
        created_at: new Date().toISOString(),
      },
    ]);
    setSaveStatus("saved");
  }

  async function handleRunTests() {
    setErrorMsg(null);
    setRunningTests(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Execution failed");
        setRunningTests(false);
        return;
      }
      setLatestResults(data.results || []);
      setExecutorEngine(data.engine || "judge0");
      if (data.queue_job_id) {
        setQueueMeta({
          jobId: data.queue_job_id,
          waitMs: data.queue_wait_ms ?? 0,
          attempts: data.attempts ?? 1,
        });
      }
      setReadyForBugInjection(Boolean(data.ready_for_bug_injection));
    } catch {
      setErrorMsg("Network error executing tests.");
    } finally {
      setRunningTests(false);
    }
  }

  async function handleInjectBug() {
    setErrorMsg(null);
    setInjectingBug(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/inject-bug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Bug injection failed");
        setInjectingBug(false);
        return;
      }
      setCode(data.mutated_code);
      setSession((prev) => ({
        ...prev,
        phase: "debugging",
        current_code: data.mutated_code,
        injected_bug_code: data.mutated_code,
        injected_bug_description: `${data.bug_title}: ${data.bug_hint}`,
      }));
      setLatestResults(data.initial_debug_run?.results || []);
      setReadyForBugInjection(false);
      setRevisions((prev) => [
        ...prev,
        {
          id: `bug-${Date.now()}`,
          session_id: session.id,
          revision_number: prev.length + 1,
          source: "bug_injection",
          code: data.mutated_code,
          note: `Controlled bug injected: ${data.bugTitle || data.bug_title}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      setErrorMsg("Network error injecting bug.");
    } finally {
      setInjectingBug(false);
    }
  }

  async function handleSubmitFinal(redirectAfter = false) {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      let res: Response | null = null;
      let data: { error?: string; scorecard?: Scorecard | null } = {};
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(`/api/sessions/${session.id}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: codeRef.current }),
          });
          data = await res.json().catch(() => ({}));
          if (res.ok) break;
        } catch {
          if (attempt === 1) throw new Error("Network error");
        }
      }

      if (!res || !res.ok) {
        setErrorMsg(data.error || "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }
      try {
        window.localStorage.removeItem(recoveryKey);
      } catch {
        // ignore
      }
      setShowExitModal(false);
      setScorecard(data.scorecard ?? null);
      setSession((prev) => ({ ...prev, phase: "submitted" }));
      if (redirectAfter) {
        router.push("/profile");
      }
    } catch {
      setErrorMsg("Network error submitting assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  // Hard Time's Up Screen (locks & closes workspace when timer hits 00:00)
  if (timeExpired && session.phase !== "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-6 py-10 text-[var(--text-primary)]">
        <div className="surface-card w-full max-w-xl rounded-2xl p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-[var(--text-primary)]">
            Time&apos;s Up — Assessment Closed
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Your allotted time for{" "}
            <strong className="text-[var(--text-primary)]">
              {challenge.title}
            </strong>{" "}
            has ended. Your latest autosaved code and prompt history are being
            submitted automatically for evaluation.
          </p>
          <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4 text-xs text-[var(--text-secondary)]">
            Your official score report will be released soon by the Assessment
            Admin after Evaluator review.
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/profile"
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
            >
              View Profile &amp; Assessment Status
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (session.phase === "submitted") {
    const isPractice = Boolean(session.is_practice);
    const isReleased = Boolean(scorecard?.score_released);
    const isPassed = scorecard?.evaluator_decision === "passed";
    const isRejected = scorecard?.evaluator_decision === "rejected";

    if (isPractice) {
      return (
        <div className="min-h-screen bg-[var(--bg-canvas)] px-4 py-8 text-[var(--text-primary)] sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Candidate Portal
              </Link>
            </div>
            <div className="surface-card rounded-2xl p-8 text-center sm:p-10">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ${
                  isPassed
                    ? "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
                    : "bg-amber-500/15 text-amber-500 ring-amber-500/30"
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <XCircle className="h-8 w-8" />
                )}
              </div>
              <span
                className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider ${
                  isPassed
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-amber-500/15 text-amber-500"
                }`}
              >
                {isPassed ? "Test Passed" : "Test Submitted"}
              </span>
              <h1 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)]">
                {isPassed
                  ? "Practice Test Submitted — Test Passed!"
                  : "Practice Test Submitted"}
              </h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {scorecard?.evaluator_notes ||
                  "Your practice sandbox run has been completed."}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
                >
                  Return to Candidate Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] px-4 py-8 text-[var(--text-primary)] sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile &amp; Assessment Status
            </Link>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  isReleased
                    ? isRejected
                      ? "bg-red-500/15 text-red-500 ring-red-500/30"
                      : "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
                    : "bg-amber-500/15 text-amber-500 ring-amber-500/30"
                }`}
              >
                {isReleased
                  ? isPassed
                    ? "Outcome Released · Passed"
                    : isRejected
                    ? "Outcome Released · Not Selected"
                    : "Feedback Released"
                  : "Submitted · Under Evaluator Review"}
              </span>
            </div>
          </div>

          {isReleased ? (
            <div className="surface-card mx-auto mt-10 max-w-2xl rounded-2xl p-8 sm:p-10">
              <div className="text-center">
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ${
                    isRejected
                      ? "bg-red-500/15 text-red-500 ring-red-500/30"
                      : "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
                  }`}
                >
                  {isRejected ? (
                    <XCircle className="h-8 w-8" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8" />
                  )}
                </div>

                <span
                  className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider ${
                    isRejected
                      ? "bg-red-500/15 text-red-500"
                      : "bg-emerald-500/15 text-emerald-500"
                  }`}
                >
                  {isPassed
                    ? "Passed"
                    : isRejected
                    ? "Not Selected"
                    : "Reviewed"}
                </span>

                <h1 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)]">
                  {isPassed
                    ? "Congratulations — You Passed the Assessment!"
                    : isRejected
                    ? "Assessment Review Complete"
                    : "Your Evaluator Feedback is Ready"}
                </h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Here is your Evaluator&apos;s feedback for{" "}
                  <strong className="text-[var(--text-primary)]">
                    {challenge.title}
                  </strong>
                  .
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Evaluator Feedback
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--text-primary)]">
                  {scorecard?.evaluator_notes?.trim() ||
                    "Thank you for completing the assessment. Our hiring team will follow up with next steps."}
                </p>
              </div>

              <div className="mt-7 flex justify-center">
                <Link
                  href="/profile"
                  className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
                >
                  Return to Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="surface-card mx-auto mt-10 max-w-2xl rounded-2xl p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold text-[var(--text-primary)]">
                Assessment Submitted Successfully
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                Thank you,{" "}
                <strong className="text-[var(--text-primary)]">
                  {session.candidate_name}
                </strong>
                . Your code, prompt history, debugging results, and token usage
                for{" "}
                <strong className="text-[var(--text-primary)]">
                  {challenge.title}
                </strong>{" "}
                have been securely recorded.
              </p>
              <div className="mt-6 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
                <strong className="text-[var(--accent)]">
                  What happens next?
                </strong>{" "}
                An assigned Evaluator will review your submission and submit
                their decision and feedback. Once released by the Admin, you
                will receive an email at{" "}
                <span className="font-mono">{session.candidate_email}</span> and
                can view your feedback in your Profile.
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/profile"
                  className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
                >
                  View Profile &amp; Assessment Status
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const passedCount = latestResults.filter((r) => r.passed).length;
  const visibleLeft =
    expandedPane === "left" || (expandedPane === "none" && showLeftPane);
  const visibleCenter =
    expandedPane === "center" || expandedPane === "none";
  const visibleRight =
    expandedPane === "right" || (expandedPane === "none" && showRightPane);

  const leftSpan = expandedPane === "left" ? "lg:col-span-12" : "lg:col-span-3";
  const rightSpan =
    expandedPane === "right" ? "lg:col-span-12" : "lg:col-span-4";
  const centerSpan =
    expandedPane === "center"
      ? "lg:col-span-12"
      : showLeftPane && showRightPane
      ? "lg:col-span-5"
      : showLeftPane
      ? "lg:col-span-9"
      : showRightPane
      ? "lg:col-span-8"
      : "lg:col-span-12";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] lg:h-[100dvh] lg:overflow-hidden">
      {/* Exit Confirmation Modal for Single-Attempt Official Exams */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="surface-card w-full max-w-md rounded-2xl border border-amber-500/40 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                  Leave &amp; Auto-Submit Test?
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Official assessments can be accessed only once.
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--text-secondary)]">
              If you go back or leave this window,{" "}
              <strong className="text-[var(--text-primary)]">
                your test will be submitted automatically
              </strong>{" "}
              with your current editor code and cannot be reopened.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowExitModal(false)}
                className="btn-tactile rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)]"
              >
                Stay in Assessment
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitFinal(true)}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top IDE Bar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (session.is_practice) {
                router.push("/dashboard");
              } else {
                setShowExitModal(true);
              }
            }}
            className="btn-tactile shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            title={
              session.is_practice
                ? "Back to Practice Portal"
                : "Leave & Submit Official Exam"
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setExpandedPane("none");
              setShowLeftPane((v) => !v);
            }}
            className="btn-tactile hidden shrink-0 rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] lg:inline-flex"
            title={showLeftPane ? "Collapse Problem Pane" : "Expand Problem Pane"}
          >
            {showLeftPane ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold text-[var(--text-primary)]">
                {challenge.title}
              </h1>
              <span className="shrink-0 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[11px] uppercase text-[var(--accent)]">
                {session.language}
              </span>
            </div>
            <div className="mt-0.5 hidden items-center gap-2 text-[11px] sm:flex">
              <span
                className={
                  session.phase === "coding"
                    ? "font-semibold text-[var(--accent)]"
                    : "text-emerald-400"
                }
              >
                1. Build &amp; Pass Tests
              </span>
              <span className="text-[var(--text-muted)]">→</span>
              <span
                className={
                  session.phase === "debugging"
                    ? "font-semibold text-amber-400"
                    : "text-[var(--text-muted)]"
                }
              >
                2. Debug Injected Bug
              </span>
              <span className="text-[var(--text-muted)]">→</span>
              <span className="text-[var(--text-muted)]">3. Explainable Score</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1 text-xs text-[var(--text-muted)] md:flex">
            <Save
              className={`h-3.5 w-3.5 ${
                saveStatus === "retrying"
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            />
            {saveStatus === "saving"
              ? "Autosaving..."
              : saveStatus === "retrying"
              ? "Buffered locally"
              : "Autosaved"}
          </span>

          <div
            className={`tabular-nums flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${
              secondsLeft < 300
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)]"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
            {formatDuration(secondsLeft)}
          </div>

          {session.phase === "coding" && readyForBugInjection && (
            <button
              onClick={handleInjectBug}
              disabled={injectingBug}
              className="btn-tactile inline-flex animate-pulse items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
            >
              {injectingBug ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bug className="h-3.5 w-3.5" />
              )}
              Proceed to Phase 2 (Inject Bug)
            </button>
          )}

          <button
            onClick={() => handleSubmitFinal(false)}
            disabled={submitting}
            className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {submitting ? "Submitting..." : "Submit"}
          </button>

          <button
            type="button"
            onClick={() => {
              setExpandedPane("none");
              setShowRightPane((v) => !v);
            }}
            className="btn-tactile hidden rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] lg:inline-flex"
            title={showRightPane ? "Collapse AI Pane" : "Expand AI Pane"}
          >
            {showRightPane ? (
              <PanelRightClose className="h-3.5 w-3.5" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* Automatic Recovery Banner */}
      {recoveredDraft && (
        <div className="flex shrink-0 items-center justify-between border-b border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-200">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-cyan-400" />
            <span>
              <strong>Automatic Recovery:</strong> Unsaved local code draft
              detected from your previous browser session.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCode(recoveredDraft);
                setRecoveredDraft(null);
              }}
              className="rounded bg-cyan-600 px-2.5 py-1 font-semibold text-white hover:bg-cyan-500"
            >
              Restore Draft
            </button>
            <button
              onClick={() => {
                setRecoveredDraft(null);
                window.localStorage.removeItem(recoveryKey);
              }}
              className="rounded border border-cyan-500/40 px-2 py-1 text-cyan-300 hover:bg-cyan-500/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Bug Injection Alert Banner */}
      {session.phase === "debugging" && (
        <div className="flex shrink-0 items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Phase 2 — Controlled Bug Injected:</strong> A reproducible
              bug has been introduced into your editor code. Inspect the failing
              debug test below, fix the bug efficiently with your remaining
              token budget, and submit!
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Mobile / Tablet Quick Pane Switcher (< lg) */}
      <div className="grid shrink-0 grid-cols-3 border-b border-[var(--border-subtle)] bg-[var(--surface-2)] p-1 text-xs font-semibold lg:hidden">
        {[
          { id: "left" as const, label: "Question & Tests" },
          { id: "center" as const, label: "Code Editor" },
          { id: "right" as const, label: "AI & Tokens" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobilePane(tab.id)}
            className={`rounded-lg py-2 text-center transition-colors ${
              mobilePane === tab.id
                ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Collapsible 3-Pane IDE */}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-12">
        {/* LEFT PANE */}
        {visibleLeft && (
        <aside
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          className={`${
            mobilePane === "left" ? "flex" : "hidden lg:flex"
          } ${leftSpan} min-h-0 min-w-0 flex-1 select-none flex-col border-b border-[var(--border-subtle)] bg-[var(--surface-1)] lg:border-b-0 lg:border-r`}
        >
          <div className="flex items-center border-b border-[var(--border-subtle)] text-xs font-medium">
            <button
              onClick={() => setLeftTab("problem")}
              className={`flex-1 py-2.5 text-center transition-colors ${
                leftTab === "problem"
                  ? "border-b-2 border-[var(--accent)] font-semibold text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Problem &amp; Tests
            </button>
            <button
              onClick={() => setLeftTab("revisions")}
              className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-center transition-colors ${
                leftTab === "revisions"
                  ? "border-b-2 border-[var(--accent)] font-semibold text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Revisions ({revisions.length})
            </button>
            <button
              type="button"
              onClick={() =>
                setExpandedPane((p) => (p === "left" ? "none" : "left"))
              }
              className="btn-tactile mr-2 hidden rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] lg:inline-flex"
              title={
                expandedPane === "left"
                  ? "Restore Split View"
                  : "Expand Question Panel"
              }
            >
              {expandedPane === "left" ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {leftTab === "problem" ? (
              <div className="space-y-5">
                <MarkdownText
                  content={challenge.description}
                  className="text-xs"
                />

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Public Test Cases ({publicTests.length})
                  </h3>
                  <div className="space-y-2.5">
                    {publicTests.map((tc) => (
                      <div
                        key={tc.id}
                        className="min-w-0 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-2.5 font-mono text-[11px]"
                      >
                        <div className="font-sans font-semibold text-[var(--text-primary)]">
                          {tc.name}
                        </div>
                        <div className="mt-1 break-all text-[var(--text-secondary)]">
                          <span className="text-[var(--text-muted)]">in:</span>{" "}
                          {tc.input}
                        </div>
                        <div className="mt-0.5 break-all text-emerald-500">
                          <span className="text-[var(--text-muted)]">out:</span>{" "}
                          {tc.expected_output}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Rev #{rev.revision_number}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          rev.source === "bug_injection"
                            ? "bg-amber-500/20 text-amber-500"
                            : rev.source === "ai_apply"
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-[var(--surface-1)] text-[var(--text-muted)]"
                        }`}
                      >
                        {rev.source}
                      </span>
                    </div>
                    {rev.note && (
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {rev.note}
                      </p>
                    )}
                    <button
                      onClick={() => setCode(rev.code)}
                      className="mt-2 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                    >
                      Restore to editor
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        )}

        {/* CENTER PANE */}
        {visibleCenter && (
        <section
          className={`${
            mobilePane === "center" ? "flex" : "hidden lg:flex"
          } ${centerSpan} min-h-[520px] min-w-0 flex-1 flex-col border-b border-[var(--border-subtle)] lg:min-h-0 lg:border-b-0 lg:border-r`}
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2">
            <span className="font-mono text-xs text-[var(--text-secondary)]">
              solution.{session.language === "python" ? "py" : "js"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setExpandedPane((p) => (p === "center" ? "none" : "center"))
                }
                className="btn-tactile hidden items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] lg:inline-flex"
                title={
                  expandedPane === "center"
                    ? "Exit Full Screen Editor"
                    : "Full Screen Code Editor (Collapse Side Panels)"
                }
              >
                {expandedPane === "center" ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={handleRunTests}
                disabled={runningTests}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60"
              >
                {runningTests ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Run Tests
              </button>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 bg-[var(--surface-1)]"
            onCopyCapture={() => {
              const ed = editorInstanceRef.current;
              const sel = ed?.getSelection?.();
              const modelText =
                sel !== null && sel !== undefined
                  ? ed?.getModel?.()?.getValueInRange?.(sel) ?? ""
                  : "";
              const selected =
                modelText || window.getSelection()?.toString() || "";
              if (selected) {
                internalClipboardRef.current = selected;
              }
            }}
            onCutCapture={() => {
              const ed = editorInstanceRef.current;
              const sel = ed?.getSelection?.();
              const modelText =
                sel !== null && sel !== undefined
                  ? ed?.getModel?.()?.getValueInRange?.(sel) ?? ""
                  : "";
              const selected =
                modelText || window.getSelection()?.toString() || "";
              if (selected) {
                internalClipboardRef.current = selected;
              }
            }}
            onPasteCapture={(e) => {
              const pasted = e.clipboardData?.getData("text/plain") ?? "";
              const norm = (s: string) => s.replace(/\r\n/g, "\n");
              if (
                !internalClipboardRef.current ||
                norm(pasted) !== norm(internalClipboardRef.current)
              ) {
                e.preventDefault();
                e.stopPropagation();
                setErrorMsg(
                  "External paste blocked: you may only copy and paste code written within this code editor."
                );
              }
            }}
          >
            <MonacoEditor
              height="100%"
              language={session.language}
              theme={theme === "light" ? "light" : "vs-dark"}
              value={code}
              onMount={(editor) => {
                editorInstanceRef.current = editor as unknown as typeof editorInstanceRef.current;
              }}
              onChange={(val) => {
                setCode(val ?? "");
                if (readyForBugInjection) setReadyForBugInjection(false);
              }}
              options={{
                fontSize: 14,
                lineHeight: 22,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 14 },
                automaticLayout: true,
                contextmenu: false,
              }}
            />
          </div>

          {/* Bottom Execution Console */}
          <div className="h-56 shrink-0 overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--surface-1)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                Test Execution Results
                {latestResults.length > 0 && (
                  <span
                    className={`tabular-nums rounded-full px-2 py-0.5 text-[11px] ${
                      passedCount === latestResults.length
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-amber-500/15 text-amber-500"
                    }`}
                  >
                    {passedCount} / {latestResults.length} Passed
                  </span>
                )}
              </div>
              <span className="tabular-nums font-mono text-[10px] text-[var(--text-muted)]">
                Engine: {executorEngine}
                {queueMeta
                  ? ` · Queue wait: ${queueMeta.waitMs}ms · ${queueMeta.jobId}`
                  : ""}
              </span>
            </div>

            {latestResults.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Click &ldquo;Run Tests&rdquo; to enqueue isolated sandbox
                execution.
              </p>
            ) : (
              <div className="space-y-2">
                {latestResults.map((r) => (
                  <div
                    key={r.test_case_id}
                    className={`rounded-xl border p-2.5 text-xs ${
                      r.passed
                        ? "border-emerald-500/25 bg-emerald-500/5"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                        {r.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        {r.name}
                        {r.visibility === "debug" && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-500">
                            DEBUG TEST
                          </span>
                        )}
                      </div>
                      <span className="tabular-nums font-mono text-[10px] text-[var(--text-muted)]">
                        {r.status} · {r.runtime_ms}ms
                      </span>
                    </div>
                    {!r.passed && (
                      <div className="mt-1.5 space-y-0.5 break-all font-mono text-[11px]">
                        <div className="text-emerald-500">
                          Expected: {r.expected_output}
                        </div>
                        <div className="text-red-500">
                          Actual: {r.actual_output || "(empty)"}
                        </div>
                        {r.stderr && (
                          <div className="text-amber-500">
                            Stderr: {r.stderr}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        )}

        {/* RIGHT PANE: Token Meter + Multi-Provider AI Chat + Compression */}
        {visibleRight && (
        <aside
          className={`${
            mobilePane === "right" ? "flex" : "hidden lg:flex"
          } ${rightSpan} min-h-[480px] min-w-0 flex-1 flex-col bg-[var(--surface-1)] lg:min-h-0`}
        >
          <TokenBudgetMeter
            tokensUsed={session.tokens_used}
            tokenBudget={session.token_budget}
            tokensSaved={session.tokens_saved}
            turns={turns}
            liveHints={liveHints}
          />

          {/* Multi-Provider Switcher + Expand Bar */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-1.5 text-[11px]">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <Cpu className="h-3 w-3 text-[var(--accent)]" />
              AI Provider
            </span>
            <div className="flex items-center gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AIProviderId)}
                className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-1)] px-2 py-0.5 text-[11px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="auto">Auto (Gemini → Failover)</option>
                <option value="gemini">Google Gemini (Flash-Lite)</option>
                <option value="groq">Groq (Llama 3.3 70B)</option>
                <option value="openrouter">OpenRouter (Qwen Coder)</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setExpandedPane((p) => (p === "right" ? "none" : "right"))
                }
                className="btn-tactile hidden rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] lg:inline-flex"
                title={
                  expandedPane === "right"
                    ? "Restore Split View"
                    : "Expand AI Assistant Panel"
                }
              >
                {expandedPane === "right" ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Chat Transcript (copy outside editor disabled) */}
          <div
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            className="flex-1 select-none space-y-3 overflow-y-auto p-3.5"
          >
            {turns.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] p-4 text-center text-xs text-[var(--text-muted)]">
                <Sparkles className="mx-auto mb-2 h-5 w-5 text-[var(--accent)]" />
                <p className="font-semibold text-[var(--text-primary)]">
                  AI Coding Assistant Ready
                </p>
                <p className="mt-1 leading-relaxed">
                  Adaptive context-window management is active. Prompt concisely
                  or use <strong>Compress Prompt</strong> before sending to save
                  tokens.
                </p>
              </div>
            )}

            {turns.map((turn) => (
              <div key={turn.id} className="min-w-0 space-y-2">
                <div className="ml-4 min-w-0 overflow-hidden rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3 text-xs text-[var(--text-primary)] sm:ml-6">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-[10px] font-medium text-[var(--accent)]">
                    <span>Turn #{turn.turn_number} · You</span>
                    <span className="tabular-nums font-mono">
                      {turn.prompt_tokens + turn.completion_tokens} tok
                      {turn.tokens_saved > 0
                        ? ` · saved ${turn.tokens_saved}`
                        : ""}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {turn.user_prompt}
                  </p>
                </div>

                <div className="mr-2 min-w-0 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-primary)] sm:mr-4">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-[var(--text-muted)]">
                    <span className="font-semibold text-emerald-400">
                      AI Assistant
                    </span>
                    <span className="tabular-nums font-mono">
                      in:{turn.prompt_tokens} / out:{turn.completion_tokens}
                    </span>
                  </div>
                  <MarkdownText
                    content={
                      turn.ai_response.replace(/```[\s\S]*?```/g, "").trim() ||
                      "Generated updated code below:"
                    }
                    className="break-words text-xs"
                  />
                  {turn.extracted_code && (
                    <div
                      onCopy={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                      className="mt-2.5 select-none overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)]"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-1.5">
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">
                          {session.language} suggestion (copy disabled)
                        </span>
                      </div>
                      <pre className="max-h-48 overflow-auto p-2.5 font-mono text-[11px] leading-relaxed text-[var(--text-primary)]">
                        <code>{turn.extracted_code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Compression Suggestion Preview */}
          {compressionPreview && (
            <div className="mx-3 mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px]">
              <div className="flex items-center justify-between font-semibold text-emerald-300">
                <span>
                  Compressed: {compressionPreview.originalTokens} →{" "}
                  {compressionPreview.compressedTokens} tok (saved{" "}
                  {compressionPreview.tokensSaved})
                </span>
                <button
                  type="button"
                  onClick={() => setCompressionPreview(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-slate-200">
                {compressionPreview.compressed}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] text-emerald-400">
                  {compressionPreview.techniquesApplied.join(" · ")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPromptInput(compressionPreview.compressed);
                    setCompressionPreview(null);
                  }}
                  className="rounded bg-emerald-600 px-2 py-0.5 font-semibold text-white hover:bg-emerald-500"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Prompt Composer */}
          <form
            onSubmit={handleSendPrompt}
            className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-2)] p-3"
          >
            {promptInput.trim().length > 35 && (
              <div className="mb-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleCompressPrompt}
                  disabled={compressing}
                  className="btn-tactile inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500 hover:bg-emerald-500/20"
                >
                  {compressing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Minimize2 className="h-3 w-3" />
                  )}
                  Compress Prompt
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={promptInput}
                onChange={(e) => {
                  setPromptInput(e.target.value);
                  if (compressionPreview) setCompressionPreview(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt(e);
                  }
                }}
                placeholder={
                  session.phase === "debugging"
                    ? "Describe the failing debug test and ask for a targeted fix..."
                    : "Write a clear, token-conscious prompt (Enter to send)..."
                }
                className="flex-1 resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-2.5 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none sm:text-xs"
              />
              <button
                type="submit"
                disabled={sendingAI || !promptInput.trim()}
                className="btn-tactile flex items-center justify-center rounded-xl bg-[var(--accent)] px-3.5 text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-50"
              >
                {sendingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </aside>
        )}
      </div>
    </div>
  );
}

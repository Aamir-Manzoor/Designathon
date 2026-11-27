"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Lock,
} from "lucide-react";

export function EvaluatorNotesCard({
  sessionId,
  initialNotes,
  initialDecision = null,
  initialReviewedAt = null,
}: {
  sessionId: string;
  initialNotes: string | null;
  initialDecision?: "passed" | "rejected" | null;
  initialReviewedAt?: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || "");
  const [decision, setDecision] = useState<"passed" | "rejected" | null>(
    initialDecision
  );
  const [locked, setLocked] = useState<boolean>(
    Boolean(initialDecision && initialNotes?.trim())
  );
  const [reviewedAt, setReviewedAt] = useState<string | null>(
    initialReviewedAt
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitEvaluation(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    setError(null);

    if (!decision) {
      setError("Please select Pass or Reject before submitting.");
      return;
    }
    if (notes.trim().length < 5) {
      setError("Please provide written evaluator feedback for the candidate.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/scorecards/${sessionId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluator_notes: notes.trim(),
          evaluator_decision: decision,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit evaluation");
      } else {
        setLocked(true);
        setReviewedAt(
          data.scorecard?.evaluator_reviewed_at || new Date().toISOString()
        );
        router.refresh();
      }
    } catch {
      setError("Network error submitting evaluation");
    } finally {
      setSubmitting(false);
    }
  }

  // View-only card once Evaluator has submitted feedback
  if (locked) {
    return (
      <div className="surface-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Submitted Evaluator Feedback
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              <Lock className="h-3 w-3" />
              View Only
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reviewedAt && (
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                Submitted{" "}
                {new Date(reviewedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                decision === "passed"
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-red-500/15 text-red-500"
              }`}
            >
              {decision === "passed" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {decision === "passed" ? "Passed" : "Rejected"}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Candidate-Facing Feedback
          </div>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--text-primary)]">
            {notes}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmitEvaluation}
      className="surface-card rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <ClipboardCheck className="h-4 w-4 text-[var(--accent)]" />
            Evaluator Decision &amp; Candidate Feedback (One-Time Submit)
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Select Pass or Reject and write feedback. Once submitted, this
            evaluation locks into view-only mode and notifies the Admin for
            release.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setDecision("passed")}
          className={`btn-tactile inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${
            decision === "passed"
              ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
              : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-emerald-500/60"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Pass Candidate
        </button>
        <button
          type="button"
          onClick={() => setDecision("rejected")}
          className={`btn-tactile inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${
            decision === "rejected"
              ? "border-red-500 bg-red-600 text-white shadow-sm"
              : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-red-500/60"
          }`}
        >
          <XCircle className="h-4 w-4" />
          Reject Candidate
        </button>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Candidate-Facing Evaluator Feedback
        </label>
        <textarea
          rows={3}
          required
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write clear, constructive feedback (can only be submitted once)..."
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !decision}
          className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Submit Final Evaluation
        </button>
      </div>
    </form>
  );
}

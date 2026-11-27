"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Save,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export function EvaluatorNotesCard({
  sessionId,
  initialNotes,
  initialScore,
  initialReleased = false,
}: {
  sessionId: string;
  initialNotes: string | null;
  initialScore?: number;
  initialReleased?: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || "");
  const [scoreInput, setScoreInput] = useState(
    typeof initialScore === "number" ? String(initialScore) : ""
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [released, setReleased] = useState(initialReleased);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveEvaluation(submitAndNotify: boolean) {
    setError(null);
    setStatusMsg(null);
    if (submitAndNotify) setSubmitting(true);
    else setSaving(true);

    const parsedScore =
      scoreInput.trim() !== "" ? Number(scoreInput.trim()) : undefined;
    if (
      parsedScore !== undefined &&
      (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)
    ) {
      setError("Final score must be a number between 0 and 100.");
      setSaving(false);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/scorecards/${sessionId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluator_notes: notes,
          total_score: parsedScore,
          submit_and_notify: submitAndNotify,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save evaluation");
      } else {
        if (submitAndNotify) {
          setReleased(true);
          setStatusMsg(
            `Evaluation submitted & candidate notified via email (${
              data.delivery_status || "dispatched"
            }).`
          );
          router.refresh();
        } else {
          setStatusMsg("Draft review notes saved to scorecard.");
        }
      }
    } catch {
      setError("Network error saving evaluation");
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  return (
    <div className="surface-card rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
          <ClipboardCheck className="h-4 w-4 text-[var(--accent)]" />
          Evaluator Score &amp; Review Sign-Off
        </h2>
        {released && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Evaluated &amp; Candidate Notified
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
          {error}
        </div>
      )}

      {statusMsg && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-medium text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Final Score (/ 100)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={scoreInput}
            onChange={(e) => setScoreInput(e.target.value)}
            className="tabular-nums w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2.5 font-mono text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Evaluator Review Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add qualitative review feedback, hiring recommendation, or notes on prompt discipline and debugging..."
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2.5">
        <button
          type="button"
          onClick={() => saveEvaluation(false)}
          disabled={saving || submitting}
          className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Draft Notes
        </button>
        <button
          type="button"
          onClick={() => saveEvaluation(true)}
          disabled={saving || submitting}
          className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {released
            ? "Update Score & Re-Email Candidate"
            : "Submit Score & Email Candidate"}
        </button>
      </div>
    </div>
  );
}

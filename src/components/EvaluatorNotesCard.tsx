"use client";

import { useState } from "react";
import { ClipboardCheck, Save, CheckCircle2, Loader2 } from "lucide-react";

export function EvaluatorNotesCard({
  sessionId,
  initialNotes,
}: {
  sessionId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/scorecards/${sessionId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluator_notes: notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save review notes");
      } else {
        setSaved(true);
      }
    } catch {
      setError("Network error saving review notes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="surface-card rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
          <ClipboardCheck className="h-4 w-4 text-[var(--accent)]" />
          Evaluator Review Notes &amp; Sign-Off
        </h2>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved to scorecard
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
          {error}
        </div>
      )}

      <textarea
        rows={3}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          if (saved) setSaved(false);
        }}
        placeholder="Add qualitative review feedback, hiring recommendation, or notes on prompt discipline and debugging..."
        className="mt-3 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-1)] focus:outline-none"
      />

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Review Notes
        </button>
      </div>
    </form>
  );
}

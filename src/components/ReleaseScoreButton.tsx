"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send, Loader2, Lock } from "lucide-react";

export function ReleaseScoreButton({
  sessionId,
  initialReleased,
  evaluatorReady = false,
  evaluatorDecision = null,
  compact = false,
}: {
  sessionId: string;
  initialReleased: boolean;
  evaluatorReady?: boolean;
  evaluatorDecision?: "passed" | "rejected" | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [released, setReleased] = useState(initialReleased);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleRelease() {
    if (!evaluatorReady) return;
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await fetch(`/api/scorecards/${sessionId}/release`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReleased(true);
        router.refresh();
      } else {
        setErrMsg(data.error || "Could not release report");
      }
    } finally {
      setLoading(false);
    }
  }

  if (released) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
        <CheckCircle2 className="h-3 w-3" />
        Released{evaluatorDecision ? ` · ${evaluatorDecision}` : ""}
      </span>
    );
  }

  if (!evaluatorReady) {
    return (
      <span
        title="Admin can release only after the Evaluator submits Pass/Reject and feedback"
        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500"
      >
        <Lock className="h-3 w-3" />
        Awaiting Evaluator
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRelease}
        disabled={loading}
        className={`btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 ${
          compact ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-xs"
        }`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Send className="h-3 w-3" />
        )}
        Release Report
      </button>
      {errMsg && <span className="text-[10px] text-red-500">{errMsg}</span>}
    </div>
  );
}

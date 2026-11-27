"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send, Loader2 } from "lucide-react";

export function ReleaseScoreButton({
  sessionId,
  initialReleased,
  compact = false,
}: {
  sessionId: string;
  initialReleased: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [released, setReleased] = useState(initialReleased);
  const [loading, setLoading] = useState(false);

  async function handleRelease() {
    setLoading(true);
    try {
      const res = await fetch(`/api/scorecards/${sessionId}/release`, {
        method: "POST",
      });
      if (res.ok) {
        setReleased(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (released) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
        <CheckCircle2 className="h-3 w-3" />
        Released
      </span>
    );
  }

  return (
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
      Release Score
    </button>
  );
}

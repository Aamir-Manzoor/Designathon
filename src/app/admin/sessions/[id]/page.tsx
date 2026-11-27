import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { ScorecardView } from "@/components/ScorecardView";
import { ArrowLeft, ShieldAlert, MessageSquare, Code2 } from "lucide-react";
import type {
  CodeRevision,
  IntegrityEvent,
  PromptTurn,
  Scorecard,
} from "@/types/assessment";
import { formatNumber } from "@/lib/utils";

export default async function AdminSessionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: session } = await supabase
    .from("candidate_sessions")
    .select("*, challenge:challenges(title, difficulty)")
    .eq("id", id)
    .single();

  if (!session) notFound();

  const [
    { data: scorecard },
    { data: turns },
    { data: revisions },
    { data: integrityEvents },
  ] = await Promise.all([
    supabase.from("scorecards").select("*").eq("session_id", id).maybeSingle(),
    supabase
      .from("prompt_turns")
      .select("*")
      .eq("session_id", id)
      .order("turn_number", { ascending: true }),
    supabase
      .from("code_revisions")
      .select("*")
      .eq("session_id", id)
      .order("revision_number", { ascending: true }),
    supabase
      .from("integrity_events")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Navbar
        userName={profile?.full_name || "Admin"}
        userEmail={profile?.email || user.email || ""}
        role="admin"
      />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Evaluator Console
          </Link>
          <div className="font-mono text-xs text-slate-400">
            Tokens: {formatNumber(session.tokens_used)} /{" "}
            {formatNumber(session.token_budget)} · Saved:{" "}
            <span className="text-emerald-400">
              {formatNumber(session.tokens_saved)}
            </span>
          </div>
        </div>

        {scorecard ? (
          <ScorecardView
            scorecard={scorecard as Scorecard}
            candidateName={`${session.candidate_name} (${session.candidate_email}) — ${session.challenge?.title}`}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 text-sm text-slate-400">
            Session is still in <strong>{session.phase}</strong> phase and has
            not been scored yet.
          </div>
        )}

        {/* Prompt History & Per-Turn Token Telemetry */}
        <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            Prompt &amp; Token Revision Transcript ({turns?.length ?? 0} turns)
          </h2>
          <div className="mt-4 space-y-3">
            {((turns ?? []) as PromptTurn[]).map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-slate-800 bg-[#0b1120] p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-300">
                      Turn #{t.turn_number}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 uppercase text-[10px] text-slate-300">
                      {t.phase}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Prompt: {t.prompt_tokens} · Completion: {t.completion_tokens}{" "}
                    · Cached: {t.cached_tokens} ·{" "}
                    <span className="text-emerald-400">
                      Saved: {t.tokens_saved}
                    </span>
                  </div>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-slate-200">
                  <strong className="text-slate-400">Candidate:</strong>{" "}
                  {t.user_prompt}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-slate-400">
                  <strong className="text-emerald-400">AI:</strong>{" "}
                  {t.ai_response.slice(0, 500)}
                  {t.ai_response.length > 500 ? "..." : ""}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final Code & Integrity Log */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Code2 className="h-4 w-4 text-emerald-400" />
              Final Submitted Code ({revisions?.length ?? 0} revisions)
            </h2>
            <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-800 bg-[#090d16] p-3 font-mono text-xs text-slate-200">
              {session.current_code}
            </pre>
            {((revisions ?? []) as CodeRevision[]).length > 0 && (
              <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                {((revisions ?? []) as CodeRevision[]).map((r) => (
                  <div key={r.id}>
                    Rev #{r.revision_number} ({r.source}): {r.note || "Updated"}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Integrity &amp; Proctoring Log ({integrityEvents?.length ?? 0})
            </h2>
            <div className="mt-3 space-y-2">
              {((integrityEvents ?? []) as IntegrityEvent[]).length === 0 ? (
                <p className="text-xs text-slate-500">
                  No integrity events recorded.
                </p>
              ) : (
                ((integrityEvents ?? []) as IntegrityEvent[]).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0b1120] px-3 py-2 text-xs"
                  >
                    <span className="font-mono font-medium text-amber-300">
                      {ev.event_type}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {JSON.stringify(ev.metadata)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { ScorecardView } from "@/components/ScorecardView";
import { EvaluatorNotesCard } from "@/components/EvaluatorNotesCard";
import { ReleaseScoreButton } from "@/components/ReleaseScoreButton";
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

  if (profile?.role !== "admin" && profile?.role !== "evaluator") {
    redirect("/dashboard");
  }

  const viewerRole = profile.role as "admin" | "evaluator";

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
        userName={profile?.full_name || "Evaluator"}
        userEmail={profile?.email || user.email || ""}
        role={viewerRole}
      />

      <main className="mx-auto max-w-[1600px] space-y-8 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {viewerRole === "admin" ? "Admin Console" : "Review Queue"}
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <div className="tabular-nums font-mono text-xs text-[var(--text-muted)]">
              Tokens: {formatNumber(session.tokens_used)} /{" "}
              {formatNumber(session.token_budget)} · Saved:{" "}
              <span className="font-semibold text-emerald-500">
                {formatNumber(session.tokens_saved)}
              </span>
            </div>
            {viewerRole === "admin" && scorecard && (
              <ReleaseScoreButton
                sessionId={session.id}
                initialReleased={Boolean((scorecard as Scorecard).score_released)}
              />
            )}
          </div>
        </div>

        {scorecard ? (
          <>
            <ScorecardView
              scorecard={scorecard as Scorecard}
              candidateName={`${session.candidate_name} (${session.candidate_email}) — ${session.challenge?.title}`}
            />
            <EvaluatorNotesCard
              sessionId={session.id}
              initialNotes={(scorecard as Scorecard).evaluator_notes}
              initialScore={Number((scorecard as Scorecard).total_score)}
              initialReleased={Boolean((scorecard as Scorecard).score_released)}
            />
          </>
        ) : (
          <div className="surface-card rounded-2xl p-6 text-sm text-[var(--text-muted)]">
            Session is still in <strong>{session.phase}</strong> phase and has
            not been scored yet.
          </div>
        )}

        {/* Prompt History & Per-Turn Token Telemetry */}
        <section className="surface-card rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
            Prompt &amp; Token Revision Transcript ({turns?.length ?? 0} turns)
          </h2>
          <div className="mt-4 space-y-3">
            {((turns ?? []) as PromptTurn[]).map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--accent)]">
                      Turn #{t.turn_number}
                    </span>
                    <span className="rounded border border-[var(--border-subtle)] bg-[var(--surface-1)] px-1.5 py-0.5 uppercase text-[10px] text-[var(--text-secondary)]">
                      {t.phase}
                    </span>
                  </div>
                  <div className="tabular-nums font-mono text-[11px] text-[var(--text-muted)]">
                    Prompt: {t.prompt_tokens} · Completion: {t.completion_tokens}{" "}
                    · Cached: {t.cached_tokens} ·{" "}
                    <span className="font-semibold text-emerald-500">
                      Saved: {t.tokens_saved}
                    </span>
                  </div>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-[var(--text-primary)]">
                  <strong className="text-[var(--text-muted)]">Candidate:</strong>{" "}
                  {t.user_prompt}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[var(--text-secondary)]">
                  <strong className="text-emerald-500">AI:</strong>{" "}
                  {t.ai_response.slice(0, 500)}
                  {t.ai_response.length > 500 ? "..." : ""}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final Code & Integrity Log */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="surface-card rounded-2xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <Code2 className="h-4 w-4 text-emerald-500" />
              Final Submitted Code ({revisions?.length ?? 0} revisions)
            </h2>
            <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-white/10 bg-[#0d1117] p-3.5 font-mono text-xs text-slate-200">
              {session.current_code}
            </pre>
            {((revisions ?? []) as CodeRevision[]).length > 0 && (
              <div className="mt-3 space-y-1 text-[11px] text-[var(--text-muted)]">
                {((revisions ?? []) as CodeRevision[]).map((r) => (
                  <div key={r.id}>
                    Rev #{r.revision_number} ({r.source}): {r.note || "Updated"}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card rounded-2xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Integrity &amp; Proctoring Log ({integrityEvents?.length ?? 0})
            </h2>
            <div className="mt-3 space-y-2">
              {((integrityEvents ?? []) as IntegrityEvent[]).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  No integrity events recorded.
                </p>
              ) : (
                ((integrityEvents ?? []) as IntegrityEvent[]).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                  >
                    <span className="shrink-0 font-mono font-semibold text-amber-500">
                      {ev.event_type}
                    </span>
                    <span className="break-all font-mono text-[11px] text-[var(--text-muted)]">
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

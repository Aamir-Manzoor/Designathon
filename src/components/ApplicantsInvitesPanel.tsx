"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Copy,
  Check,
  Mail,
  UserPlus,
  Loader2,
  ExternalLink,
} from "lucide-react";

export interface ApplicantRow {
  id: string;
  full_name: string;
  email: string;
  track: string;
  preferred_language: string;
  github_url: string | null;
  status: "pending" | "invited" | "registered";
  invite_token: string | null;
  assigned_challenge_ids: string[];
  invited_at: string | null;
  created_at: string;
}

export interface EmailNotificationRow {
  id: string;
  recipient_email: string;
  recipient_name: string;
  email_type: "invite" | "submission_received" | "score_released";
  subject: string;
  body: string;
  action_url: string | null;
  delivery_status: "sent_smtp" | "sent_resend" | "logged_outbox";
  created_at: string;
}

export function ApplicantsInvitesPanel({
  applications,
  challenges,
  emails,
}: {
  applications: ApplicantRow[];
  challenges: Array<{ id: string; title: string; difficulty: string }>;
  emails: EmailNotificationRow[];
}) {
  const router = useRouter();
  const [selectedChallenges, setSelectedChallenges] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(
      applications.map((a) => [
        a.id,
        a.assigned_challenge_ids?.length > 0
          ? a.assigned_challenge_ids
          : challenges[0]
          ? [challenges[0].id]
          : [],
      ])
    )
  );
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  function toggleChallenge(appId: string, challengeId: string) {
    setSelectedChallenges((prev) => {
      const curr = prev[appId] || [];
      return {
        ...prev,
        [appId]: curr.includes(challengeId)
          ? curr.filter((id) => id !== challengeId)
          : [...curr, challengeId],
      };
    });
  }

  async function handleSendInvite(appId: string) {
    const ids = selectedChallenges[appId] || [];
    if (ids.length === 0) {
      setStatusMsg("Please select at least one challenge to assign.");
      return;
    }
    setSendingId(appId);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/applications/${appId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_challenge_ids: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || "Could not send invite");
      } else {
        setStatusMsg(
          `Access link generated and logged to Email Outbox (${data.delivery_status}).`
        );
        router.refresh();
      }
    } finally {
      setSendingId(null);
    }
  }

  function copyLink(id: string, url: string) {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Candidate Applications */}
      <div className="surface-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <UserPlus className="h-4 w-4 text-[var(--accent)]" />
              Candidate Applications &amp; Challenge Assignment (
              {applications.length})
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Assign specific coding challenges to each applicant and generate
              their personal registration access link.
            </p>
          </div>
          <a
            href="/apply"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
          >
            Open Public /apply Form
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {statusMsg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-500">
            {statusMsg}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] p-8 text-center text-xs text-[var(--text-muted)]">
            No candidate applications yet. Share{" "}
            <code className="font-mono text-[var(--accent)]">/apply</code> so
            candidates can request assessment access.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {applications.map((app) => {
              const assigned = selectedChallenges[app.id] || [];
              const inviteUrl =
                app.invite_token && typeof window !== "undefined"
                  ? `${window.location.origin}/register?invite=${app.invite_token}`
                  : app.invite_token
                  ? `/register?invite=${app.invite_token}`
                  : null;

              return (
                <div
                  key={app.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {app.full_name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            app.status === "registered"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : app.status === "invited"
                              ? "bg-cyan-500/15 text-cyan-500"
                              : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {app.status}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {app.track} · {app.preferred_language}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
                        {app.email}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {inviteUrl && (
                        <button
                          type="button"
                          onClick={() => copyLink(app.id, inviteUrl)}
                          className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
                        >
                          {copiedId === app.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedId === app.id
                            ? "Copied Link"
                            : "Copy Access Link"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={sendingId === app.id}
                        onClick={() => handleSendInvite(app.id)}
                        className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60"
                      >
                        {sendingId === app.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        {app.invite_token
                          ? "Update & Resend Link"
                          : "Approve & Send Access Link"}
                      </button>
                    </div>
                  </div>

                  {/* Challenge Assignment Checkboxes */}
                  <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Assign Challenges ({assigned.length} selected)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {challenges.map((ch) => {
                        const checked = assigned.includes(ch.id);
                        return (
                          <label
                            key={ch.id}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                              checked
                                ? "border-[var(--accent-border)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                                : "border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleChallenge(app.id, ch.id)}
                              className="h-3.5 w-3.5 accent-[var(--accent)]"
                            />
                            {ch.title}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Built-In Email Outbox Viewer */}
      <div className="surface-card rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
          <Mail className="h-4 w-4 text-cyan-500" />
          Email Notifications Outbox ({emails.length})
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Every invite link, submission confirmation, and score-release email is
          logged here (and sent live via Resend when{" "}
          <code className="font-mono">RESEND_API_KEY</code> is configured).
        </p>

        {emails.length === 0 ? (
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            No emails dispatched yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {emails.map((em) => (
              <div
                key={em.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        em.email_type === "score_released"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : em.email_type === "invite"
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "bg-amber-500/15 text-amber-500"
                      }`}
                    >
                      {em.email_type.replace("_", " ")}
                    </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {em.subject}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    To: {em.recipient_email} · {em.delivery_status}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {em.body}
                </p>
                {em.action_url && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => copyLink(em.id, em.action_url!)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[var(--accent)] hover:underline"
                    >
                      {copiedId === em.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedId === em.id ? "Copied URL" : em.action_url}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

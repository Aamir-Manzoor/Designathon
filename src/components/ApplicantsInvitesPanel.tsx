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
  Shuffle,
  UserCheck,
  XCircle,
  Trash2,
  Search,
} from "lucide-react";

export interface ApplicantRow {
  id: string;
  full_name: string;
  email: string;
  track: string;
  preferred_language: string;
  github_url: string | null;
  status: "pending" | "invited" | "registered" | "rejected";
  invite_role?: "candidate" | "evaluator";
  invite_token: string | null;
  assigned_challenge_ids: string[];
  assigned_evaluator_id?: string | null;
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
  evaluators = [],
  emails,
}: {
  applications: ApplicantRow[];
  challenges: Array<{ id: string; title: string; difficulty: string }>;
  evaluators?: Array<{ id: string; full_name: string; email: string }>;
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
  const [selectedEvaluators, setSelectedEvaluators] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      applications.map((a) => [
        a.id,
        a.assigned_evaluator_id || evaluators[0]?.id || "",
      ])
    )
  );
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");

  async function handleRejectInvite(appId: string) {
    setActionId(appId);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || "Could not reject invitation");
      } else {
        setStatusMsg("Invitation rejected and access link revoked.");
        router.refresh();
      }
    } finally {
      setActionId(null);
    }
  }

  async function handleDeleteInvite(appId: string) {
    setActionId(appId);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || "Could not delete invitation");
      } else {
        setStatusMsg("Application / invitation deleted permanently.");
        router.refresh();
      }
    } finally {
      setActionId(null);
    }
  }

  // Admin Invite-Only Evaluator state
  const [evalName, setEvalName] = useState("");
  const [evalEmail, setEvalEmail] = useState("");
  const [invitingEval, setInvitingEval] = useState(false);
  const [evalInviteUrl, setEvalInviteUrl] = useState<string | null>(null);

  async function handleInviteEvaluator(e: React.FormEvent) {
    e.preventDefault();
    setInvitingEval(true);
    setStatusMsg(null);
    setEvalInviteUrl(null);
    try {
      const res = await fetch("/api/admin/invite-evaluator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: evalName, email: evalEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || "Could not send evaluator invite");
      } else {
        setEvalName("");
        setEvalEmail("");
        setEvalInviteUrl(data.invite_url || null);
        setStatusMsg(
          `Evaluator invitation emailed (${data.delivery_status}). They can now register via their personal invite link.`
        );
        router.refresh();
      }
    } finally {
      setInvitingEval(false);
    }
  }

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

  function assignRandomChallenge(appId: string) {
    if (challenges.length === 0) return;
    const pool = challenges.map((c) => c.id);
    const randomId = pool[Math.floor(Math.random() * pool.length)];
    setSelectedChallenges((prev) => ({
      ...prev,
      [appId]: [randomId],
    }));
    const picked = challenges.find((c) => c.id === randomId);
    setStatusMsg(
      `Randomly selected "${picked?.title || "Challenge"}" (${
        picked?.difficulty || ""
      }). Click Approve & Send Access Link to save.`
    );
  }

  function assignRandomToAll() {
    if (challenges.length === 0) return;
    const next: Record<string, string[]> = {};
    applications.forEach((a) => {
      const randomId =
        challenges[Math.floor(Math.random() * challenges.length)].id;
      next[a.id] = [randomId];
    });
    setSelectedChallenges(next);
    setStatusMsg(
      `Assigned a random hidden challenge to all ${applications.length} applicant(s). Click Approve & Send on each to dispatch.`
    );
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
        body: JSON.stringify({
          assigned_challenge_ids: ids,
          assigned_evaluator_id: selectedEvaluators[appId] || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || "Could not send invite");
      } else {
        setStatusMsg(
          `Access link, challenge(s), and evaluator saved & emailed (${data.delivery_status}).`
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
      {/* Invite-Only Evaluator Onboarding */}
      <form
        onSubmit={handleInviteEvaluator}
        className="surface-card rounded-2xl border-cyan-500/25 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <UserCheck className="h-4 w-4 text-cyan-500" />
              Invite Evaluator (Invitation-Only Access)
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Evaluators cannot self-register. Send a personal registration
              email so they can create their Evaluator account.
            </p>
          </div>
          {evalInviteUrl && (
            <button
              type="button"
              onClick={() => copyLink("eval-new", evalInviteUrl)}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-500"
            >
              {copiedId === "eval-new" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedId === "eval-new"
                ? "Copied Evaluator Link"
                : "Copy Evaluator Invite Link"}
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            required
            value={evalName}
            onChange={(e) => setEvalName(e.target.value)}
            placeholder="Evaluator Full Name"
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          <input
            type="email"
            required
            value={evalEmail}
            onChange={(e) => setEvalEmail(e.target.value)}
            placeholder="evaluator@company.com"
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={invitingEval}
            className="btn-tactile inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
          >
            {invitingEval ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send Evaluator Invite Email
          </button>
        </div>
      </form>

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
          <div className="flex flex-wrap items-center gap-2">
            {applications.length > 0 && challenges.length > 0 && (
              <button
                type="button"
                onClick={assignRandomToAll}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-500 hover:bg-cyan-500/20"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Assign Random Challenges to All
              </button>
            )}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Search applicant name, email, or track..."
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="all">All Invitation Statuses</option>
                <option value="pending">Pending</option>
                <option value="invited">Invited</option>
                <option value="registered">Registered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {applications
              .filter((a) => {
                if (appStatusFilter !== "all" && a.status !== appStatusFilter) {
                  return false;
                }
                if (appSearch.trim()) {
                  const q = appSearch.trim().toLowerCase();
                  return `${a.full_name} ${a.email} ${a.track}`
                    .toLowerCase()
                    .includes(q);
                }
                return true;
              })
              .map((app) => {
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
                              : app.status === "rejected"
                              ? "bg-red-500/15 text-red-500"
                              : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {app.status}
                        </span>
                        {app.invite_role === "evaluator" && (
                          <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-500">
                            Evaluator Invite
                          </span>
                        )}
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
                      {app.invite_role !== "evaluator" && (
                        <button
                          type="button"
                          disabled={sendingId === app.id || actionId === app.id}
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
                      )}
                      {app.status !== "rejected" && app.status !== "registered" && (
                        <button
                          type="button"
                          disabled={actionId === app.id || sendingId === app.id}
                          onClick={() => handleRejectInvite(app.id)}
                          className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 disabled:opacity-60"
                          title="Reject invitation and revoke link"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={actionId === app.id || sendingId === app.id}
                        onClick={() => handleDeleteInvite(app.id)}
                        className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/20 disabled:opacity-60"
                        title="Delete permanently"
                      >
                        {actionId === app.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Challenge & Evaluator Assignment (for Candidate applications only) */}
                  {app.invite_role !== "evaluator" && (
                  <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Assign Sealed Challenges ({assigned.length} of{" "}
                        {challenges.length} selected)
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => assignRandomChallenge(app.id)}
                          className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-500 hover:bg-cyan-500/20"
                        >
                          <Shuffle className="h-3 w-3" />
                          Pick Random Challenge
                        </button>
                        {evaluators.length > 0 && (
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                            <UserCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                            Evaluator:
                            <select
                              value={selectedEvaluators[app.id] || ""}
                              onChange={(e) =>
                                setSelectedEvaluators((prev) => ({
                                  ...prev,
                                  [app.id]: e.target.value,
                                }))
                              }
                              className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2 py-1 text-xs font-medium text-[var(--text-primary)]"
                            >
                              <option value="">Unassigned</option>
                              {evaluators.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                  {ev.full_name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
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
                            <span>{ch.title}</span>
                            <span className="text-[10px] opacity-70">
                              ({ch.difficulty})
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  )}
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
          Every invite link, submission confirmation, and evaluator score-release
          email is dispatched via Gmail SMTP and archived here.
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

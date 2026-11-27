import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDispatchEmail = vi.fn().mockResolvedValue({ deliveryStatus: "sent_smtp" });
let mockSupabase: Record<string, unknown>;

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(async () => mockSupabase),
}));

vi.mock("@/lib/engines/mailer", () => ({
  dispatchEmailNotification: (...args: unknown[]) => mockDispatchEmail(...args),
}));

import { PATCH as patchNotes } from "@/app/api/scorecards/[sessionId]/notes/route";
import { POST as postRelease } from "@/app/api/scorecards/[sessionId]/release/route";
import { POST as postInviteEvaluator } from "@/app/api/admin/invite-evaluator/route";
import {
  PATCH as patchApplication,
  DELETE as deleteApplication,
} from "@/app/api/applications/[id]/route";
import { POST as postForgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as postResetPassword } from "@/app/api/auth/reset-password/route";

describe("Enterprise Workflow & Security API Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires Evaluator to choose Pass/Reject and provide feedback, and locks to one-time submission", async () => {
    let existingDecision: "passed" | "rejected" | null = null;
    let existingNotes: string | null = null;

    mockSupabase = {
      auth: { getUser: async () => ({ data: { user: { id: "eval-1" } } }) },
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { role: "evaluator" } }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  evaluator_decision: existingDecision,
                  evaluator_notes: existingNotes,
                  evaluator_reviewed_at: existingDecision
                    ? new Date().toISOString()
                    : null,
                },
              }),
            }),
          }),
          update: (payload: {
            evaluator_decision: "passed" | "rejected";
            evaluator_notes: string;
          }) => ({
            eq: () => ({
              select: () => ({
                single: async () => {
                  existingDecision = payload.evaluator_decision;
                  existingNotes = payload.evaluator_notes;
                  return {
                    data: {
                      session_id: "sess-1",
                      evaluator_decision: existingDecision,
                      evaluator_notes: existingNotes,
                    },
                    error: null,
                  };
                },
              }),
            }),
          }),
        };
      },
    };

    // Missing Pass/Reject decision -> 400
    const badReq = new Request("http://localhost/api/scorecards/sess-1/notes", {
      method: "PATCH",
      body: JSON.stringify({ evaluator_notes: "Good job" }),
    });
    const badRes = await patchNotes(badReq, {
      params: Promise.resolve({ sessionId: "sess-1" }),
    });
    expect(badRes.status).toBe(400);

    // First valid Pass + feedback -> 200
    const okReq = new Request("http://localhost/api/scorecards/sess-1/notes", {
      method: "PATCH",
      body: JSON.stringify({
        evaluator_decision: "passed",
        evaluator_notes: "Strong decomposition and clean debug fix.",
      }),
    });
    const okRes = await patchNotes(okReq, {
      params: Promise.resolve({ sessionId: "sess-1" }),
    });
    expect(okRes.status).toBe(200);

    // Second submission attempt -> 403 locked (view-only)
    const secondReq = new Request(
      "http://localhost/api/scorecards/sess-1/notes",
      {
        method: "PATCH",
        body: JSON.stringify({
          evaluator_decision: "rejected",
          evaluator_notes: "Trying to overwrite feedback.",
        }),
      }
    );
    const secondRes = await patchNotes(secondReq, {
      params: Promise.resolve({ sessionId: "sess-1" }),
    });
    expect(secondRes.status).toBe(403);
  });

  it("blocks Admin report release until Evaluator submits Pass/Reject + feedback, and omits numeric scores from candidate email", async () => {
    let scorecardState = {
      session_id: "sess-1",
      total_score: 91.5,
      evaluator_decision: null as "passed" | "rejected" | null,
      evaluator_notes: null as string | null,
      score_released: false,
    };

    mockSupabase = {
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { role: "admin" } }),
              }),
            }),
          };
        }
        if (table === "candidate_sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: "sess-1",
                    candidate_name: "Priya",
                    candidate_email: "priya@example.com",
                    challenge: { title: "Rate Limiter" },
                  },
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: scorecardState }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { ...scorecardState, score_released: true },
                  error: null,
                }),
              }),
            }),
          }),
        };
      },
    };

    // Before Evaluator submits -> 400 blocked
    const req1 = new Request("http://localhost/api/scorecards/sess-1/release", {
      method: "POST",
    });
    const res1 = await postRelease(req1, {
      params: Promise.resolve({ sessionId: "sess-1" }),
    });
    expect(res1.status).toBe(400);
    expect(mockDispatchEmail).not.toHaveBeenCalled();

    // After Evaluator submits Pass + feedback -> 200 released, email has NO numeric score
    scorecardState = {
      ...scorecardState,
      evaluator_decision: "passed",
      evaluator_notes: "Clear prompting and thorough edge-case handling.",
    };
    const req2 = new Request("http://localhost/api/scorecards/sess-1/release", {
      method: "POST",
      headers: { origin: "https://promptbench-beta.vercel.app" },
    });
    const res2 = await postRelease(req2, {
      params: Promise.resolve({ sessionId: "sess-1" }),
    });
    expect(res2.status).toBe(200);
    expect(mockDispatchEmail).toHaveBeenCalledTimes(1);

    const emailPayload = mockDispatchEmail.mock.calls[0][0] as {
      body: string;
      subject: string;
    };
    expect(emailPayload.body).toContain("Passed");
    expect(emailPayload.body).toContain("Clear prompting and thorough edge-case handling.");
    expect(emailPayload.body).not.toContain("91.5");
    expect(emailPayload.body).not.toContain("/100");
  });

  it("restricts Evaluator invitations to Admins only and sends invite email", async () => {
    // Non-admin rejected (403)
    mockSupabase = {
      auth: { getUser: async () => ({ data: { user: { id: "cand-1" } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { role: "candidate" } }),
          }),
        }),
      }),
    };
    const forbiddenRes = await postInviteEvaluator(
      new Request("http://localhost/api/admin/invite-evaluator", {
        method: "POST",
        body: JSON.stringify({ full_name: "Eval", email: "eval@test.com" }),
      })
    );
    expect(forbiddenRes.status).toBe(403);

    // Admin succeeds (201)
    mockSupabase = {
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { role: "admin" } }),
              }),
            }),
          };
        }
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: { id: "inv-1", invite_role: "evaluator", email: "eval@test.com" },
                error: null,
              }),
            }),
          }),
        };
      },
    };
    const okRes = await postInviteEvaluator(
      new Request("http://localhost/api/admin/invite-evaluator", {
        method: "POST",
        headers: { origin: "https://promptbench-beta.vercel.app" },
        body: JSON.stringify({ full_name: "Senior Eval", email: "eval@test.com" }),
      })
    );
    expect(okRes.status).toBe(201);
    expect(mockDispatchEmail).toHaveBeenCalledTimes(1);
  });

  it("allows Admins to reject (revoking invite_token) and delete applications", async () => {
    let deletedId: string | null = null;
    mockSupabase = {
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { role: "admin" } }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "app-1",
                  full_name: "Applicant",
                  email: "app@test.com",
                  invite_role: "candidate",
                },
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: "app-1", ...payload },
                  error: null,
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: async (_col: string, val: string) => {
              deletedId = val;
              return { error: null };
            },
          }),
        };
      },
    };

    const rejRes = await patchApplication(
      new Request("http://localhost/api/applications/app-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      }),
      { params: Promise.resolve({ id: "app-1" }) }
    );
    expect(rejRes.status).toBe(200);
    const rejJson = await rejRes.json();
    expect(rejJson.application.status).toBe("rejected");
    expect(rejJson.application.invite_token).toBeNull();

    const delRes = await deleteApplication(
      new Request("http://localhost/api/applications/app-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "app-1" }) }
    );
    expect(delRes.status).toBe(200);
    expect(deletedId).toBe("app-1");
  });

  it("handles Forgot Password and Reset Password flows securely", async () => {
    mockSupabase = {
      rpc: async (fn: string) => {
        if (fn === "create_password_reset_token") {
          return { data: "Evaluator Jane", error: null };
        }
        if (fn === "consume_password_reset_token") {
          return { data: true, error: null };
        }
        return { data: null, error: null };
      },
    };

    const forgotRes = await postForgotPassword(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { origin: "https://promptbench-beta.vercel.app" },
        body: JSON.stringify({ email: "jane@company.com" }),
      })
    );
    expect(forgotRes.status).toBe(200);
    expect(mockDispatchEmail).toHaveBeenCalledTimes(1);

    const resetRes = await postResetPassword(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: "valid-token", password: "NewPassword123" }),
      })
    );
    expect(resetRes.status).toBe(200);
  });
});

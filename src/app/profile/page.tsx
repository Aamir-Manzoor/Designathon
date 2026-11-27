import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { ProfileClient } from "@/components/ProfileClient";

export default async function ProfilePage() {
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

  const isAdminOrEvaluator =
    profile?.role === "admin" || profile?.role === "evaluator";

  // Admins see all sessions; Evaluators see their assigned batch (via RLS); Candidates see their own full history
  const sessionsQuery = supabase
    .from("candidate_sessions")
    .select(
      `
        id, phase, is_practice, language, tokens_used, tokens_saved, token_budget, started_at,
        challenge:challenges(title, difficulty),
        scorecard:scorecards(total_score, score_released, evaluator_reviewed_at)
      `
    )
    .order("started_at", { ascending: false });

  const { data: sessions } = isAdminOrEvaluator
    ? await sessionsQuery
    : await sessionsQuery.eq("user_id", user.id);

  const rows = sessions ?? [];
  const scores = rows
    .map((r) => {
      const sc = Array.isArray(r.scorecard) ? r.scorecard[0] : r.scorecard;
      return sc ? Number(sc.total_score) : null;
    })
    .filter((v): v is number => v !== null);

  const stats = {
    totalSessions: rows.length,
    avgScore:
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0,
    totalTokensUsed: rows.reduce((s, r) => s + (r.tokens_used || 0), 0),
    totalTokensSaved: rows.reduce((s, r) => s + (r.tokens_saved || 0), 0),
  };

  const safeProfile = {
    id: profile?.id || user.id,
    email: profile?.email || user.email || "",
    full_name: profile?.full_name || user.email?.split("@")[0] || "User",
    role: (profile?.role === "admin"
      ? "admin"
      : profile?.role === "evaluator"
      ? "evaluator"
      : "candidate") as "admin" | "evaluator" | "candidate",
    created_at: profile?.created_at || user.created_at || new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Navbar
        userName={safeProfile.full_name}
        userEmail={safeProfile.email}
        role={safeProfile.role}
      />
      <ProfileClient
        profile={safeProfile}
        stats={stats}
        sessions={safeProfile.role === "candidate" ? (rows as never[]) : []}
      />
    </div>
  );
}

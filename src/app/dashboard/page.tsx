import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { CandidateDashboardClient } from "@/components/CandidateDashboardClient";
import type { Challenge } from "@/types/assessment";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: allChallenges },
    { data: sessions },
    { data: applications },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("challenges")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("candidate_sessions")
      .select(
        `
          id, phase, is_practice, language, tokens_used, token_budget, started_at,
          challenge:challenges(title, difficulty),
          scorecard:scorecards(total_score, score_released)
        `
      )
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
    supabase
      .from("candidate_applications")
      .select("assigned_challenge_ids, track")
      .or(`user_id.eq.${user.id},email.ilike.${user.email || ""}`)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const appRecord = applications?.[0];
  const assignedIds: string[] = Array.isArray(appRecord?.assigned_challenge_ids)
    ? appRecord.assigned_challenge_ids
    : [];

  const isAssignedScoped =
    profile?.role === "candidate" && assignedIds.length > 0;
  const visibleChallenges = isAssignedScoped
    ? (allChallenges ?? []).filter((c) => assignedIds.includes(c.id))
    : allChallenges ?? [];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Navbar
        userName={profile?.full_name || user.email?.split("@")[0] || "User"}
        userEmail={profile?.email || user.email || ""}
        role={
          (profile?.role as "admin" | "evaluator" | "candidate") || "candidate"
        }
      />
      <CandidateDashboardClient
        challenges={visibleChallenges as Challenge[]}
        sessions={(sessions ?? []) as never[]}
        isAssignedScoped={isAssignedScoped}
        assignedTrack={appRecord?.track || null}
      />
    </div>
  );
}

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

  const [{ data: profile }, { data: challenges }, { data: sessions }] =
    await Promise.all([
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
          id, phase, language, tokens_used, token_budget, started_at,
          challenge:challenges(title, difficulty),
          scorecard:scorecards(total_score)
        `
        )
        .eq("user_id", user.id)
        .order("started_at", { ascending: false }),
    ]);

  return (
    <div className="min-h-screen bg-[#090d16]">
      <Navbar
        userName={profile?.full_name || user.email?.split("@")[0] || "User"}
        userEmail={profile?.email || user.email || ""}
        role={(profile?.role as "admin" | "candidate") || "candidate"}
      />
      <CandidateDashboardClient
        challenges={(challenges ?? []) as Challenge[]}
        sessions={(sessions ?? []) as never[]}
      />
    </div>
  );
}

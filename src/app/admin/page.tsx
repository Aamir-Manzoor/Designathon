import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { AdminConsoleClient } from "@/components/AdminConsoleClient";

export default async function AdminPage() {
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

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const [{ data: sessions }, { data: challenges }] = await Promise.all([
    supabase
      .from("candidate_sessions")
      .select(
        `
        *,
        challenge:challenges(title, difficulty),
        scorecard:scorecards(*)
      `
      )
      .order("started_at", { ascending: false }),
    supabase
      .from("challenges")
      .select("*, test_cases(id, visibility)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-[#090d16]">
      <Navbar
        userName={profile?.full_name || "Admin"}
        userEmail={profile?.email || user.email || ""}
        role="admin"
      />
      <AdminConsoleClient
        sessions={(sessions ?? []) as never[]}
        challenges={(challenges ?? []) as never[]}
      />
    </div>
  );
}

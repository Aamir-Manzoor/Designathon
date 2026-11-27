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

  if (profile?.role !== "admin" && profile?.role !== "evaluator") {
    redirect("/dashboard");
  }

  const viewerRole = profile.role as "admin" | "evaluator";

  const [
    { data: sessions },
    { data: challenges },
    { data: evaluators },
    { data: applications },
    { data: emails },
  ] = await Promise.all([
    supabase
      .from("candidate_sessions")
      .select(
        `
          *,
          challenge:challenges(title, difficulty),
          scorecard:scorecards(*)
        `
      )
      .eq("is_practice", false)
      .order("started_at", { ascending: false }),
    viewerRole === "admin"
      ? supabase
          .from("challenges")
          .select("*, test_cases(id, visibility)")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    viewerRole === "admin"
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("role", "evaluator")
          .order("full_name", { ascending: true })
      : Promise.resolve({ data: [] }),
    viewerRole === "admin"
      ? supabase
          .from("candidate_applications")
          .select("*")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    viewerRole === "admin"
      ? supabase
          .from("email_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Navbar
        userName={profile?.full_name || "Evaluator"}
        userEmail={profile?.email || user.email || ""}
        role={viewerRole}
      />
      <AdminConsoleClient
        viewerRole={viewerRole}
        sessions={(sessions ?? []) as never[]}
        challenges={(challenges ?? []) as never[]}
        evaluators={(evaluators ?? []) as Array<{
          id: string;
          full_name: string;
          email: string;
        }>}
        applications={(applications ?? []) as never[]}
        emails={(emails ?? []) as never[]}
      />
    </div>
  );
}

import { createServerSupabase } from "@/lib/supabase/server";
import { LandingShowcase } from "@/components/LandingShowcase";

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let signedInRole: "admin" | "candidate" | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    signedInRole = profile?.role === "admin" ? "admin" : "candidate";
  }

  return <LandingShowcase signedInRole={signedInRole} />;
}

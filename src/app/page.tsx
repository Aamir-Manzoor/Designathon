import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { LandingShowcase } from "@/components/LandingShowcase";

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  return <LandingShowcase />;
}

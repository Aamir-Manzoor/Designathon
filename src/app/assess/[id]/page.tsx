import { redirect, notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { AssessmentWorkspace } from "@/components/AssessmentWorkspace";
import type {
  CandidateSession,
  Challenge,
  CodeRevision,
  ExecutionRun,
  PromptTurn,
  Scorecard,
  TestCase,
} from "@/types/assessment";

export default async function AssessSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("candidate_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) notFound();

  const [
    { data: challenge },
    { data: publicTests },
    { data: turns },
    { data: revisions },
    { data: runs },
    { data: scorecard },
  ] = await Promise.all([
    supabase
      .from("challenges")
      .select("*")
      .eq("id", session.challenge_id)
      .single(),
    supabase
      .from("test_cases")
      .select("*")
      .eq("challenge_id", session.challenge_id)
      .eq("visibility", "public")
      .order("sort_order", { ascending: true }),
    supabase
      .from("prompt_turns")
      .select("*")
      .eq("session_id", id)
      .order("turn_number", { ascending: true }),
    supabase
      .from("code_revisions")
      .select("*")
      .eq("session_id", id)
      .order("revision_number", { ascending: true }),
    supabase
      .from("execution_runs")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("scorecards").select("*").eq("session_id", id).maybeSingle(),
  ]);

  if (!challenge) notFound();

  return (
    <AssessmentWorkspace
      initialSession={session as CandidateSession}
      challenge={challenge as Challenge}
      publicTests={(publicTests ?? []) as TestCase[]}
      initialTurns={(turns ?? []) as PromptTurn[]}
      initialRevisions={(revisions ?? []) as CodeRevision[]}
      initialRuns={(runs ?? []) as ExecutionRun[]}
      initialScorecard={(scorecard as Scorecard) ?? null}
    />
  );
}

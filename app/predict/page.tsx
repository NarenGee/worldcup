import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PredictPageClient } from "@/components/predict/predict-page-client";
import { applyDefaultPredictions } from "@/lib/apply-default-predictions";
import { groupPredictionsByMatch } from "@/lib/match-predictions";
import { createClient } from "@/lib/supabase/server";

export default async function PredictPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/predict");

  try {
    await applyDefaultPredictions(supabase);
  } catch {
    // Migration may not be applied yet.
  }

  const [{ data: matches }, { data: predictions }, { data: props }, { data: players }, { data: allPredictions }] =
    await Promise.all([
      supabase.from("matches").select("*").order("kickoff_at"),
      supabase.from("predictions").select("*").eq("user_id", user.id),
      supabase.from("props").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("is_active", true)
        .order("display_name"),
      supabase
        .from("predictions")
        .select("user_id, match_id, predicted_home, predicted_away"),
    ]);

  const groupMatches = (matches ?? []).filter((m) => m.stage === "group");
  const firstGroupKickoff = groupMatches.length
    ? groupMatches.reduce(
        (min, m) =>
          new Date(m.kickoff_at) < new Date(min) ? m.kickoff_at : min,
        groupMatches[0].kickoff_at
      )
    : null;

  const tournamentStarted = firstGroupKickoff
    ? new Date(firstGroupKickoff) <= new Date()
    : false;

  return (
    <AppShell>
      <PredictPageClient
        matches={matches ?? []}
        predictions={predictions ?? []}
        props={props}
        userId={user.id}
        tournamentStarted={tournamentStarted}
        players={players ?? []}
        predictionsByMatch={groupPredictionsByMatch(allPredictions ?? [])}
      />
    </AppShell>
  );
}

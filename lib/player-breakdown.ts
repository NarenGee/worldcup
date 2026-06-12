import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateMatchPoints, calculatePropsPoints } from "@/lib/scoring";
import type { Database } from "@/lib/supabase/types";

export type MatchBreakdownLine = {
  match_id: number;
  stage: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  predicted_home: number;
  predicted_away: number;
  actual_home: number;
  actual_away: number;
  points: number;
  result_label: "exact" | "outcome" | "miss";
};

export type PropsBreakdown = {
  champion: string | null;
  top_scorer: string | null;
  actual_champion: string | null;
  actual_top_scorer: string | null;
  champion_points: number;
  top_scorer_points: number;
};

export type PlayerPointsBreakdown = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_score: number;
  match_points: number;
  props_points: number;
  matches: MatchBreakdownLine[];
  props: PropsBreakdown;
};

function resultLabel(points: number): MatchBreakdownLine["result_label"] {
  if (points === 3) return "exact";
  if (points === 1) return "outcome";
  return "miss";
}

export async function getPlayerPointsBreakdown(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PlayerPointsBreakdown | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) return null;

  const now = new Date().toISOString();

  const [
    { data: predictions },
    { data: confirmedMatches },
    { data: props },
    { data: tournamentResults },
  ] = await Promise.all([
    supabase
      .from("predictions")
      .select("match_id, predicted_home, predicted_away, points")
      .eq("user_id", userId),
    supabase
      .from("matches")
      .select(
        "id, stage, home_team, away_team, kickoff_at, home_score, away_score, result_confirmed"
      )
      .eq("result_confirmed", true)
      .lte("kickoff_at", now),
    supabase.from("props").select("champion, top_scorer").eq("user_id", userId).maybeSingle(),
    supabase.from("tournament_results").select("champion, top_scorer").eq("id", 1).single(),
  ]);

  const matchById = new Map((confirmedMatches ?? []).map((match) => [match.id, match]));
  const matches: MatchBreakdownLine[] = [];

  for (const prediction of predictions ?? []) {
    const match = matchById.get(prediction.match_id);
    if (!match || match.home_score === null || match.away_score === null) {
      continue;
    }

    const points =
      prediction.points ??
      calculateMatchPoints(
        prediction.predicted_home,
        prediction.predicted_away,
        match.home_score,
        match.away_score,
        match.result_confirmed
      );

    matches.push({
      match_id: match.id,
      stage: match.stage,
      home_team: match.home_team,
      away_team: match.away_team,
      kickoff_at: match.kickoff_at,
      predicted_home: prediction.predicted_home,
      predicted_away: prediction.predicted_away,
      actual_home: match.home_score,
      actual_away: match.away_score,
      points,
      result_label: resultLabel(points),
    });
  }

  matches.sort(
    (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
  );

  const actualChampion = tournamentResults?.champion ?? null;
  const actualTopScorer = tournamentResults?.top_scorer ?? null;
  const champion = props?.champion ?? null;
  const topScorer = props?.top_scorer ?? null;

  const championPoints =
    champion && actualChampion && champion === actualChampion ? 5 : 0;
  const topScorerPoints =
    topScorer && actualTopScorer && topScorer === actualTopScorer ? 3 : 0;
  const propsPoints = calculatePropsPoints(
    champion,
    topScorer,
    actualChampion,
    actualTopScorer
  );
  const matchPoints = matches.reduce((sum, line) => sum + line.points, 0);

  return {
    user_id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    total_score: matchPoints + propsPoints,
    match_points: matchPoints,
    props_points: propsPoints,
    matches,
    props: {
      champion,
      top_scorer: topScorer,
      actual_champion: actualChampion,
      actual_top_scorer: actualTopScorer,
      champion_points: championPoints,
      top_scorer_points: topScorerPoints,
    },
  };
}

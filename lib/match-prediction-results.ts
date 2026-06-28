import type { SupabaseClient } from "@supabase/supabase-js";
import { awardMatchPoints, baseResultLabel } from "@/lib/scoring";
import type { Database } from "@/lib/supabase/types";

export type MatchPredictionResultLine = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  predicted_home: number;
  predicted_away: number;
  points: number;
  is_default: boolean;
  result_label: "exact" | "outcome" | "miss";
};

export type MatchPredictionsResult = {
  match_id: number;
  home_team: string;
  away_team: string;
  actual_home: number | null;
  actual_away: number | null;
  result_confirmed: boolean;
  predictions: MatchPredictionResultLine[];
};

export async function getMatchPredictionResults(
  supabase: SupabaseClient<Database>,
  matchId: number
): Promise<MatchPredictionsResult | null> {
  const { data: match } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, result_confirmed")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return null;

  const [{ data: predictions }, { data: profiles }] = await Promise.all([
    supabase
      .from("predictions")
      .select("user_id, predicted_home, predicted_away, points, is_default")
      .eq("match_id", matchId),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("is_active", true),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  const lines: MatchPredictionResultLine[] = [];

  for (const prediction of predictions ?? []) {
    const profile = profileById.get(prediction.user_id);
    if (!profile) continue;

    const isDefault = prediction.is_default ?? false;
    const points =
      prediction.points ??
      awardMatchPoints(
        prediction.predicted_home,
        prediction.predicted_away,
        match.home_score,
        match.away_score,
        match.result_confirmed,
        isDefault
      );

    lines.push({
      user_id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      predicted_home: prediction.predicted_home,
      predicted_away: prediction.predicted_away,
      points,
      is_default: isDefault,
      result_label: baseResultLabel(
        prediction.predicted_home,
        prediction.predicted_away,
        match.home_score,
        match.away_score,
        match.result_confirmed
      ),
    });
  }

  lines.sort((a, b) => b.points - a.points);

  return {
    match_id: match.id,
    home_team: match.home_team,
    away_team: match.away_team,
    actual_home: match.home_score,
    actual_away: match.away_score,
    result_confirmed: match.result_confirmed,
    predictions: lines,
  };
}

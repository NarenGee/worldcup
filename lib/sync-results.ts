import type { SupabaseClient } from "@supabase/supabase-js";
import { applyDefaultPredictions } from "@/lib/apply-default-predictions";
import { isResultConfirmed, TBD_TEAM, upsertMatchFromApi } from "@/lib/match-sync";
import { scorePredictions } from "@/lib/score-predictions";
import type { Database } from "@/lib/supabase/types";

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group",
  LAST_32: "r32",
  LAST_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  FINAL: "final",
  THIRD_PLACE: "final",
};

type ApiMatch = {
  id: number;
  stage: string;
  status: string;
  utcDate: string;
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
  score: {
    duration?: string;
    fullTime: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null };
  };
};

// Predictions are settled on the 90-minute result only, so extra time and
// penalty shootouts are excluded. football-data.org aggregates those into
// score.fullTime, but exposes the 90-minute score via score.regularTime
// whenever a match goes beyond regulation. For matches decided in regular
// time, regularTime is absent and fullTime already equals the 90-minute score.
function getRegularTimeScore(score: ApiMatch["score"]): {
  home: number | null;
  away: number | null;
} {
  const regular = score?.regularTime;
  if (regular && (regular.home !== null || regular.away !== null)) {
    return { home: regular.home, away: regular.away };
  }
  return {
    home: score?.fullTime?.home ?? null,
    away: score?.fullTime?.away ?? null,
  };
}

export async function syncResultsFromApi(
  supabase: SupabaseClient<Database>,
  apiKey: string
) {
  const response = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
    {
      headers: { "X-Auth-Token": apiKey },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `football-data.org API error (${response.status}): ${text.slice(0, 200)}`
    );
  }

  const body = await response.json();
  const apiMatches: ApiMatch[] = body.matches ?? [];

  let upserted = 0;
  let skipped = 0;

  for (const match of apiMatches) {
    const stage = STAGE_MAP[match.stage];
    if (!stage) {
      skipped++;
      continue;
    }

    const externalId = String(match.id);
    const isFinished = isResultConfirmed(match.status);
    const { home: homeScore, away: awayScore } = getRegularTimeScore(
      match.score
    );

    const result = await upsertMatchFromApi(supabase, {
      stage: stage as Database["public"]["Tables"]["matches"]["Insert"]["stage"],
      home_team: match.homeTeam.name ?? TBD_TEAM,
      away_team: match.awayTeam.name ?? TBD_TEAM,
      kickoff_at: match.utcDate,
      home_score: isFinished ? homeScore : null,
      away_score: isFinished ? awayScore : null,
      result_confirmed: isFinished,
      external_id: externalId,
    });

    if (result === "upserted") upserted++;
    else skipped++;
  }

  let predictionsScored = 0;

  try {
    await applyDefaultPredictions(supabase);
  } catch {
    // Migration may not be applied yet.
  }

  try {
    predictionsScored = await scorePredictions(supabase);
  } catch {
    // Migration may not be applied yet.
  }

  return { total: apiMatches.length, upserted, skipped, predictionsScored };
}

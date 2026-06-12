import type { SupabaseClient } from "@supabase/supabase-js";
import { applyDefaultPredictions } from "@/lib/apply-default-predictions";
import { scorePredictions } from "@/lib/score-predictions";
import type { Database } from "@/lib/supabase/types";

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group",
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
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
};

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
    const isFinished = match.status === "FINISHED";
    const homeScore = match.score?.fullTime?.home ?? null;
    const awayScore = match.score?.fullTime?.away ?? null;

    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();

    const payload = {
      stage: stage as Database["public"]["Tables"]["matches"]["Insert"]["stage"],
      home_team: match.homeTeam.name,
      away_team: match.awayTeam.name,
      kickoff_at: match.utcDate,
      home_score: isFinished ? homeScore : null,
      away_score: isFinished ? awayScore : null,
      result_confirmed: isFinished,
      external_id: externalId,
    };

    if (existing) {
      const { error } = await supabase
        .from("matches")
        .update(payload)
        .eq("id", existing.id);
      if (!error) upserted++;
    } else {
      const { error } = await supabase.from("matches").insert(payload);
      if (!error) upserted++;
    }
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

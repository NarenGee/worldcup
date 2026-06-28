import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group",
  LAST_32: "r32",
  LAST_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  FINAL: "final",
  THIRD_PLACE: "final",
};

const TBD_TEAM = "TBD";

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

const FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);

function isResultConfirmed(status: string): boolean {
  return FINISHED_STATUSES.has(status);
}

function isPlaceholderTeam(team: string): boolean {
  return team === TBD_TEAM;
}

async function findMatchByFixture(
  supabase: ReturnType<typeof createClient>,
  homeTeam: string,
  awayTeam: string,
  kickoffAt: string
) {
  const { data } = await supabase
    .from("matches")
    .select("id, external_id, home_team, away_team, kickoff_at")
    .eq("home_team", homeTeam)
    .eq("away_team", awayTeam)
    .eq("kickoff_at", kickoffAt)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}

async function findMatchByExternalId(
  supabase: ReturnType<typeof createClient>,
  externalId: string
) {
  const { data } = await supabase
    .from("matches")
    .select("id, external_id, home_team, away_team, kickoff_at")
    .eq("external_id", externalId)
    .maybeSingle();

  return data;
}

async function upsertMatchFromApi(
  supabase: ReturnType<typeof createClient>,
  payload: {
    stage: string;
    home_team: string;
    away_team: string;
    kickoff_at: string;
    home_score: number | null;
    away_score: number | null;
    result_confirmed: boolean;
    external_id: string;
  }
): Promise<"upserted" | "skipped"> {
  const teamsAreDecided =
    !isPlaceholderTeam(payload.home_team) &&
    !isPlaceholderTeam(payload.away_team);

  const [byExternalId, byFixture] = await Promise.all([
    findMatchByExternalId(supabase, payload.external_id),
    teamsAreDecided
      ? findMatchByFixture(
          supabase,
          payload.home_team,
          payload.away_team,
          payload.kickoff_at
        )
      : Promise.resolve(null),
  ]);

  if (byFixture && byExternalId && byFixture.id !== byExternalId.id) {
    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("id", byExternalId.id);

    if (deleteError) {
      console.error(
        `[sync-results] delete failed for external_id=${payload.external_id}:`,
        deleteError.message
      );
      return "skipped";
    }

    const { error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", byFixture.id);

    if (error) {
      console.error(
        `[sync-results] update failed for external_id=${payload.external_id}:`,
        error.message
      );
    }
    return error ? "skipped" : "upserted";
  }

  const target = byExternalId ?? byFixture;

  if (target) {
    const { error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", target.id);

    if (error) {
      console.error(
        `[sync-results] update failed for external_id=${payload.external_id}:`,
        error.message
      );
    }
    return error ? "skipped" : "upserted";
  }

  const { error } = await supabase.from("matches").insert(payload);
  if (error) {
    console.error(
      `[sync-results] insert failed for external_id=${payload.external_id}:`,
      error.message
    );
  }
  return error ? "skipped" : "upserted";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
      {
        headers: { "X-Auth-Token": apiKey },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          error: `football-data.org API error: ${response.status}`,
          details: text,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await response.json();
    const apiMatches: ApiMatch[] = body.matches ?? [];

    const supabase = createClient(supabaseUrl, serviceRoleKey);
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
        stage,
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

    const { error: defaultError } = await supabase.rpc(
      "apply_default_predictions"
    );
    if (defaultError) {
      console.warn("apply_default_predictions:", defaultError.message);
    }

    let predictionsScored = 0;
    const { data: scored, error: scoreError } = await supabase.rpc(
      "score_predictions"
    );
    if (scoreError) {
      console.warn("score_predictions:", scoreError.message);
    } else {
      predictionsScored = scored ?? 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: apiMatches.length,
        upserted,
        skipped,
        predictionsScored,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

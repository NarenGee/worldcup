import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);

function isResultConfirmed(status: string): boolean {
  return FINISHED_STATUSES.has(status);
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
  const [byExternalId, byFixture] = await Promise.all([
    findMatchByExternalId(supabase, payload.external_id),
    findMatchByFixture(
      supabase,
      payload.home_team,
      payload.away_team,
      payload.kickoff_at
    ),
  ]);

  if (byFixture && byExternalId && byFixture.id !== byExternalId.id) {
    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("id", byExternalId.id);

    if (deleteError) {
      return "skipped";
    }

    const { error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", byFixture.id);

    return error ? "skipped" : "upserted";
  }

  const target = byExternalId ?? byFixture;

  if (target) {
    const { error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", target.id);

    return error ? "skipped" : "upserted";
  }

  const { error } = await supabase.from("matches").insert(payload);
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
      const homeScore = match.score?.fullTime?.home ?? null;
      const awayScore = match.score?.fullTime?.away ?? null;

      const result = await upsertMatchFromApi(supabase, {
        stage,
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
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

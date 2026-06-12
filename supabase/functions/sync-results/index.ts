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
      const isFinished = match.status === "FINISHED";
      const homeScore = match.score?.fullTime?.home ?? null;
      const awayScore = match.score?.fullTime?.away ?? null;

      const { data: existing } = await supabase
        .from("matches")
        .select("id")
        .eq("external_id", externalId)
        .maybeSingle();

      const payload = {
        stage,
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

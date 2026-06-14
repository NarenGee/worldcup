import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type MatchRow = Pick<
  Database["public"]["Tables"]["matches"]["Row"],
  "id" | "external_id" | "home_team" | "away_team" | "kickoff_at"
>;

export type ApiMatchPayload = {
  stage: Database["public"]["Tables"]["matches"]["Insert"]["stage"];
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  result_confirmed: boolean;
  external_id: string;
};

const FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);

export function isResultConfirmed(status: string): boolean {
  return FINISHED_STATUSES.has(status);
}

async function findMatchByFixture(
  supabase: SupabaseClient<Database>,
  homeTeam: string,
  awayTeam: string,
  kickoffAt: string
): Promise<MatchRow | null> {
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
  supabase: SupabaseClient<Database>,
  externalId: string
): Promise<MatchRow | null> {
  const { data } = await supabase
    .from("matches")
    .select("id, external_id, home_team, away_team, kickoff_at")
    .eq("external_id", externalId)
    .maybeSingle();

  return data;
}

export async function upsertMatchFromApi(
  supabase: SupabaseClient<Database>,
  payload: ApiMatchPayload
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

  if (
    byFixture &&
    byExternalId &&
    byFixture.id !== byExternalId.id
  ) {
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

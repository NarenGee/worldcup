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

// Placeholder for knockout fixtures whose teams aren't decided yet.
export const TBD_TEAM = "TBD";

export function isResultConfirmed(status: string): boolean {
  return FINISHED_STATUSES.has(status);
}

function isPlaceholderTeam(team: string): boolean {
  return team === TBD_TEAM;
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
  // Undecided knockout fixtures share placeholder names ("TBD"), so matching by
  // fixture would collapse distinct matches together. For those, rely solely on
  // the unique external_id.
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
      console.error(
        `[match-sync] delete failed for external_id=${payload.external_id}:`,
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
        `[match-sync] update failed for external_id=${payload.external_id}:`,
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
        `[match-sync] update failed for external_id=${payload.external_id}:`,
        error.message
      );
    }
    return error ? "skipped" : "upserted";
  }

  const { error } = await supabase.from("matches").insert(payload);
  if (error) {
    console.error(
      `[match-sync] insert failed for external_id=${payload.external_id}:`,
      error.message
    );
  }
  return error ? "skipped" : "upserted";
}

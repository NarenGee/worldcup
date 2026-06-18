import type { SupabaseClient } from "@supabase/supabase-js";
import { awardMatchPoints, baseResultLabel, calculatePropsPoints } from "@/lib/scoring";
import {
  formatDateInTimezone,
  formatDisplayDate,
  getDailySummaryTimezone,
  isOnOrBeforeDate,
  isTimestampOnDate,
} from "@/lib/daily-summary-timezone";
import type { Database } from "@/lib/supabase/types";
import { createHash } from "crypto";

import type { PickKind } from "@/lib/daily-summary-format";
import { classifyPick } from "@/lib/daily-summary-format";

export type DailySummaryPlayerMatch = {
  display_name: string;
  predicted_score: string;
  pick_kind: PickKind;
  points: number;
  result_label: "exact" | "outcome" | "miss";
};

export type DailySummaryMatch = {
  match_id: number;
  stage: string;
  home_team: string;
  away_team: string;
  actual_score: string;
  player_results: DailySummaryPlayerMatch[];
};

export type DailySummaryPlayerDay = {
  display_name: string;
  points_today: number;
  exact_count: number;
  outcome_count: number;
  miss_count: number;
  default_pick_count: number;
  chosen_one_one_count: number;
};

export type DailySummaryData = {
  date: string;
  date_label: string;
  timezone: string;
  matches: DailySummaryMatch[];
  player_totals: DailySummaryPlayerDay[];
  leaderboard: { rank: number; display_name: string; total_score: number }[];
};

type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "display_name">;

type ConfirmedMatchRow = Pick<
  Database["public"]["Tables"]["matches"]["Row"],
  | "id"
  | "stage"
  | "home_team"
  | "away_team"
  | "kickoff_at"
  | "home_score"
  | "away_score"
  | "result_confirmed"
  | "result_confirmed_at"
>;

function scoreLabel(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): DailySummaryPlayerMatch["result_label"] {
  return baseResultLabel(
    predictedHome,
    predictedAway,
    actualHome,
    actualAway,
    true
  );
}

function matchConfirmedAt(match: ConfirmedMatchRow): string {
  return match.result_confirmed_at ?? match.kickoff_at;
}

async function buildLeaderboardAsOfDate(
  supabase: SupabaseClient<Database>,
  profiles: ProfileRow[],
  targetDate: string,
  timezone: string,
  confirmedMatches: ConfirmedMatchRow[]
): Promise<DailySummaryData["leaderboard"]> {
  const eligibleMatches = confirmedMatches.filter((match) =>
    isOnOrBeforeDate(matchConfirmedAt(match), targetDate, timezone)
  );
  const eligibleMatchIds = new Set(eligibleMatches.map((match) => match.id));
  const matchById = new Map(eligibleMatches.map((match) => [match.id, match]));

  const scores = new Map(profiles.map((profile) => [profile.id, 0]));

  if (eligibleMatchIds.size > 0) {
    const { data: predictions } = await supabase
      .from("predictions")
      .select(
        "user_id, match_id, predicted_home, predicted_away, points, is_default"
      )
      .in("match_id", Array.from(eligibleMatchIds));

    for (const prediction of predictions ?? []) {
      const match = matchById.get(prediction.match_id);
      if (!match || match.home_score === null || match.away_score === null) {
        continue;
      }

      const points =
        prediction.points ??
        awardMatchPoints(
          prediction.predicted_home,
          prediction.predicted_away,
          match.home_score,
          match.away_score,
          true,
          prediction.is_default ?? false
        );

      scores.set(
        prediction.user_id,
        (scores.get(prediction.user_id) ?? 0) + points
      );
    }
  }

  const [{ data: tournamentResults }, { data: props }] = await Promise.all([
    supabase
      .from("tournament_results")
      .select("champion, top_scorer, updated_at")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("props").select("user_id, champion, top_scorer"),
  ]);

  if (
    tournamentResults?.updated_at &&
    isOnOrBeforeDate(tournamentResults.updated_at, targetDate, timezone)
  ) {
    for (const prop of props ?? []) {
      const bonus = calculatePropsPoints(
        prop.champion,
        prop.top_scorer,
        tournamentResults.champion,
        tournamentResults.top_scorer
      );
      scores.set(prop.user_id, (scores.get(prop.user_id) ?? 0) + bonus);
    }
  }

  return profiles
    .map((profile) => ({
      display_name: profile.display_name,
      total_score: scores.get(profile.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.total_score - a.total_score ||
        a.display_name.localeCompare(b.display_name)
    )
    .map((entry, index) => ({
      rank: index + 1,
      display_name: entry.display_name,
      total_score: entry.total_score,
    }));
}

export async function listRecapDates(
  supabase: SupabaseClient<Database>
): Promise<{ dates: string[]; today: string }> {
  const timezone = getDailySummaryTimezone();
  const today = formatDateInTimezone(new Date(), timezone);

  const { data: confirmedMatches } = await supabase
    .from("matches")
    .select("result_confirmed_at, kickoff_at")
    .eq("result_confirmed", true);

  const dateSet = new Set<string>([today]);

  for (const match of confirmedMatches ?? []) {
    const confirmedAt = match.result_confirmed_at ?? match.kickoff_at;
    if (confirmedAt) {
      dateSet.add(formatDateInTimezone(new Date(confirmedAt), timezone));
    }
  }

  return {
    dates: Array.from(dateSet).sort(),
    today,
  };
}

export async function buildDailySummaryData(
  supabase: SupabaseClient<Database>,
  dateStr?: string
): Promise<DailySummaryData> {
  const timezone = getDailySummaryTimezone();
  const targetDate = dateStr ?? formatDateInTimezone(new Date(), timezone);

  const [{ data: profiles }, { data: confirmedMatches }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("matches")
      .select(
        "id, stage, home_team, away_team, kickoff_at, home_score, away_score, result_confirmed, result_confirmed_at"
      )
      .eq("result_confirmed", true),
  ]);

  const activeProfiles = profiles ?? [];
  const allConfirmedMatches = confirmedMatches ?? [];

  const todaysMatches = allConfirmedMatches.filter((match) => {
    if (match.home_score === null || match.away_score === null) {
      return false;
    }

    return isTimestampOnDate(matchConfirmedAt(match), targetDate, timezone);
  });

  const matchIds = todaysMatches.map((match) => match.id);
  const profileById = new Map(activeProfiles.map((profile) => [profile.id, profile]));

  let predictions: {
    user_id: string;
    match_id: number;
    predicted_home: number;
    predicted_away: number;
    points: number | null;
    is_default: boolean | null;
  }[] = [];

  if (matchIds.length > 0) {
    const { data } = await supabase
      .from("predictions")
      .select(
        "user_id, match_id, predicted_home, predicted_away, points, is_default"
      )
      .in("match_id", matchIds);
    predictions = data ?? [];
  }

  const predictionsByMatch = new Map<number, typeof predictions>();
  for (const prediction of predictions) {
    const existing = predictionsByMatch.get(prediction.match_id) ?? [];
    existing.push(prediction);
    predictionsByMatch.set(prediction.match_id, existing);
  }

  const playerStats = new Map<
    string,
    DailySummaryPlayerDay & { user_id: string }
  >();

  for (const profile of activeProfiles) {
    playerStats.set(profile.id, {
      user_id: profile.id,
      display_name: profile.display_name,
      points_today: 0,
      exact_count: 0,
      outcome_count: 0,
      miss_count: 0,
      default_pick_count: 0,
      chosen_one_one_count: 0,
    });
  }

  const matches: DailySummaryMatch[] = todaysMatches
    .sort(
      (a, b) =>
        new Date(matchConfirmedAt(a)).getTime() -
        new Date(matchConfirmedAt(b)).getTime()
    )
    .map((match) => {
      const actualHome = match.home_score as number;
      const actualAway = match.away_score as number;
      const matchPredictions = predictionsByMatch.get(match.id) ?? [];

      const player_results: DailySummaryPlayerMatch[] = matchPredictions
        .map((prediction) => {
          const profile = profileById.get(prediction.user_id);
          if (!profile) return null;

          const isDefault = prediction.is_default ?? false;
          const pickKind = classifyPick(
            prediction.predicted_home,
            prediction.predicted_away,
            isDefault
          );
          const points =
            prediction.points ??
            awardMatchPoints(
              prediction.predicted_home,
              prediction.predicted_away,
              actualHome,
              actualAway,
              true,
              isDefault
            );
          const result_label = scoreLabel(
            prediction.predicted_home,
            prediction.predicted_away,
            actualHome,
            actualAway
          );

          const stats = playerStats.get(prediction.user_id);
          if (stats) {
            stats.points_today += points;
            if (result_label === "exact") stats.exact_count += 1;
            else if (result_label === "outcome") stats.outcome_count += 1;
            else stats.miss_count += 1;
            if (pickKind === "default") stats.default_pick_count += 1;
            if (pickKind === "chosen_one_one") stats.chosen_one_one_count += 1;
          }

          return {
            display_name: profile.display_name,
            predicted_score: `${prediction.predicted_home}-${prediction.predicted_away}`,
            pick_kind: pickKind,
            points,
            result_label,
          };
        })
        .filter((row): row is DailySummaryPlayerMatch => row !== null)
        .sort(
          (a, b) =>
            b.points - a.points || a.display_name.localeCompare(b.display_name)
        );

      return {
        match_id: match.id,
        stage: match.stage,
        home_team: match.home_team,
        away_team: match.away_team,
        actual_score: `${actualHome}-${actualAway}`,
        player_results,
      };
    });

  const player_totals = Array.from(playerStats.values())
    .filter(
      (player) =>
        player.points_today > 0 ||
        player.exact_count > 0 ||
        player.outcome_count > 0 ||
        player.miss_count > 0
    )
    .sort(
      (a, b) =>
        b.points_today - a.points_today ||
        b.exact_count - a.exact_count ||
        a.display_name.localeCompare(b.display_name)
    )
    .map(
      ({
        display_name,
        points_today,
        exact_count,
        outcome_count,
        miss_count,
        default_pick_count,
        chosen_one_one_count,
      }) => ({
        display_name,
        points_today,
        exact_count,
        outcome_count,
        miss_count,
        default_pick_count,
        chosen_one_one_count,
      })
    );

  const leaderboard = await buildLeaderboardAsOfDate(
    supabase,
    activeProfiles,
    targetDate,
    timezone,
    allConfirmedMatches
  );

  return {
    date: targetDate,
    date_label: formatDisplayDate(targetDate, timezone),
    timezone,
    matches,
    player_totals,
    leaderboard,
  };
}

export function hashDailySummaryData(data: DailySummaryData): string {
  return createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
}

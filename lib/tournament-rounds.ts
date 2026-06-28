import type { Match } from "@/lib/supabase/types";
import { STAGE_LABELS } from "@/lib/teams";

const KNOCKOUT_STAGE_ORDER = ["r32", "r16", "qf", "sf", "final"] as const;

export type TournamentRoundKind = "group-md" | "knockout" | "props" | "live";

export type TournamentRound = {
  id: string;
  label: string;
  shortLabel: string;
  kind: TournamentRoundKind;
  order: number;
  groupMatchday?: number;
  stage?: Match["stage"];
};

function kickoffDateKey(kickoffAt: string): string {
  return kickoffAt.slice(0, 10);
}

function maxGroupMatchday(groupMatchdayMap: Map<number, number>): number {
  let max = 0;
  groupMatchdayMap.forEach((matchday) => {
    if (matchday > max) max = matchday;
  });
  return max;
}

export function buildGroupMatchdayMap(matches: Match[]): Map<number, number> {
  const groupMatches = matches.filter((match) => match.stage === "group");
  const uniqueDates = Array.from(
    new Set(groupMatches.map((match) => kickoffDateKey(match.kickoff_at)))
  ).sort();

  const dateToMatchday = new Map(uniqueDates.map((date, index) => [date, index + 1]));
  const matchIdToMatchday = new Map<number, number>();

  for (const match of groupMatches) {
    const matchday = dateToMatchday.get(kickoffDateKey(match.kickoff_at));
    if (matchday) {
      matchIdToMatchday.set(match.id, matchday);
    }
  }

  return matchIdToMatchday;
}

export function getMatchRoundOrder(
  match: Match,
  groupMatchdayMap: Map<number, number>
): number {
  if (match.stage === "group") {
    return groupMatchdayMap.get(match.id) ?? 0;
  }

  const knockoutIndex = KNOCKOUT_STAGE_ORDER.indexOf(
    match.stage as (typeof KNOCKOUT_STAGE_ORDER)[number]
  );
  if (knockoutIndex >= 0) {
    const maxMd = maxGroupMatchday(groupMatchdayMap);
    return maxMd + knockoutIndex + 1;
  }

  return 999;
}

export function buildTournamentRounds(
  matches: Match[],
  propsResultsSet: boolean
): TournamentRound[] {
  const groupMatchdayMap = buildGroupMatchdayMap(matches);
  const uniqueMatchdays = Array.from(new Set(groupMatchdayMap.values())).sort(
    (a, b) => a - b
  );

  const rounds: TournamentRound[] = [];
  let order = 0;

  for (const matchday of uniqueMatchdays) {
    order += 1;
    rounds.push({
      id: `group-md-${matchday}`,
      label: `Matchday ${matchday} · Group Stage`,
      shortLabel: `MD${matchday}`,
      kind: "group-md",
      order,
      groupMatchday: matchday,
    });
  }

  for (const stage of KNOCKOUT_STAGE_ORDER) {
    const hasStageMatches = matches.some((match) => match.stage === stage);
    if (!hasStageMatches) continue;

    order += 1;
    rounds.push({
      id: stage,
      label: STAGE_LABELS[stage] ?? stage,
      shortLabel: STAGE_LABELS[stage] ?? stage,
      kind: "knockout",
      order,
      stage,
    });
  }

  if (propsResultsSet) {
    order += 1;
    rounds.push({
      id: "props",
      label: "Tournament Props",
      shortLabel: "Props",
      kind: "props",
      order,
    });
  }

  order += 1;
  rounds.push({
    id: "live",
    label: "Live · Current",
    shortLabel: "Live",
    kind: "live",
    order,
  });

  return rounds;
}

export function getMatchesForRound(
  matches: Match[],
  round: TournamentRound,
  groupMatchdayMap: Map<number, number>
): Match[] {
  if (round.kind === "live" || round.kind === "props") {
    return matches;
  }

  return matches.filter(
    (match) => getMatchRoundOrder(match, groupMatchdayMap) <= round.order
  );
}

export function formatMatchStepLabel(match: Match): string {
  const home = match.home_team.length > 12
    ? `${match.home_team.slice(0, 10)}…`
    : match.home_team;
  const away = match.away_team.length > 12
    ? `${match.away_team.slice(0, 10)}…`
    : match.away_team;
  return `${home} v ${away}`;
}

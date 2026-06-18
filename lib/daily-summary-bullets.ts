import type { DailySummaryData } from "@/lib/daily-summary-data";
import type { PickKind } from "@/lib/daily-summary-format";
import { formatAwardedPoints } from "@/lib/scoring";

type PickEntry = {
  name: string;
  match: string;
  points: string;
  result: string;
};

function shortMatchLabel(match: DailySummaryData["matches"][number]): string {
  return `${match.home_team} v ${match.away_team}`;
}

function collectByPickKind(data: DailySummaryData, kind: PickKind): PickEntry[] {
  const entries: PickEntry[] = [];

  for (const match of data.matches) {
    for (const player of match.player_results) {
      if (player.pick_kind !== kind) continue;
      entries.push({
        name: player.display_name,
        match: shortMatchLabel(match),
        points: formatAwardedPoints(player.points),
        result: player.result_label,
      });
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

function joinEntries(entries: PickEntry[]): string {
  return entries
    .map((entry) => `${entry.name} (${entry.match}, ${entry.points} pts, ${entry.result})`)
    .join(" · ");
}

export function buildConciseDailySummary(data: DailySummaryData): string {
  if (data.matches.length === 0) {
    return "- No results were confirmed on this day.";
  }

  const results = data.matches
    .map((match) => `${match.home_team} ${match.actual_score} ${match.away_team}`)
    .join(" · ");

  const exactHeroes = data.player_totals.filter((player) => player.exact_count > 0);
  const topPlayer = data.player_totals[0];

  let bestPicks: string;
  if (exactHeroes.length > 0) {
    bestPicks = exactHeroes
      .map(
        (player) =>
          `${player.display_name} (${player.exact_count} exact, +${formatAwardedPoints(player.points_today)})`
      )
      .join(" · ");
  } else if (topPlayer) {
    bestPicks = `${topPlayer.display_name} (+${formatAwardedPoints(topPlayer.points_today)} pts)`;
  } else {
    bestPicks = "nobody distinguished themselves";
  }

  const deliberateOneOnes = collectByPickKind(data, "chosen_one_one");
  const autoDefaults = collectByPickKind(data, "default");

  const deliberateLine =
    deliberateOneOnes.length > 0 ? joinEntries(deliberateOneOnes) : "none";

  const autoDefaultLine =
    autoDefaults.length > 0
      ? joinEntries(autoDefaults)
      : "none, everyone submitted on time";

  const standings = data.leaderboard
    .slice(0, 4)
    .map((entry) => `#${entry.rank} ${entry.display_name} (${entry.total_score})`)
    .join(" · ");

  return [
    `- Results: ${results}`,
    `- Best picks: ${bestPicks}`,
    `- Deliberate 1-1 picks (submitted before kickoff): ${deliberateLine}`,
    `- Missed deadline, auto 1-1 (half points): ${autoDefaultLine}`,
    `- Standings: ${standings || "unchanged"}`,
  ].join("\n");
}

export function buildFullDailySummaryFast(data: DailySummaryData): string {
  return buildConciseDailySummary(data);
}

export async function buildFullDailySummaryWithAi(
  data: DailySummaryData
): Promise<string> {
  return buildConciseDailySummary(data);
}

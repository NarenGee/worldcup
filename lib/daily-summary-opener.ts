import type { DailySummaryData, DailySummaryMatch } from "@/lib/daily-summary-data";
import { pickKindDescription } from "@/lib/daily-summary-format";
import { formatAwardedPoints } from "@/lib/scoring";

export type PlayerDayPick = {
  name: string;
  match: string;
  predicted_score: string;
  pick_kind: DailySummaryData["matches"][number]["player_results"][number]["pick_kind"];
  result: string;
  points: string;
  points_today: number;
};

function shortMatchLabel(match: DailySummaryMatch): string {
  return `${match.home_team} v ${match.away_team}`;
}

export function sanitizeOpenerText(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/—/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function collectPlayerDayPicks(data: DailySummaryData): PlayerDayPick[] {
  const byName = new Map<string, PlayerDayPick[]>();

  for (const match of data.matches) {
    for (const player of match.player_results) {
      const entry: PlayerDayPick = {
        name: player.display_name,
        match: shortMatchLabel(match),
        predicted_score: player.predicted_score,
        pick_kind: player.pick_kind,
        result: player.result_label,
        points: formatAwardedPoints(player.points),
        points_today: 0,
      };
      const existing = byName.get(player.display_name) ?? [];
      existing.push(entry);
      byName.set(player.display_name, existing);
    }
  }

  const totals = new Map(
    data.player_totals.map((player) => [player.display_name, player.points_today])
  );

  return Array.from(byName.entries())
    .flatMap(([name, picks]) =>
      picks.map((pick) => ({
        ...pick,
        points_today: totals.get(name) ?? 0,
      }))
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        a.match.localeCompare(b.match)
    );
}

export function buildOpenerPrompt(data: DailySummaryData): string {
  const picks = collectPlayerDayPicks(data);
  const players = Array.from(new Set(picks.map((pick) => pick.name))).sort();

  const lines = [
    `Date: ${data.date_label}`,
    `Players to mention (every one): ${players.join(", ")}`,
    "",
    "Pick types:",
    "- deliberate 1-1: player chose 1-1 before kickoff",
    "- auto-default 1-1: player missed deadline; system assigned 1-1 (half points)",
    "- chosen: any other pick submitted before kickoff",
    "",
    "Player picks and results:",
  ];

  for (const pick of picks) {
    lines.push(
      `- ${pick.name}: ${pick.match}, picked ${pick.predicted_score} (${pickKindDescription(pick.pick_kind)}), ${pick.result}, ${pick.points} pts`
    );
  }

  lines.push(
    "",
    "Day totals:",
    ...data.player_totals.map(
      (player) =>
        `- ${player.display_name}: ${formatAwardedPoints(player.points_today)} pts today`
    ),
    "",
    "Write exactly ONE bullet line starting with '- '.",
    "Tone: British humour, dry, understated, factual, lightly sarcastic but friendly.",
    "State what each player picked and how they did; weave in a dry joke where deserved.",
    "Never confuse deliberate 1-1 with auto-default 1-1. Missed deadlines are fair game for ribbing.",
    "Never use em dashes. Use commas, semicolons, or full stops.",
    "You must mention every player and end on a complete sentence. Do not cut off mid-thought.",
    "Keep each player brief if needed, but cover everyone. No other bullets."
  );

  return lines.join("\n");
}

function dryVerdict(pick: PlayerDayPick): string {
  if (pick.result === "exact") {
    return `${pick.name} nailed ${pick.predicted_score} on ${pick.match}, insufferably correct`;
  }
  if (pick.pick_kind === "default") {
    return `${pick.name} missed the deadline on ${pick.match}, got the auto 1-1 and ${pick.points} pts`;
  }
  if (pick.pick_kind === "chosen_one_one") {
    return `${pick.name} chose 1-1 on ${pick.match} on purpose (${pick.points} pts), brave or bored`;
  }
  if (pick.result === "outcome") {
    return `${pick.name} had the result right on ${pick.match} but not the score (${pick.predicted_score}, ${pick.points} pts)`;
  }
  return `${pick.name} went ${pick.predicted_score} on ${pick.match} for ${pick.points} pts, best forgotten`;
}

export function buildOpenerFallbackBullet(data: DailySummaryData): string {
  const picks = collectPlayerDayPicks(data);
  if (picks.length === 0) {
    return "- Quiet day, no results, no points, and no material for anyone to be smug about.";
  }

  const uniquePlayers = Array.from(new Set(picks.map((pick) => pick.name)));
  const verdicts = uniquePlayers.map((name) => {
    const playerPicks = picks.filter((pick) => pick.name === name);
    const best = playerPicks.find((pick) => pick.result === "exact") ?? playerPicks[0];
    return dryVerdict(best);
  });

  const closing =
    uniquePlayers.length === 1
      ? "Still counts."
      : "Everyone contributed something, mostly disappointment.";

  return `- ${verdicts.join("; ")}. ${closing}`;
}

export function normalizeOpenerBullet(text: string): string {
  const trimmed = sanitizeOpenerText(text.trim());
  const singleLine = trimmed.replace(/\s*\n+\s*/g, " ");
  const withoutBullet = singleLine.replace(/^[-•]\s*/, "").trim();
  return `- ${withoutBullet}`;
}

import type { DailySummaryData, DailySummaryMatch } from "@/lib/daily-summary-data";
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

type PlayerDayRollup = {
  name: string;
  points_today: number;
  picks: PlayerDayPick[];
  exact_count: number;
  outcome_count: number;
  miss_count: number;
  default_count: number;
  chosen_one_one_count: number;
};

const SECTION_LABEL =
  /^(Results|Best picks|Deliberate 1-1 picks|Missed deadline|Standings|No results)/;

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

export function isOpenerBulletLine(text: string): boolean {
  const label = text.split(":")[0]?.trim() ?? "";
  return label.length > 0 && !SECTION_LABEL.test(label);
}

function hashDate(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i += 1) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickFrom<T>(items: T[], seed: string): T {
  return items[hashDate(seed) % items.length];
}

function shuffleByDate<T>(items: T[], date: string): T[] {
  const shuffled = [...items];
  let seed = hashDate(date);

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
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

export function rollupPlayersByDay(data: DailySummaryData): PlayerDayRollup[] {
  const picks = collectPlayerDayPicks(data);
  const byName = new Map<string, PlayerDayPick[]>();

  for (const pick of picks) {
    const existing = byName.get(pick.name) ?? [];
    existing.push(pick);
    byName.set(pick.name, existing);
  }

  const rollups = Array.from(byName.entries()).map(([name, playerPicks]) => ({
    name,
    points_today: playerPicks[0]?.points_today ?? 0,
    picks: playerPicks,
    exact_count: playerPicks.filter((pick) => pick.result === "exact").length,
    outcome_count: playerPicks.filter((pick) => pick.result === "outcome").length,
    miss_count: playerPicks.filter((pick) => pick.result === "miss").length,
    default_count: playerPicks.filter((pick) => pick.pick_kind === "default").length,
    chosen_one_one_count: playerPicks.filter(
      (pick) => pick.pick_kind === "chosen_one_one"
    ).length,
  }));

  return shuffleByDate(rollups, data.date);
}

function concisePerformance(player: PlayerDayRollup): string {
  const pts = formatAwardedPoints(player.points_today);

  if (player.picks.length === 1) {
    const pick = player.picks[0];
    if (pick.result === "exact") {
      return `${pick.predicted_score} exact, ${pts} pts`;
    }
    if (pick.pick_kind === "default") {
      return `no pick, auto 1-1, ${pts} pts`;
    }
    if (pick.pick_kind === "chosen_one_one") {
      return `1-1 by choice, ${pts} pts`;
    }
    if (pick.result === "outcome") {
      return `right result, ${pts} pts`;
    }
    return `${pick.predicted_score}, ${pts} pts`;
  }

  const bits: string[] = [];
  if (player.exact_count) bits.push(`${player.exact_count} exact`);
  if (player.outcome_count) bits.push(`${player.outcome_count} outcome`);
  if (player.miss_count) bits.push(`${player.miss_count} miss`);
  if (player.default_count) bits.push(`${player.default_count} late`);

  return `${pts} pts (${bits.join(", ")})`;
}

function sarcasticRemark(player: PlayerDayRollup, date: string): string {
  const seed = `${date}:${player.name}`;

  if (player.default_count > 0 && player.default_count === player.picks.length) {
    return pickFrom(
      ["deadline optional", "half points for nothing", "forgot to pick", "asleep at the wheel"],
      seed
    );
  }

  if (player.exact_count > 0 && player.miss_count === 0 && player.default_count === 0) {
    return pickFrom(
      ["insufferable", "won't shut up about it", "on the money", "victory lap incoming"],
      seed
    );
  }

  if (player.exact_count > 0) {
    return pickFrom(["part oracle", "one right counts", "flashes of genius"], seed);
  }

  if (player.default_count > 0) {
    return pickFrom(["auto 1-1 bail-out", "deadline was a suggestion", "still wanted full credit"], seed);
  }

  if (player.chosen_one_one_count > 0 && player.points_today > 0) {
    return pickFrom(["1-1 paid off", "bored or clever", "safe and rewarded"], seed);
  }

  if (player.outcome_count > 0 && player.points_today > 0) {
    return pickFrom(["right idea", "close enough", "nearly had it"], seed);
  }

  if (player.points_today === 0) {
    return pickFrom(["all wrong", "blank day", "optimism unrewarded", "zero to show"], seed);
  }

  return pickFrom(["mixed bag", "could be worse", "points on the board"], seed);
}

function playerTake(player: PlayerDayRollup, date: string): string {
  return `${player.name}: ${concisePerformance(player)}, ${sarcasticRemark(player, date)}`;
}

export function buildOpenerPrompt(data: DailySummaryData): string {
  const rollups = rollupPlayersByDay(data);
  const players = rollups.map((player) => player.name);

  const lines = [
    `Date: ${data.date_label}`,
    `Players (every one, random order): ${players.join(", ")}`,
    "",
    "About each player's picks today, not match results.",
    "",
    "Data:",
  ];

  for (const player of rollups) {
    lines.push(`- ${player.name}: ${formatAwardedPoints(player.points_today)} pts`);
    for (const pick of player.picks) {
      lines.push(
        `  · ${pick.match}: ${pick.predicted_score} (${pick.pick_kind}, ${pick.result}, ${pick.points} pts)`
      );
    }
  }

  lines.push(
    "",
    "Write one bullet per player. Each line starts with '- '.",
    "Format: Name: brief pick summary, short sarcastic remark. Under 12 words per line.",
    "Be very concise. No match recaps. No closing line. Random player order.",
    "Rib missed deadlines; never confuse deliberate 1-1 with auto-default 1-1.",
    "Never use em dashes.",
    "",
    "Example:",
    "- Alice: 2-1 exact, 3 pts, insufferable",
    "- Bob: no pick, 1.5 pts, deadline optional"
  );

  return lines.join("\n");
}

export function buildOpenerFallbackBullets(data: DailySummaryData): string {
  const rollups = rollupPlayersByDay(data);
  if (rollups.length === 0) {
    return "- Quiet day, no picks to judge.";
  }

  return rollups.map((player) => `- ${playerTake(player, data.date)}`).join("\n");
}

/** @deprecated use buildOpenerFallbackBullets */
export function buildOpenerFallbackBullet(data: DailySummaryData): string {
  return buildOpenerFallbackBullets(data);
}

export function normalizeOpenerBullets(text: string): string {
  const trimmed = sanitizeOpenerText(text.trim());
  const rawLines = trimmed.split(/\n+/).map((line) => line.replace(/^[-•]\s*/, "").trim()).filter(Boolean);

  const bullets: string[] = [];

  for (const line of rawLines) {
    const parts = line.split(/;\s*(?=[^:;]+:)/);
    for (const part of parts) {
      const cleaned = part.trim();
      if (cleaned) bullets.push(`- ${cleaned}`);
    }
  }

  return bullets.join("\n");
}

/** @deprecated use normalizeOpenerBullets */
export function normalizeOpenerBullet(text: string): string {
  return normalizeOpenerBullets(text);
}

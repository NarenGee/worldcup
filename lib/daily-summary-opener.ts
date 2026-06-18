import type { DailySummaryData, DailySummaryMatch } from "@/lib/daily-summary-data";
import { formatAwardedPoints } from "@/lib/scoring";
import {
  CLOSE_ALL_SCORED,
  CLOSE_ALL_ZERO,
  CLOSE_SOME_ZERO,
  EMPTY_DAY,
  LEAD_BLANK,
  LEAD_EXACT,
  LEAD_TOP,
  MIDDLE_CLEAN,
  MIDDLE_DEADLINE,
  MIDDLE_DELIBERATE_11,
  type PhraseBuilder,
} from "@/lib/take-phrase-pools";

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

export type TakeGenerationOptions = {
  avoidPhrases?: string[];
};

const SECTION_LABEL = /^(Results|No results)/;

function shortMatchLabel(match: DailySummaryMatch): string {
  return `${match.home_team} v ${match.away_team}`;
}

export function sanitizeTakeText(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/—/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** @deprecated use sanitizeTakeText */
export function sanitizeOpenerText(text: string): string {
  return sanitizeTakeText(text);
}

export function isTakeBulletLine(text: string): boolean {
  const label = text.split(":")[0]?.trim() ?? "";
  return label.length > 0 && !SECTION_LABEL.test(label);
}

/** @deprecated use isTakeBulletLine */
export function isOpenerBulletLine(text: string): boolean {
  return isTakeBulletLine(text);
}

export function extractTakeLines(summary: string): string[] {
  const lines: string[] = [];

  for (const rawLine of summary.split("\n")) {
    const text = rawLine.replace(/^[-•]\s*/, "").trim();
    if (!text) continue;
    if (!isTakeBulletLine(text)) break;
    lines.push(text);
  }

  return lines;
}

function hashDate(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i += 1) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function sharesLongPhrase(candidate: string, previous: string, minWords = 4): boolean {
  const prev = normalizeForCompare(previous);
  const words = normalizeForCompare(candidate).split(" ").filter(Boolean);

  for (let i = 0; i <= words.length - minWords; i += 1) {
    const phrase = words.slice(i, i + minWords).join(" ");
    if (phrase.length >= 18 && prev.includes(phrase)) {
      return true;
    }
  }

  return false;
}

function isTooSimilarToRecent(candidate: string, recent: string[]): boolean {
  const normalized = normalizeForCompare(candidate);
  return recent.some((line) => {
    const other = normalizeForCompare(line);
    if (normalized === other) return true;
    return sharesLongPhrase(candidate, line);
  });
}

function pickRotatingPhrase(
  pool: PhraseBuilder[],
  seed: string,
  slot: number,
  phraseContext: Record<string, string>,
  avoid: string[]
): string {
  const start = (hashDate(seed) + slot * 7919) % pool.length;

  for (let i = 0; i < pool.length; i += 1) {
    const candidate = pool[(start + i) % pool.length](phraseContext);
    if (!isTooSimilarToRecent(candidate, avoid)) {
      return candidate;
    }
  }

  return pool[start](phraseContext);
}

function collectPlayerDayPicks(data: DailySummaryData): PlayerDayPick[] {
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

  return Array.from(byName.entries()).flatMap(([name, picks]) =>
    picks.map((pick) => ({
      ...pick,
      points_today: totals.get(name) ?? 0,
    }))
  );
}

function rollupPlayersByDay(data: DailySummaryData): PlayerDayRollup[] {
  const picks = collectPlayerDayPicks(data);
  const byName = new Map<string, PlayerDayPick[]>();

  for (const pick of picks) {
    const existing = byName.get(pick.name) ?? [];
    existing.push(pick);
    byName.set(pick.name, existing);
  }

  return Array.from(byName.entries()).map(([name, playerPicks]) => ({
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
}

function formatPlayerList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function buildFallbackCommentary(
  data: DailySummaryData,
  rollups: PlayerDayRollup[],
  avoidPhrases: string[]
): string[] {
  const seed = data.date;
  const used = [...avoidPhrases];
  const exactHeroes = rollups.filter((player) => player.exact_count > 0);
  const topScorer = [...rollups].sort((a, b) => b.points_today - a.points_today)[0];
  const deadlineSkippers = rollups.filter((player) => player.default_count > 0);
  const zeroes = rollups.filter((player) => player.points_today === 0);
  const deliberateOnes = rollups.filter((player) => player.chosen_one_one_count > 0);

  const pick = (pool: PhraseBuilder[], slot: number, ctx: Record<string, string>) => {
    const line = pickRotatingPhrase(pool, seed, slot, ctx, used);
    used.push(line);
    return line;
  };

  let lead: string;
  if (exactHeroes.length > 0) {
    lead = pick(LEAD_EXACT, 0, {
      names: formatPlayerList(exactHeroes.map((player) => player.name)),
    });
  } else if (topScorer && topScorer.points_today > 0) {
    lead = pick(LEAD_TOP, 0, {
      name: topScorer.name,
      pts: formatAwardedPoints(topScorer.points_today),
    });
  } else {
    lead = pick(LEAD_BLANK, 0, {});
  }

  let middle: string;
  if (deadlineSkippers.length > 0) {
    middle = pick(MIDDLE_DEADLINE, 1, {
      names: formatPlayerList(deadlineSkippers.map((player) => player.name)),
    });
  } else if (deliberateOnes.length > 0) {
    middle = pick(MIDDLE_DELIBERATE_11, 1, {
      names: formatPlayerList(deliberateOnes.map((player) => player.name)),
    });
  } else {
    middle = pick(MIDDLE_CLEAN, 1, {});
  }

  let close: string;
  if (zeroes.length === rollups.length) {
    close = pick(CLOSE_ALL_ZERO, 2, {});
  } else if (zeroes.length > 0) {
    close = pick(CLOSE_SOME_ZERO, 2, {
      names: formatPlayerList(zeroes.map((player) => player.name)),
    });
  } else {
    close = pick(CLOSE_ALL_SCORED, 2, {});
  }

  return [lead, middle, close];
}

function buildEmptyDayTake(seed: string, avoidPhrases: string[]): string {
  const used = [...avoidPhrases];
  const lines: string[] = [];

  for (let slot = 0; slot < 3; slot += 1) {
    lines.push(pickRotatingPhrase(EMPTY_DAY, seed, slot, {}, used));
    used.push(lines.at(-1)!);
  }

  return lines.map((line) => `- ${line}`).join("\n");
}

export function buildTakePrompt(
  data: DailySummaryData,
  options?: TakeGenerationOptions
): string {
  const rollups = rollupPlayersByDay(data);
  const avoidPhrases = options?.avoidPhrases ?? [];

  const lines = [
    `Date: ${data.date_label}`,
    "",
    "Write exactly 3 bullet lines for The take: witty British commentator commentary on how players performed today.",
    "Focus on picks, points, exact scores, misses, and missed deadlines. Do not recap match results.",
    "Use fresh phrasing unique to this date. Vary sentence structure and vocabulary every day.",
    "Do not reuse wording from recent recaps listed below.",
    "",
    "Pick types:",
    "- deliberate 1-1: chosen 1-1 before kickoff",
    "- auto-default 1-1: missed deadline, half points",
    "",
    "Player data:",
  ];

  for (const player of rollups) {
    lines.push(`- ${player.name}: ${formatAwardedPoints(player.points_today)} pts today`);
    for (const pick of player.picks) {
      lines.push(
        `  · ${pick.match}: picked ${pick.predicted_score} (${pick.pick_kind}, ${pick.result}, ${pick.points} pts)`
      );
    }
  }

  if (avoidPhrases.length > 0) {
    lines.push("", "Recent lines to avoid echoing (do not copy phrases or structure):");
    for (const phrase of avoidPhrases.slice(0, 21)) {
      lines.push(`- ${phrase}`);
    }
  }

  lines.push(
    "",
    "Output exactly 3 lines, each starting with '- '.",
    "British humour, dry, deadpan, like a TV commentator wrapping up the day.",
    "Mention players by name. Spread the story across all 3 bullets.",
    "Never confuse deliberate 1-1 with auto-default 1-1. Never use em dashes.",
    "No match score recaps. No fourth bullet."
  );

  return lines.join("\n");
}

/** @deprecated use buildTakePrompt */
export function buildOpenerPrompt(data: DailySummaryData): string {
  return buildTakePrompt(data);
}

export function buildTakeFallbackBullets(
  data: DailySummaryData,
  options?: TakeGenerationOptions
): string {
  const avoidPhrases = options?.avoidPhrases ?? [];
  const rollups = rollupPlayersByDay(data);

  if (rollups.length === 0) {
    return buildEmptyDayTake(data.date, avoidPhrases);
  }

  return buildFallbackCommentary(data, rollups, avoidPhrases)
    .map((line) => `- ${line}`)
    .join("\n");
}

/** @deprecated use buildTakeFallbackBullets */
export function buildOpenerFallbackBullets(data: DailySummaryData): string {
  return buildTakeFallbackBullets(data);
}

export function takeLinesAreTooRepetitive(
  lines: string[],
  avoidPhrases: string[]
): boolean {
  return lines.some((line) => isTooSimilarToRecent(line, avoidPhrases));
}

export function normalizeTakeBullets(text: string): string[] {
  return sanitizeTakeText(text)
    .split(/\n+/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function formatTakeBullets(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

/** @deprecated use normalizeTakeBullets + formatTakeBullets */
export function normalizeOpenerBullets(text: string): string {
  return formatTakeBullets(normalizeTakeBullets(text));
}

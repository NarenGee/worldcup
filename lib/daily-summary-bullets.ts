import type { DailySummaryData } from "@/lib/daily-summary-data";
import {
  buildTakeFallbackBullets,
  buildTakePrompt,
  formatTakeBullets,
  normalizeTakeBullets,
  takeLinesAreTooRepetitive,
  type TakeGenerationOptions,
} from "@/lib/daily-summary-opener";
import { generateTakeBullets } from "@/lib/gemini";

function buildResultsBullet(data: DailySummaryData): string {
  if (data.matches.length === 0) {
    return "- No results were confirmed on this day.";
  }

  const results = data.matches
    .map((match) => `${match.home_team} ${match.actual_score} ${match.away_team}`)
    .join(" · ");

  return `- Results: ${results}`;
}

function buildTakeSection(
  data: DailySummaryData,
  options?: TakeGenerationOptions
): string {
  return buildTakeFallbackBullets(data, options);
}

export function buildConciseDailySummary(data: DailySummaryData): string {
  return buildResultsBullet(data);
}

export function buildFullDailySummaryFast(
  data: DailySummaryData,
  options?: TakeGenerationOptions
): string {
  if (data.matches.length === 0) {
    return buildResultsBullet(data);
  }

  return `${buildTakeSection(data, options)}\n${buildResultsBullet(data)}`;
}

export async function buildFullDailySummaryWithAi(
  data: DailySummaryData,
  options?: TakeGenerationOptions
): Promise<string> {
  if (data.matches.length === 0) {
    return buildResultsBullet(data);
  }

  const avoidPhrases = options?.avoidPhrases ?? [];

  try {
    const takeRaw = await generateTakeBullets(buildTakePrompt(data, options));
    const takeLines = normalizeTakeBullets(takeRaw);

    if (
      takeLines.length === 0 ||
      takeLinesAreTooRepetitive(takeLines, avoidPhrases)
    ) {
      return buildFullDailySummaryFast(data, options);
    }

    return `${formatTakeBullets(takeLines)}\n${buildResultsBullet(data)}`;
  } catch {
    return buildFullDailySummaryFast(data, options);
  }
}

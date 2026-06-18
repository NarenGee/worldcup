import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildFullDailySummaryFast,
  buildFullDailySummaryWithAi,
} from "@/lib/daily-summary-bullets";
import {
  buildDailySummaryData,
  hashDailySummaryData,
  listRecapDates,
} from "@/lib/daily-summary-data";
import { extractTakeLines } from "@/lib/daily-summary-opener";
import {
  formatDateInTimezone,
  formatDisplayDate,
  getDailySummaryTimezone,
} from "@/lib/daily-summary-timezone";
import type { Database } from "@/lib/supabase/types";

export type DailySummaryResult = {
  summary: string;
  date: string;
  date_label: string;
  matches_count: number;
  generated_at: string | null;
  source: "cache" | "generated";
};

export type DailySummaryBootstrap = {
  dates: string[];
  today: string;
  recap: DailySummaryResult;
};

export type BackfillSummaryResult = {
  date: string;
  status: "generated" | "skipped";
  source?: DailySummaryResult["source"];
  reason?: "no_matches" | "cache";
};

type CachedSummaryRow = {
  summary: string;
  content_hash: string;
  generated_at: string;
  matches_count: number;
};

async function readCachedSummaryByDate(
  supabase: SupabaseClient<Database>,
  date: string
): Promise<CachedSummaryRow | null> {
  const { data, error } = await supabase
    .from("daily_summaries")
    .select("summary, content_hash, generated_at, matches_count")
    .eq("summary_date", date)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

async function readCachedSummary(
  supabase: SupabaseClient<Database>,
  date: string,
  contentHash: string
): Promise<CachedSummaryRow | null> {
  const cached = await readCachedSummaryByDate(supabase, date);
  if (!cached || cached.content_hash !== contentHash) {
    return null;
  }
  return cached;
}

function toSummaryResult(
  cached: CachedSummaryRow,
  date: string,
  timezone: string
): DailySummaryResult {
  return {
    summary: cached.summary,
    date,
    date_label: formatDisplayDate(date, timezone),
    matches_count: cached.matches_count,
    generated_at: cached.generated_at,
    source: "cache",
  };
}

async function writeCachedSummary(
  supabase: SupabaseClient<Database>,
  date: string,
  contentHash: string,
  summary: string,
  matchesCount: number
): Promise<string | null> {
  const generatedAt = new Date().toISOString();
  const { error } = await supabase.from("daily_summaries").upsert(
    {
      summary_date: date,
      content_hash: contentHash,
      summary,
      generated_at: generatedAt,
      matches_count: matchesCount,
    },
    { onConflict: "summary_date" }
  );

  if (error) {
    return null;
  }

  return generatedAt;
}

async function getRecentTakeLines(
  supabase: SupabaseClient<Database>,
  beforeDate: string,
  limit = 7
): Promise<string[]> {
  const { data, error } = await supabase
    .from("daily_summaries")
    .select("summary")
    .lt("summary_date", beforeDate)
    .order("summary_date", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.flatMap((row) => extractTakeLines(row.summary));
}

async function generateAndCacheSummary(
  supabase: SupabaseClient<Database>,
  data: Awaited<ReturnType<typeof buildDailySummaryData>>,
  options?: { useAi?: boolean; recentTakeLines?: string[] }
): Promise<DailySummaryResult> {
  const contentHash = hashDailySummaryData(data);
  const avoidPhrases = options?.recentTakeLines ?? [];
  const summary = options?.useAi
    ? await buildFullDailySummaryWithAi(data, { avoidPhrases })
    : buildFullDailySummaryFast(data, { avoidPhrases });
  const generatedAt = await writeCachedSummary(
    supabase,
    data.date,
    contentHash,
    summary,
    data.matches.length
  );

  return {
    summary,
    date: data.date,
    date_label: data.date_label,
    matches_count: data.matches.length,
    generated_at: generatedAt,
    source: "generated",
  };
}

export async function getDailySummary(
  supabase: SupabaseClient<Database>,
  dateStr?: string
): Promise<DailySummaryResult> {
  const timezone = getDailySummaryTimezone();
  const targetDate =
    dateStr ?? formatDateInTimezone(new Date(), timezone);

  const cached = await readCachedSummaryByDate(supabase, targetDate);
  if (cached) {
    return toSummaryResult(cached, targetDate, timezone);
  }

  const data = await buildDailySummaryData(supabase, targetDate);
  const recentTakeLines = await getRecentTakeLines(supabase, targetDate);
  return generateAndCacheSummary(supabase, data, { recentTakeLines });
}

export async function getDailySummaryBootstrap(
  supabase: SupabaseClient<Database>
): Promise<DailySummaryBootstrap> {
  const [{ dates, today }, recap] = await Promise.all([
    listRecapDates(supabase),
    getDailySummary(supabase),
  ]);

  return { dates, today, recap };
}

export async function backfillDailySummaries(
  supabase: SupabaseClient<Database>,
  options?: { force?: boolean }
): Promise<BackfillSummaryResult[]> {
  const { dates } = await listRecapDates(supabase);
  const results: BackfillSummaryResult[] = [];
  const sessionTakeLines: string[] = [];

  for (const dateStr of dates) {
    const data = await buildDailySummaryData(supabase, dateStr);

    if (data.matches.length === 0) {
      results.push({ date: dateStr, status: "skipped", reason: "no_matches" });
      continue;
    }

    const contentHash = hashDailySummaryData(data);
    if (!options?.force) {
      const cached = await readCachedSummary(supabase, dateStr, contentHash);
      if (cached) {
        sessionTakeLines.push(...extractTakeLines(cached.summary));
        results.push({ date: dateStr, status: "skipped", reason: "cache" });
        continue;
      }
    }

    const recentTakeLines = [
      ...sessionTakeLines,
      ...(await getRecentTakeLines(supabase, dateStr)),
    ];

    const generated = await generateAndCacheSummary(supabase, data, {
      useAi: true,
      recentTakeLines,
    });
    sessionTakeLines.push(...extractTakeLines(generated.summary));
    results.push({
      date: dateStr,
      status: "generated",
      source: generated.source,
    });
  }

  return results;
}

export { listRecapDates };

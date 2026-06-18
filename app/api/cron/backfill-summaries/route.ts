import { applyDefaultPredictions } from "@/lib/apply-default-predictions";
import { backfillDailySummaries } from "@/lib/daily-summary";
import { scorePredictions } from "@/lib/score-predictions";
import { syncResultsFromApi } from "@/lib/sync-results";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    await applyDefaultPredictions(supabase);
  } catch {
    // Migration may not be applied yet.
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (apiKey) {
    try {
      await syncResultsFromApi(supabase, apiKey);
    } catch {
      // Sync failure should not block recap generation.
    }
  }

  try {
    await scorePredictions(supabase);
  } catch {
    // Migration may not be applied yet.
  }

  try {
    const results = await backfillDailySummaries(supabase);
    const generated = results.filter((result) => result.status === "generated").length;

    return NextResponse.json({
      success: true,
      generated,
      skipped: results.length - generated,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Daily recap cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

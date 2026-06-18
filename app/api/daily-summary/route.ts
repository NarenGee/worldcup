import { getDailySummary, getDailySummaryBootstrap } from "@/lib/daily-summary";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date") ?? undefined;
    const bootstrap = url.searchParams.get("bootstrap") === "1";

    if (dateParam && !DATE_PATTERN.test(dateParam)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (bootstrap && !dateParam) {
      const payload = await getDailySummaryBootstrap(supabase);
      return NextResponse.json(payload);
    }

    const result = await getDailySummary(supabase, dateParam);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate daily summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

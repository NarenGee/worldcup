import { listRecapDates } from "@/lib/daily-summary";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { dates, today } = await listRecapDates(supabase);
    return NextResponse.json({ dates, today });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load recap dates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { getLeaderboardSnapshots } from "@/lib/leaderboard-snapshots";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const payload = await getLeaderboardSnapshots(supabase);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Leaderboard snapshots error:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard snapshots" },
      { status: 500 }
    );
  }
}

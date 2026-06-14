import { getLeaderboardEntries } from "@/lib/leaderboard-entries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  try {
    const entries = await getLeaderboardEntries(supabase);
    return Response.json(entries);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}

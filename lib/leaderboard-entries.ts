import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeaderboardEntry } from "@/lib/supabase/types";

export async function getLeaderboardEntries(
  supabase: SupabaseClient<Database>
): Promise<LeaderboardEntry[]> {
  const { data: entries, error } = await supabase
    .from("leaderboard")
    .select("user_id, display_name, avatar_url, score, matches_scored, matches_predicted")
    .order("score", { ascending: false });

  if (error) throw error;
  return entries ?? [];
}

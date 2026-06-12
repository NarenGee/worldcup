import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function scorePredictions(
  supabase: SupabaseClient<Database>
): Promise<number> {
  const { data, error } = await supabase.rpc("score_predictions");
  if (error) {
    throw error;
  }
  return data ?? 0;
}

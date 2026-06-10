import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function applyDefaultPredictions(
  supabase: SupabaseClient<Database>
) {
  const { error } = await supabase.rpc("apply_default_predictions");
  if (error) {
    throw error;
  }
}

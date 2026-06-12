import { AppShell } from "@/components/layout/app-shell";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { RulesSection } from "@/components/leaderboard/rules-section";
import { applyDefaultPredictions } from "@/lib/apply-default-predictions";
import { getLeaderboardEntries } from "@/lib/leaderboard-entries";
import { createServiceClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const serviceClient = createServiceClient();
  try {
    await applyDefaultPredictions(serviceClient);
  } catch {
    // Migration may not be applied yet; leaderboard still works for manual picks.
  }

  const entries = await getLeaderboardEntries(serviceClient);

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="border-b border-border pb-5 text-center sm:pb-6">
          <p className="instrument-label mb-2">Live Rankings</p>
          <h1 className="instrument-title">Leaderboard</h1>
          <p className="instrument-meta mt-2">
            Prediction scores · Real-time sync
          </p>
        </header>
        <RulesSection />
        <LeaderboardTable initialEntries={entries ?? []} />
      </div>
    </AppShell>
  );
}

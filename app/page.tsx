import { AppShell } from "@/components/layout/app-shell";
import { DailySummarySection } from "@/components/leaderboard/daily-summary-section";
import { LeaderboardSection } from "@/components/leaderboard/leaderboard-section";
import { RulesSection } from "@/components/leaderboard/rules-section";
import { applyDefaultPredictions } from "@/lib/apply-default-predictions";
import { getDailySummaryBootstrap } from "@/lib/daily-summary";
import { getLeaderboardEntries } from "@/lib/leaderboard-entries";
import { scorePredictions } from "@/lib/score-predictions";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const serviceClient = createServiceClient();
  try {
    await applyDefaultPredictions(serviceClient);
  } catch {
    // Migration may not be applied yet; leaderboard still works for manual picks.
  }

  try {
    await scorePredictions(serviceClient);
  } catch {
    // Migration may not be applied yet.
  }

  const [entries, recapBootstrap] = await Promise.all([
    getLeaderboardEntries(serviceClient),
    getDailySummaryBootstrap(serviceClient).catch(() => null),
  ]);

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="border-b border-border pb-5 text-center sm:pb-6">
          <p className="instrument-label mb-2">World Cup Pool</p>
          <h1 className="instrument-title">Leaderboard</h1>
          <p className="instrument-meta mt-2">
            Daily recap · Live rankings · Real-time sync
          </p>
        </header>
        <DailySummarySection bootstrap={recapBootstrap} />
        <LeaderboardSection initialEntries={entries ?? []} />
        <RulesSection />
      </div>
    </AppShell>
  );
}

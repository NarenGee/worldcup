import { AppShell } from "@/components/layout/app-shell";
import { MatchPredictionsList } from "@/components/predict/match-predictions-list";
import { applyDefaultPredictions } from "@/lib/apply-default-predictions";
import {
  buildMatchPlayerPicks,
  groupPredictionsByMatch,
} from "@/lib/match-predictions";
import { getEffectivePrediction, isMatchLocked } from "@/lib/predictions";
import { awardMatchPoints, formatAwardedPoints } from "@/lib/scoring";
import { formatTeam, STAGE_LABELS } from "@/lib/teams";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await applyDefaultPredictions(supabase);
    } catch {
      // Migration may not be applied yet.
    }
  }

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at");

  const [{ data: players }, { data: allPredictions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("predictions")
      .select("user_id, match_id, predicted_home, predicted_away, is_default"),
  ]);

  const predictionsByMatch = groupPredictionsByMatch(allPredictions ?? []);

  let predictions: Record<
    number,
    { predicted_home: number; predicted_away: number; is_default: boolean }
  > = {};
  if (user) {
    const { data } = await supabase
      .from("predictions")
      .select("match_id, predicted_home, predicted_away, is_default")
      .eq("user_id", user.id);
    if (data) {
      predictions = Object.fromEntries(
        data.map((p) => [
          p.match_id,
          {
            predicted_home: p.predicted_home,
            predicted_away: p.predicted_away,
            is_default: p.is_default,
          },
        ])
      );
    }
  }

  const matchList = matches ?? [];

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="border-b border-border pb-6">
          <p className="instrument-label mb-2">Fixture Index</p>
          <h1 className="instrument-title">All Matches</h1>
          <p className="instrument-meta mt-2">
            Full fixture list · Results and prediction accuracy
          </p>
        </header>

        <div className="instrument-panel">
          <div className="instrument-divider flex items-center justify-between px-4 py-3">
            <span className="instrument-label">Upcoming Matches</span>
            <span className="instrument-meta">{matchList.length} Total</span>
          </div>

          {matchList.map((match) => {
            const storedPred = predictions[match.id];
            const pred = user
              ? getEffectivePrediction(match.kickoff_at, storedPred)
              : null;
            const showPick =
              !!pred && (!!storedPred || isMatchLocked(match.kickoff_at));
            const points =
              pred && match.result_confirmed
                ? awardMatchPoints(
                    pred.predicted_home,
                    pred.predicted_away,
                    match.home_score,
                    match.away_score,
                    match.result_confirmed,
                    pred.isDefault
                  )
                : null;

            const stageLabel =
              STAGE_LABELS[match.stage]?.toUpperCase() ?? match.stage;

            const playerPicks = buildMatchPlayerPicks(
              match.kickoff_at,
              players ?? [],
              predictionsByMatch[match.id] ?? {},
              user?.id
            );

            return (
              <div
                key={match.id}
                className="instrument-divider px-4 py-4 last:border-b-0"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="instrument-label">{stageLabel}</span>
                  <span className="instrument-meta">
                    {format(new Date(match.kickoff_at), "yyyy.MM.dd · HH:mm")}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="font-display text-xs font-bold uppercase leading-snug tracking-wide sm:text-sm">
                    {formatTeam(match.home_team)}
                    <span className="mx-2 font-mono text-[10px] font-normal text-accent">
                      vs
                    </span>
                    {formatTeam(match.away_team)}
                  </p>
                  <div className="text-left sm:text-right">
                    {match.result_confirmed &&
                    match.home_score !== null &&
                    match.away_score !== null ? (
                      <p className="font-display text-lg font-black tabular-nums text-primary sm:text-xl">
                        {String(match.home_score).padStart(2, "0")}–
                        {String(match.away_score).padStart(2, "0")}
                      </p>
                    ) : (
                      <p className="instrument-meta">
                        {new Date(match.kickoff_at) > new Date()
                          ? "Upcoming"
                          : "Awaiting result"}
                      </p>
                    )}
                  </div>
                </div>
                {showPick && pred && (
                  <p className="instrument-meta mt-2 border-t border-border/60 pt-2">
                    Your pick: {String(pred.predicted_home).padStart(2, "0")}–
                    {String(pred.predicted_away).padStart(2, "0")}
                    {pred.isDefault && (
                      <span className="ml-2 text-muted-foreground">
                        (default)
                      </span>
                    )}
                    {points !== null && (
                      <span className="ml-2 text-accent">
                        +{formatAwardedPoints(points)} PTS
                      </span>
                    )}
                  </p>
                )}
                {playerPicks.length > 0 && (
                  <MatchPredictionsList
                    kickoffAt={match.kickoff_at}
                    picks={playerPicks}
                    match={match}
                    className="mt-3"
                  />
                )}
              </div>
            );
          })}

          {matchList.length === 0 && (
            <p className="instrument-meta px-4 py-12 text-center">
              No matches scheduled yet
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

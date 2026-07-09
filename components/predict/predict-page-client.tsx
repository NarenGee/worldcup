"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  buildMatchPlayerPicks,
  groupPredictionsByMatch,
  type PlayerProfile,
} from "@/lib/match-predictions";
import { getEffectivePrediction, isMatchLocked } from "@/lib/predictions";
import {
  hasDoublePointsOnMatch,
  hasSneakPeekOnMatch,
  type PowerUpType,
} from "@/lib/power-ups";
import { calculateMatchPoints } from "@/lib/scoring";
import { getPlayerPickerOptions } from "@/lib/players";
import { getTeamQuote } from "@/lib/team-quotes";
import { getUniqueTeamsFromMatches, formatTeam } from "@/lib/teams";
import type { Match, Prediction, Props, UserPowerUp } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { KickoffCountdown } from "./kickoff-countdown";
import { MatchCard } from "./match-card";
import { PowerUpsPanel } from "./power-ups-panel";
import { SearchablePicker } from "./searchable-picker";
import { TeamQuote } from "./team-quote";

type PredictPageClientProps = {
  matches: Match[];
  predictions: Prediction[];
  props: Props | null;
  userId: string;
  tournamentStarted: boolean;
  players: PlayerProfile[];
  predictionsByMatch: ReturnType<typeof groupPredictionsByMatch>;
  powerUps: UserPowerUp[];
};

export function PredictPageClient({
  matches,
  predictions: initialPredictions,
  props: initialProps,
  userId,
  tournamentStarted,
  players,
  predictionsByMatch: initialPredictionsByMatch,
  powerUps: initialPowerUps,
}: PredictPageClientProps) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [predictionsByMatch, setPredictionsByMatch] = useState(
    initialPredictionsByMatch
  );
  const [userProps, setUserProps] = useState(initialProps);
  const [powerUps, setPowerUps] = useState(initialPowerUps);
  const [scores, setScores] = useState<Record<number, { home: number; away: number }>>(() => {
    const map: Record<number, { home: number; away: number }> = {};
    for (const p of initialPredictions) {
      map[p.match_id] = { home: p.predicted_home, away: p.predicted_away };
    }
    return map;
  });
  const [savingMatchId, setSavingMatchId] = useState<number | null>(null);
  const [champion, setChampion] = useState(initialProps?.champion ?? "");
  const [topScorer, setTopScorer] = useState(initialProps?.top_scorer ?? "");
  const [savingProps, setSavingProps] = useState(false);
  const [matchesState, setMatchesState] = useState(matches);
  const [matchView, setMatchView] = useState<"predict" | "past">("predict");

  const supabase = createClient();
  const teams = useMemo(
    () => getUniqueTeamsFromMatches(matchesState),
    [matchesState]
  );

  const teamOptions = useMemo(
    () =>
      teams.map((team) => ({
        value: team,
        label: formatTeam(team),
        quote: getTeamQuote(team),
      })),
    [teams]
  );

  const playerOptions = useMemo(
    () => getPlayerPickerOptions(teams),
    [teams]
  );

  const predictMatches = useMemo(
    () => matchesState.filter((m) => !isMatchLocked(m.kickoff_at)),
    [matchesState]
  );

  const pastMatches = useMemo(
    () => matchesState.filter((m) => isMatchLocked(m.kickoff_at)),
    [matchesState]
  );

  const qfMatches = useMemo(
    () =>
      matchesState
        .filter((match) => match.stage === "qf")
        .sort(
          (a, b) =>
            new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
        ),
    [matchesState]
  );

  const nextKickoff = useMemo(() => {
    const upcoming = [...predictMatches].sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    );
    return upcoming[0]?.kickoff_at ?? null;
  }, [predictMatches]);

  function groupMatchesByDate(
    matchList: Match[],
    sortDirection: "asc" | "desc" = "asc"
  ) {
    const groups: Record<string, Match[]> = {};
    for (const match of matchList) {
      const key = format(new Date(match.kickoff_at), "yyyy-MM-dd");
      if (!groups[key]) groups[key] = [];
      groups[key].push(match);
    }
    return Object.entries(groups).sort(([a], [b]) =>
      sortDirection === "asc" ? a.localeCompare(b) : b.localeCompare(a)
    );
  }

  const groupedPredictMatches = useMemo(
    () => groupMatchesByDate(predictMatches),
    [predictMatches]
  );

  const groupedPastMatches = useMemo(
    () => groupMatchesByDate(pastMatches, "desc"),
    [pastMatches]
  );

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#0f0f0f", "#c43c3c", "#888888"],
    });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("predict-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const updated = payload.new as Match;
          setMatchesState((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );

          if (updated.result_confirmed) {
            const pred = predictions.find((p) => p.match_id === updated.id);
            const effective = getEffectivePrediction(
              updated.kickoff_at,
              pred
            );
            const pts = calculateMatchPoints(
              effective.predicted_home,
              effective.predicted_away,
              updated.home_score,
              updated.away_score,
              updated.result_confirmed
            );
            if (pts === 3) fireConfetti();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, predictions, fireConfetti]);

  useEffect(() => {
    async function syncDefaultPredictions() {
      const needsDefaults = matchesState.some(
        (match) =>
          isMatchLocked(match.kickoff_at) &&
          !predictions.some((p) => p.match_id === match.id)
      );
      if (!needsDefaults) return;

      const { error } = await supabase.rpc("apply_default_predictions");
      if (error) return;

      const { data } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userId);

      if (!data) return;

      setPredictions(data);
      setScores((prev) => {
        const next = { ...prev };
        for (const prediction of data) {
          next[prediction.match_id] = {
            home: prediction.predicted_home,
            away: prediction.predicted_away,
          };
        }
        return next;
      });
    }

    void syncDefaultPredictions();
    const interval = window.setInterval(syncDefaultPredictions, 30_000);
    return () => window.clearInterval(interval);
  }, [matchesState, predictions, supabase, userId]);

  useEffect(() => {
    async function refreshAllPredictions() {
      const { data } = await supabase
        .from("predictions")
        .select("user_id, match_id, predicted_home, predicted_away, is_default");

      if (data) {
        setPredictionsByMatch(groupPredictionsByMatch(data));
      }
    }

    const channel = supabase
      .channel("all-predictions-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions" },
        refreshAllPredictions
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  function isLocked(match: Match) {
    return isMatchLocked(match.kickoff_at);
  }

  function getScore(matchId: number) {
    return scores[matchId] ?? { home: 0, away: 0 };
  }

  async function savePrediction(matchId: number) {
    const { home, away } = getScore(matchId);
    setSavingMatchId(matchId);

    const existing = predictions.find((p) => p.match_id === matchId);

    if (existing) {
      const { data, error } = await supabase
        .from("predictions")
        .update({ predicted_home: home, predicted_away: away, is_default: false })
        .eq("id", existing.id)
        .select()
        .single();

      setSavingMatchId(null);
      if (error) {
        toast.error(error.message);
        return;
      }
      setPredictions((prev) =>
        prev.map((p) => (p.id === existing.id ? data : p))
      );
    } else {
      const { data, error } = await supabase
        .from("predictions")
        .insert({
          user_id: userId,
          match_id: matchId,
          predicted_home: home,
          predicted_away: away,
          is_default: false,
        })
        .select()
        .single();

      setSavingMatchId(null);
      if (error) {
        toast.error(error.message);
        return;
      }
      setPredictions((prev) => [...prev, data]);
    }

    toast.success("Prediction saved!");
  }

  async function saveProps() {
    setSavingProps(true);

    if (userProps) {
      const { data, error } = await supabase
        .from("props")
        .update({ champion: champion || null, top_scorer: topScorer || null })
        .eq("id", userProps.id)
        .select()
        .single();

      setSavingProps(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setUserProps(data);
    } else {
      const { data, error } = await supabase
        .from("props")
        .insert({
          user_id: userId,
          champion: champion || null,
          top_scorer: topScorer || null,
        })
        .select()
        .single();

      setSavingProps(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setUserProps(data);
    }

    toast.success("Props saved!");
  }

  async function assignPowerUp(type: PowerUpType, matchId: number) {
    const existing = powerUps.find((powerUp) => powerUp.power_up_type === type);

    if (existing) {
      if (type === "sneak_peek") {
        throw new Error("Sneak peek is locked in and cannot be changed.");
      }

      const { data, error } = await supabase
        .from("user_power_ups")
        .update({ match_id: matchId })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      setPowerUps((prev) =>
        prev.map((powerUp) => (powerUp.id === existing.id ? data : powerUp))
      );
      return;
    }

    const { data, error } = await supabase
      .from("user_power_ups")
      .insert({
        user_id: userId,
        power_up_type: type,
        match_id: matchId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    setPowerUps((prev) => [...prev, data]);
  }

  function renderMatchGroups(
    grouped: [string, Match[]][],
    emptyMessage: string
  ) {
    if (grouped.length === 0) {
      return (
        <p className="instrument-meta py-12 text-center">{emptyMessage}</p>
      );
    }

    return grouped.map(([date, dayMatches]) => (
      <div key={date} className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-border pb-2">
          <h2 className="instrument-heading text-sm">
            {format(new Date(date), "EEEE, d MMMM")}
          </h2>
          <span className="instrument-meta">
            {dayMatches.length} Match{dayMatches.length !== 1 ? "es" : ""}
          </span>
        </div>
        {dayMatches.map((match) => {
          const locked = isLocked(match);
          const prediction = predictions.find((p) => p.match_id === match.id);
          const effectivePrediction = getEffectivePrediction(
            match.kickoff_at,
            prediction
          );
          const score = getScore(match.id);

          const playerPicks = buildMatchPlayerPicks(
            match.kickoff_at,
            players,
            predictionsByMatch[match.id] ?? {},
            userId
          );

          return (
            <MatchCard
              key={match.id}
              match={match}
              prediction={prediction}
              effectivePrediction={effectivePrediction}
              locked={locked}
              playerPicks={playerPicks}
              homeScore={score.home}
              awayScore={score.away}
              hasSneakPeek={hasSneakPeekOnMatch(powerUps, match.id)}
              isDoubled={hasDoublePointsOnMatch(powerUps, match.id)}
              onHomeChange={(v) =>
                setScores((prev) => ({
                  ...prev,
                  [match.id]: { ...getScore(match.id), home: v },
                }))
              }
              onAwayChange={(v) =>
                setScores((prev) => ({
                  ...prev,
                  [match.id]: { ...getScore(match.id), away: v },
                }))
              }
              onSave={() => savePrediction(match.id)}
              saving={savingMatchId === match.id}
            />
          );
        })}
      </div>
    ));
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-5 sm:pb-6">
        <p className="instrument-label mb-2">Prediction Module</p>
        <h1 className="instrument-title">Your Predictions</h1>
        <p className="instrument-meta mt-2">
          Pick scores before kickoff · Missed picks default to 1–1
        </p>
      </header>

      <KickoffCountdown kickoffAt={nextKickoff} />

      <PowerUpsPanel
        qfMatches={qfMatches}
        powerUps={powerUps}
        onAssign={assignPowerUp}
      />

      {matchesState.length === 0 ? (
        <p className="instrument-meta py-12 text-center">
          No matches scheduled yet · Check back soon
        </p>
      ) : (
        <section className="space-y-6">
          <div className="instrument-panel flex">
            <button
              type="button"
              onClick={() => setMatchView("predict")}
              className={cn(
                "flex flex-1 flex-col items-start gap-1 border-r border-border px-4 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between",
                matchView === "predict"
                  ? "bg-secondary/30 text-primary"
                  : "text-foreground/60 hover:bg-secondary/15"
              )}
            >
              <span className="instrument-label">To Predict</span>
              <span className="instrument-meta">{predictMatches.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchView("past")}
              className={cn(
                "flex flex-1 flex-col items-start gap-1 px-4 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between",
                matchView === "past"
                  ? "bg-secondary/30 text-primary"
                  : "text-foreground/60 hover:bg-secondary/15"
              )}
            >
              <span className="instrument-label">Past Predictions</span>
              <span className="instrument-meta">{pastMatches.length}</span>
            </button>
          </div>

          {matchView === "predict"
            ? renderMatchGroups(
                groupedPredictMatches,
                "No open matches right now · Check past predictions for locked picks"
              )
            : renderMatchGroups(
                groupedPastMatches,
                "No past predictions yet · Locked and finished matches appear here"
              )}
        </section>
      )}

      <Card className="instrument-panel rounded-none py-5 shadow-none ring-0 sm:py-6">
        <CardHeader className="px-6 sm:px-8">
          <CardTitle className="instrument-heading text-base">
            Tournament Props
          </CardTitle>
          <p className="instrument-meta">
            {tournamentStarted
              ? "Props locked · Tournament has started"
              : "Editable until first group match kickoff"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 px-6 sm:px-8">
          <div className="space-y-2">
            <Label>Champion</Label>
            <SearchablePicker
              value={champion}
              onValueChange={setChampion}
              options={teamOptions}
              placeholder="Search teams..."
              disabled={tournamentStarted}
            />
            {champion && getTeamQuote(champion) && (
              <TeamQuote teamName={champion} className="mt-1" />
            )}
          </div>
          <div className="space-y-2">
            <Label>Top scorer</Label>
            <SearchablePicker
              value={topScorer}
              onValueChange={setTopScorer}
              options={playerOptions}
              placeholder="Search players or type any name..."
              disabled={tournamentStarted}
              allowCustom
              emptyMessage="Type a player name to use a custom pick"
            />
            <p className="instrument-meta normal-case tracking-normal">
              Tournament squad players shown first · Any name accepted
            </p>
          </div>
          {!tournamentStarted && (
            <Button onClick={saveProps} disabled={savingProps} className="w-full">
              {savingProps ? "Saving..." : "Save props"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

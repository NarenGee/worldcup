"use client";

import { Button } from "@/components/ui/button";
import { MatchPredictionsList } from "@/components/predict/match-predictions-list";
import { calculateMatchPoints } from "@/lib/scoring";
import type { MatchPlayerPick } from "@/lib/match-predictions";
import { STAGE_LABELS } from "@/lib/teams";
import { TeamWithQuote } from "./team-with-quote";
import type { Match, Prediction } from "@/lib/supabase/types";
import { format } from "date-fns";
import { ScoreStepper } from "./score-stepper";

type MatchCardProps = {
  match: Match;
  prediction?: Prediction | null;
  effectivePrediction: {
    predicted_home: number;
    predicted_away: number;
    isDefault: boolean;
  };
  locked: boolean;
  homeScore: number;
  awayScore: number;
  onHomeChange: (v: number) => void;
  onAwayChange: (v: number) => void;
  onSave: () => void;
  saving?: boolean;
  playerPicks?: MatchPlayerPick[];
};

export function MatchCard({
  match,
  prediction,
  effectivePrediction,
  locked,
  homeScore,
  awayScore,
  onHomeChange,
  onAwayChange,
  onSave,
  saving,
  playerPicks = [],
}: MatchCardProps) {
  const points = match.result_confirmed
    ? calculateMatchPoints(
        effectivePrediction.predicted_home,
        effectivePrediction.predicted_away,
        match.home_score,
        match.away_score,
        match.result_confirmed
      )
    : null;

  const hasChanges =
    prediction?.predicted_home !== homeScore ||
    prediction?.predicted_away !== awayScore;

  const stageLabel = STAGE_LABELS[match.stage]?.toUpperCase() ?? match.stage;

  return (
    <div className={`instrument-panel ${locked ? "opacity-60" : ""}`}>
      <div className="instrument-divider flex flex-wrap items-center justify-between gap-1 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
        <span className="instrument-label">{stageLabel}</span>
        <span className="instrument-meta text-wc-blue">
          {format(new Date(match.kickoff_at), "yyyy.MM.dd · HH:mm")}
        </span>
      </div>

      <div className="px-3 py-5 sm:px-4 sm:py-6">
        <div className="mx-auto grid max-w-3xl grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
          <TeamWithQuote
            teamName={match.home_team}
            nameClassName="text-center sm:text-right"
            quoteClassName="sm:ml-auto sm:max-w-[18rem] sm:border-l-0 sm:border-r-2 sm:pl-0 sm:pr-3 sm:text-right"
          />
          <div className="flex justify-center sm:pt-1">
            <span className="inline-flex size-8 items-center justify-center border border-border bg-secondary font-mono text-[10px] text-accent">
              vs
            </span>
          </div>
          <TeamWithQuote
            teamName={match.away_team}
            nameClassName="text-center sm:text-left"
            quoteClassName="sm:max-w-[18rem]"
          />
        </div>

        {match.result_confirmed &&
        match.home_score !== null &&
        match.away_score !== null ? (
          <div className="mt-5 space-y-4 sm:mt-6">
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              <span className="instrument-score text-primary">
                {String(match.home_score).padStart(2, "0")}
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center border border-border bg-secondary font-mono text-[10px] text-secondary-foreground sm:size-8">
                vs
              </span>
              <span className="instrument-score">
                {String(match.away_score).padStart(2, "0")}
              </span>
            </div>
            <div
              className={
                points === 3
                  ? "instrument-status-bar"
                  : "instrument-status-bar-accent"
              }
            >
              Your pick: {String(effectivePrediction.predicted_home).padStart(2, "0")}–
              {String(effectivePrediction.predicted_away).padStart(2, "0")}
              {effectivePrediction.isDefault && (
                <span className="ml-2 opacity-80">(default)</span>
              )}
              {points !== null && (
                <span className="ml-2 sm:ml-3">+{points} PTS</span>
              )}
            </div>
          </div>
        ) : locked ? (
          <div className="instrument-status-bar-accent mt-5 sm:mt-6">
            Locked · Pick{" "}
            {String(effectivePrediction.predicted_home).padStart(2, "0")}–
            {String(effectivePrediction.predicted_away).padStart(2, "0")}
            {effectivePrediction.isDefault && (
              <span className="ml-2 opacity-80">(default)</span>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
              <ScoreStepper
                label={match.home_team}
                value={homeScore}
                onChange={onHomeChange}
                disabled={locked}
              />
              <span className="hidden size-8 shrink-0 items-center justify-center border border-border bg-secondary font-mono text-[10px] text-secondary-foreground sm:flex">
                vs
              </span>
              <ScoreStepper
                label={match.away_team}
                value={awayScore}
                onChange={onAwayChange}
                disabled={locked}
              />
            </div>
            <Button
              className="w-full uppercase tracking-widest"
              onClick={onSave}
              disabled={saving || !hasChanges}
            >
              {saving
                ? "Saving..."
                : prediction
                  ? "Update prediction"
                  : "Save prediction"}
            </Button>
          </div>
        )}
        {playerPicks.length > 0 && (
          <MatchPredictionsList
            kickoffAt={match.kickoff_at}
            picks={playerPicks}
            match={match}
            className="mt-5 sm:mt-6"
          />
        )}
      </div>
    </div>
  );
}

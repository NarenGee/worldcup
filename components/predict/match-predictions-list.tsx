"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/avatar/player-avatar";
import {
  formatPredictionScore,
  type MatchPlayerPick,
} from "@/lib/match-predictions";
import { isMatchLocked } from "@/lib/predictions";
import { awardMatchPoints, formatAwardedPoints } from "@/lib/scoring";
import type { Match } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type MatchPredictionsListProps = {
  kickoffAt: string;
  picks: MatchPlayerPick[];
  match?: Pick<
    Match,
    "result_confirmed" | "home_score" | "away_score"
  >;
  className?: string;
};

function HiddenScorePlaceholder() {
  return (
    <span
      className="inline-flex items-center gap-1 font-display text-sm font-black tabular-nums tracking-wider text-muted-foreground/40 blur-[3px] select-none"
      aria-label="Hidden until kickoff"
    >
      {formatPredictionScore(0, 0)}
    </span>
  );
}

export function MatchPredictionsList({
  kickoffAt,
  picks,
  match,
  className,
}: MatchPredictionsListProps) {
  const [now, setNow] = useState(() => new Date());
  const locked = isMatchLocked(kickoffAt, now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (picks.length === 0) return null;

  return (
    <div className={cn("border-t border-border/60 pt-3", className)}>
      <p className="instrument-label mb-2">
        {locked ? "All picks" : "Player picks · Hidden until kickoff"}
      </p>
      <ul className="space-y-2">
        {picks.map((pick) => {
          const showScore =
            locked || (pick.isCurrentUser && pick.hasSubmitted);
          const showNotSaved =
            pick.isCurrentUser && !locked && !pick.hasSubmitted;
          const points =
            showScore &&
            locked &&
            match?.result_confirmed &&
            match.home_score !== null &&
            match.away_score !== null
              ? awardMatchPoints(
                  pick.predictedHome,
                  pick.predictedAway,
                  match.home_score,
                  match.away_score,
                  match.result_confirmed,
                  pick.isDefault
                )
              : null;

          return (
            <li
              key={pick.userId}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <PlayerAvatar
                  displayName={pick.displayName}
                  avatarUrl={pick.avatarUrl}
                  className="size-7 shrink-0 border border-foreground/20"
                  fallbackClassName="bg-muted font-mono text-[9px]"
                />
                <span
                  className={cn(
                    "truncate text-sm",
                    pick.isCurrentUser ? "font-bold" : "text-foreground"
                  )}
                >
                  {pick.displayName}
                  {pick.isCurrentUser && (
                    <span className="instrument-meta ml-1.5 normal-case">
                      (you)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {showNotSaved ? (
                  <span className="instrument-meta normal-case">Not saved</span>
                ) : showScore ? (
                  <>
                    <span className="font-display text-sm font-black tabular-nums">
                      {formatPredictionScore(
                        pick.predictedHome,
                        pick.predictedAway
                      )}
                    </span>
                    {pick.isDefault && (
                      <span className="instrument-meta normal-case">(default)</span>
                    )}
                    {points !== null && (
                      <span className="instrument-meta text-accent">
                        +{formatAwardedPoints(points)}
                      </span>
                    )}
                  </>
                ) : (
                  <HiddenScorePlaceholder />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

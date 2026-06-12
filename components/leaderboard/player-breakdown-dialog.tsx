"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/avatar/player-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlayerPointsBreakdown } from "@/lib/player-breakdown";
import { STAGE_LABELS } from "@/lib/teams";
import type { LeaderboardEntry } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type PlayerBreakdownDialogProps = {
  entry: LeaderboardEntry | null;
  rank: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatScore(home: number, away: number) {
  return `${home}–${away}`;
}

function pointsLabel(points: number, resultLabel?: "exact" | "outcome" | "miss") {
  if (points === 3 || resultLabel === "exact") return "Exact";
  if (points === 1 || resultLabel === "outcome") return "Outcome";
  return "Miss";
}

function PointsBadge({
  points,
  resultLabel,
}: {
  points: number;
  resultLabel?: "exact" | "outcome" | "miss";
}) {
  return (
    <span
      className={cn(
        "shrink-0 font-display text-sm font-black tabular-nums",
        points === 3 && "text-primary",
        points === 1 && "text-foreground",
        points === 0 && "text-muted-foreground"
      )}
    >
      {points > 0 ? `+${points}` : "0"}
      <span className="instrument-meta ml-1.5 font-sans font-normal normal-case">
        {pointsLabel(points, resultLabel)}
      </span>
    </span>
  );
}

export function PlayerBreakdownDialog({
  entry,
  rank,
  open,
  onOpenChange,
}: PlayerBreakdownDialogProps) {
  const [breakdown, setBreakdown] = useState<PlayerPointsBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = entry?.user_id;
    if (!open || !userId) {
      setBreakdown(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/leaderboard/${userId}/breakdown`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Failed to load breakdown");
        }
        const data = (await res.json()) as PlayerPointsBreakdown;
        if (!cancelled) setBreakdown(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load breakdown");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, entry?.user_id]);

  const display = breakdown ?? (entry
    ? {
        user_id: entry.user_id,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url,
        total_score: entry.score,
        match_points: 0,
        props_points: 0,
        matches: [],
        props: {
          champion: null,
          top_scorer: null,
          actual_champion: null,
          actual_top_scorer: null,
          champion_points: 0,
          top_scorer_points: 0,
        },
      }
    : null);

  if (!entry || !display) return null;

  const hasPropsPicks =
    breakdown?.props.champion || breakdown?.props.top_scorer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="instrument-panel max-h-[85vh] overflow-y-auto rounded-none sm:max-w-md">
        <DialogHeader className="gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3 pr-8">
            <PlayerAvatar
              displayName={display.display_name}
              avatarUrl={display.avatar_url}
              className="size-12 shrink-0 border-2 border-primary"
              fallbackClassName="bg-secondary font-mono text-xs text-secondary-foreground"
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="instrument-heading truncate text-left text-base">
                {display.display_name}
              </DialogTitle>
              <p className="instrument-meta mt-1">
                {rank !== null ? `Rank ${String(rank).padStart(2, "0")} · ` : ""}
                {display.total_score} total points
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading && (
          <p className="instrument-meta py-6 text-center">Loading breakdown…</p>
        )}

        {error && (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && breakdown && (
          <div className="space-y-5">
            <section>
              <p className="instrument-label mb-2">Summary</p>
              <div className="space-y-2 border border-border bg-card/50 px-3 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Match predictions</span>
                  <span className="font-display font-black tabular-nums text-foreground">
                    +{breakdown.match_points}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Tournament props</span>
                  <span className="font-display font-black tabular-nums text-foreground">
                    +{breakdown.props_points}
                  </span>
                </div>
                <div className="instrument-divider flex items-center justify-between gap-3 border-t pt-2 text-sm">
                  <span className="font-display text-xs font-bold uppercase tracking-wide">
                    Total
                  </span>
                  <span className="font-display text-lg font-black tabular-nums text-primary">
                    {breakdown.total_score}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <p className="instrument-label mb-2">Matches</p>
              {breakdown.matches.length === 0 ? (
                <p className="instrument-meta border border-border px-3 py-4 text-center">
                  No finished matches scored yet
                </p>
              ) : (
                <ul className="divide-y divide-border border border-border">
                  {breakdown.matches.map((match) => (
                    <li key={match.match_id} className="px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="instrument-meta">
                            {STAGE_LABELS[match.stage] ?? match.stage}
                            <span className="mx-1.5">·</span>
                            {format(new Date(match.kickoff_at), "MMM d")}
                          </p>
                          <p className="mt-1 font-display text-xs font-bold uppercase tracking-wide sm:text-sm">
                            {match.home_team} vs {match.away_team}
                          </p>
                          <p className="instrument-meta mt-1.5">
                            Pick {formatScore(match.predicted_home, match.predicted_away)}
                            <span className="mx-1.5">·</span>
                            Actual {formatScore(match.actual_home, match.actual_away)}
                          </p>
                        </div>
                        <PointsBadge
                          points={match.points}
                          resultLabel={match.result_label}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {hasPropsPicks && (
              <section>
                <p className="instrument-label mb-2">Tournament props</p>
                <ul className="divide-y divide-border border border-border">
                  {breakdown.props.champion && (
                    <li className="flex items-start justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">Champion</p>
                        <p className="instrument-meta mt-1">
                          Pick {breakdown.props.champion}
                          {breakdown.props.actual_champion && (
                            <>
                              <span className="mx-1.5">·</span>
                              Actual {breakdown.props.actual_champion}
                            </>
                          )}
                        </p>
                      </div>
                      <PointsBadge points={breakdown.props.champion_points} />
                    </li>
                  )}
                  {breakdown.props.top_scorer && (
                    <li className="flex items-start justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">Top scorer</p>
                        <p className="instrument-meta mt-1">
                          Pick {breakdown.props.top_scorer}
                          {breakdown.props.actual_top_scorer && (
                            <>
                              <span className="mx-1.5">·</span>
                              Actual {breakdown.props.actual_top_scorer}
                            </>
                          )}
                        </p>
                      </div>
                      <PointsBadge points={breakdown.props.top_scorer_points} />
                    </li>
                  )}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

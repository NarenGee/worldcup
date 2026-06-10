"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/avatar/player-avatar";
import { formatCorrectPredictionRate } from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function formatRank(rank: number): string {
  return String(rank).padStart(2, "0");
}

function rankColor(rank: number): string {
  if (rank === 1) return "instrument-rank-gold";
  if (rank === 2) return "instrument-rank-silver";
  if (rank === 3) return "instrument-rank-bronze";
  return "text-muted-foreground";
}

type LeaderboardTableProps = {
  initialEntries: LeaderboardEntry[];
};

export function LeaderboardTable({ initialEntries }: LeaderboardTableProps) {
  const [entries, setEntries] = useState(initialEntries);
  const supabase = createClient();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("leaderboard")
        .select("*")
        .order("score", { ascending: false });
      if (data) setEntries(data);
    };

    const channel = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions" },
        fetchLeaderboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        fetchLeaderboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "props" },
        fetchLeaderboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_results" },
        fetchLeaderboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        fetchLeaderboard
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (entries.length === 0) {
    return (
      <p className="instrument-meta py-16 text-center">
        No players yet · Be the first to predict
      </p>
    );
  }

  return (
    <div className="instrument-panel">
      <div className="instrument-divider flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <span className="instrument-label">Rankings</span>
        <div className="flex items-center gap-4">
          <span className="instrument-meta hidden sm:inline">Correct %</span>
          <span className="instrument-meta">
            <span className="text-wc-blue">{entries.length}</span> Total
          </span>
        </div>
      </div>
      {entries.map((entry, index) => {
        const rank = index + 1;
        const correctPredictions = entry.correct_predictions ?? 0;

        return (
          <div
            key={entry.user_id}
            className="instrument-divider flex items-center gap-2 px-3 py-3 last:border-b-0 sm:gap-4 sm:px-4 sm:py-4"
          >
            <span
              className={cn(
                "w-6 shrink-0 font-display text-base font-black tabular-nums sm:w-8 sm:text-lg",
                rankColor(rank)
              )}
            >
              {formatRank(rank)}
            </span>
            <PlayerAvatar
              displayName={entry.display_name}
              avatarUrl={entry.avatar_url}
              className="size-8 shrink-0 border-2 border-primary sm:size-9"
              fallbackClassName="bg-secondary font-mono text-[10px] text-secondary-foreground"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xs font-bold uppercase tracking-wide sm:text-sm">
                {entry.display_name}
              </p>
              <p className="instrument-meta mt-0.5">
                <span className="hidden sm:inline">
                  {entry.matches_predicted} predicted · {entry.matches_scored}{" "}
                  scored ·{" "}
                </span>
                {entry.matches_scored > 0 ? (
                  <>
                    {correctPredictions}/{entry.matches_scored} correct
                  </>
                ) : (
                  "No results yet"
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <div className="text-right">
                <p
                  className={cn(
                    "font-display text-base font-black tabular-nums sm:text-lg",
                    entry.matches_scored > 0 ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {formatCorrectPredictionRate(entry.correct_prediction_rate)}
                </p>
                <p className="instrument-meta">Correct</p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-display text-xl font-black tabular-nums sm:text-2xl",
                    rank <= 3 ? "text-primary" : "text-foreground"
                  )}
                >
                  {entry.score}
                </p>
                <p className="instrument-meta">PTS</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

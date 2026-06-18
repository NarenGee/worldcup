"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/avatar/player-avatar";
import { PlayerBreakdownDialog } from "@/components/leaderboard/player-breakdown-dialog";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { formatAwardedPoints } from "@/lib/scoring";

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
  entries?: LeaderboardEntry[];
  viewingLabel?: string;
  onLiveEntriesChange?: (entries: LeaderboardEntry[]) => void;
};

export function LeaderboardTable({
  initialEntries,
  entries: entriesOverride,
  viewingLabel,
  onLiveEntriesChange,
}: LeaderboardTableProps) {
  const [liveEntries, setLiveEntries] = useState(initialEntries);
  const entries = entriesOverride ?? liveEntries;
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as LeaderboardEntry[];
      if (Array.isArray(data)) {
        setLiveEntries(data);
        onLiveEntriesChange?.(data);
      }
    };

    fetchLeaderboard();
    const pollInterval = window.setInterval(fetchLeaderboard, 60_000);

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
      window.clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [supabase, onLiveEntriesChange]);

  if (entries.length === 0) {
    return (
      <p className="instrument-meta py-16 text-center">
        No players yet · Be the first to predict
      </p>
    );
  }

  return (
    <>
      <div className="instrument-panel">
        <div className="instrument-divider flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <span className="instrument-label">
              {viewingLabel ? "Historical rankings" : "Rankings"}
            </span>
            {viewingLabel ? (
              <p className="instrument-meta mt-0.5 truncate">{viewingLabel}</p>
            ) : null}
          </div>
          <span className="instrument-meta shrink-0">
            <span className="text-wc-blue">{entries.length}</span> players · tap for
            breakdown
          </span>
        </div>
        {entries.map((entry, index) => {
          const rank = index + 1;

          return (
            <button
              key={entry.user_id}
              type="button"
              onClick={() => {
                setSelectedEntry(entry);
                setSelectedRank(rank);
              }}
              className="instrument-divider flex w-full items-center gap-2 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:gap-4 sm:px-4 sm:py-4"
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
                interactive={false}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xs font-bold uppercase tracking-wide sm:text-sm">
                  {entry.display_name}
                </p>
                <p className="instrument-meta mt-0.5">
                  {entry.matches_scored > 0 ? (
                    <>
                      {entry.matches_predicted} predicted · {entry.matches_scored}{" "}
                      scored
                    </>
                  ) : (
                    "No results yet"
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "font-display text-xl font-black tabular-nums sm:text-2xl",
                    rank <= 3 ? "text-primary" : "text-foreground"
                  )}
                >
                  {formatAwardedPoints(entry.score)}
                </p>
                <p className="instrument-meta">PTS</p>
              </div>
            </button>
          );
        })}
      </div>

      <PlayerBreakdownDialog
        entry={selectedEntry}
        rank={selectedRank}
        open={selectedEntry !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null);
            setSelectedRank(null);
          }
        }}
      />
    </>
  );
}

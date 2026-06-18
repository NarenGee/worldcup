"use client";

import { LeaderboardRoundNav } from "@/components/leaderboard/leaderboard-round-nav";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { PositionBumpChart } from "@/components/leaderboard/position-bump-chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardSnapshotsPayload } from "@/lib/leaderboard-snapshots";
import type { LeaderboardEntry } from "@/lib/supabase/types";
import { useEffect, useMemo, useState } from "react";

type LeaderboardSectionProps = {
  initialEntries: LeaderboardEntry[];
};

export function LeaderboardSection({ initialEntries }: LeaderboardSectionProps) {
  const [snapshots, setSnapshots] = useState<LeaderboardSnapshotsPayload | null>(null);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState<number | null>(null);
  const [liveEntries, setLiveEntries] = useState(initialEntries);

  useEffect(() => {
    let cancelled = false;

    const loadSnapshots = async () => {
      setSnapshotsLoading(true);
      setSnapshotsError(null);

      try {
        const response = await fetch("/api/leaderboard/snapshots", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load leaderboard history");
        }

        const data = (await response.json()) as LeaderboardSnapshotsPayload;
        if (!cancelled) {
          setSnapshots(data);
          setRoundIndex(data.default_round_index);
        }
      } catch (error) {
        if (!cancelled) {
          setSnapshotsError(
            error instanceof Error ? error.message : "Could not load leaderboard history"
          );
          setRoundIndex(null);
        }
      } finally {
        if (!cancelled) {
          setSnapshotsLoading(false);
        }
      }
    };

    loadSnapshots();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRoundIndex = roundIndex ?? snapshots?.default_round_index ?? 0;
  const isLiveView =
    snapshots != null && activeRoundIndex === snapshots.rounds.length - 1;

  const displayedEntries = useMemo(() => {
    if (!snapshots || isLiveView) {
      return liveEntries;
    }

    return snapshots.round_snapshots[activeRoundIndex] ?? liveEntries;
  }, [activeRoundIndex, isLiveView, liveEntries, snapshots]);

  const viewingLabel = snapshots?.rounds[activeRoundIndex]?.label;

  return (
    <div className="space-y-6">
      {snapshotsLoading ? (
        <div className="instrument-panel space-y-3 p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full max-w-xs" />
        </div>
      ) : snapshots && snapshots.rounds.length > 1 ? (
        <LeaderboardRoundNav
          rounds={snapshots.rounds}
          roundIndex={activeRoundIndex}
          onRoundIndexChange={setRoundIndex}
        />
      ) : null}

      {snapshotsError ? (
        <p className="instrument-meta text-center">{snapshotsError}</p>
      ) : null}

      <LeaderboardTable
        initialEntries={initialEntries}
        entries={displayedEntries}
        viewingLabel={isLiveView ? undefined : viewingLabel}
        onLiveEntriesChange={setLiveEntries}
      />

      {snapshots && !snapshotsLoading ? (
        <PositionBumpChart
          rounds={snapshots.rounds}
          matchSteps={snapshots.match_steps}
          rankSeries={snapshots.rank_series}
        />
      ) : snapshotsLoading ? (
        <div className="instrument-panel p-4">
          <Skeleton className="mb-3 h-4 w-36" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : null}
    </div>
  );
}

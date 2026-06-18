"use client";

import { Button } from "@/components/ui/button";
import type {
  LeaderboardMatchStep,
  LeaderboardRankSeries,
} from "@/lib/leaderboard-snapshots";
import type { TournamentRound } from "@/lib/tournament-rounds";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LINE_COLORS = [
  "#1d4ed8",
  "#dc2626",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
  "#0d9488",
  "#be123c",
];

type ChartGranularity = "round" | "match";

type PositionBumpChartProps = {
  rounds: TournamentRound[];
  matchSteps: LeaderboardMatchStep[];
  rankSeries: LeaderboardRankSeries[];
  className?: string;
};

type ChartPoint = Record<string, number | string | null>;

function buildChartData(
  rankSeries: LeaderboardRankSeries[],
  labels: string[],
  ranksKey: "ranks_by_round" | "ranks_by_match",
  visibleIds: Set<string>
): ChartPoint[] {
  return labels.map((label, index) => {
    const point: ChartPoint = { step: label, stepIndex: index };

    for (const series of rankSeries) {
      if (!visibleIds.has(series.user_id)) continue;
      point[series.user_id] = series[ranksKey][index] ?? null;
    }

    return point;
  });
}

function CustomTooltip({
  active,
  payload,
  label,
  rankSeries,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number | null; color?: string }>;
  label?: string;
  rankSeries: LeaderboardRankSeries[];
}) {
  if (!active || !payload?.length) return null;

  const nameById = new Map(rankSeries.map((series) => [series.user_id, series.display_name]));
  const rows = payload
    .filter((item) => item.value != null && item.dataKey)
    .sort((a, b) => Number(a.value) - Number(b.value));

  return (
    <div className="instrument-panel max-w-xs border border-border bg-popover p-3 text-popover-foreground shadow-md">
      <p className="instrument-label mb-2">{label}</p>
      <ul className="space-y-1">
        {rows.map((item) => (
          <li
            key={item.dataKey}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{nameById.get(item.dataKey ?? "")}</span>
            </span>
            <span className="font-display font-black tabular-nums">
              #{item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PositionBumpChart({
  rounds,
  matchSteps,
  rankSeries,
  className,
}: PositionBumpChartProps) {
  const [granularity, setGranularity] = useState<ChartGranularity>("round");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const visibleIds = useMemo(() => {
    const ids = new Set(rankSeries.map((series) => series.user_id));
    hiddenIds.forEach((hiddenId) => {
      ids.delete(hiddenId);
    });
    return ids;
  }, [hiddenIds, rankSeries]);

  const labels =
    granularity === "round"
      ? rounds.map((round) => round.shortLabel)
      : matchSteps.map((step) => step.label);

  const chartData = useMemo(
    () =>
      buildChartData(
        rankSeries,
        labels,
        granularity === "round" ? "ranks_by_round" : "ranks_by_match",
        visibleIds
      ),
    [granularity, labels, rankSeries, visibleIds]
  );

  const playerCount = rankSeries.length;
  const maxRank = Math.max(playerCount, 1);

  const togglePlayer = (userId: string) => {
    setHiddenIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  if (rankSeries.length === 0 || labels.length <= 1) {
    return (
      <div className={cn("instrument-panel px-4 py-10 text-center", className)}>
        <p className="instrument-meta">
          Position chart will appear once results start coming in.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="instrument-panel">
        <div className="instrument-divider flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div>
            <span className="instrument-label">Position chart</span>
            <p className="instrument-meta mt-1">
              Rank over time · lower line is better
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-none border border-border p-0.5">
            <Button
              type="button"
              size="sm"
              variant={granularity === "round" ? "default" : "ghost"}
              className="rounded-none"
              onClick={() => setGranularity("round")}
            >
              By round
            </Button>
            <Button
              type="button"
              size="sm"
              variant={granularity === "match" ? "default" : "ghost"}
              className="rounded-none"
              onClick={() => setGranularity("match")}
            >
              By match
            </Button>
          </div>
        </div>

        <div className="px-2 py-4 sm:px-4">
          <div className="h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  angle={labels.length > 6 ? -28 : 0}
                  textAnchor={labels.length > 6 ? "end" : "middle"}
                  height={labels.length > 6 ? 56 : 32}
                />
                <YAxis
                  reversed
                  domain={[1, maxRank]}
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  width={28}
                  label={{
                    value: "Rank",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 10, textAnchor: "middle" },
                  }}
                />
                <Tooltip
                  content={<CustomTooltip rankSeries={rankSeries} />}
                />
                {rankSeries.map((series, index) => {
                  if (!visibleIds.has(series.user_id)) return null;

                  return (
                    <Line
                      key={series.user_id}
                      type="monotone"
                      dataKey={series.user_id}
                      name={series.display_name}
                      stroke={LINE_COLORS[index % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="instrument-panel">
        <div className="instrument-divider px-3 py-3 sm:px-4">
          <span className="instrument-label">Players</span>
          <p className="instrument-meta mt-1">
            Tap to show or hide lines on the chart
          </p>
        </div>
        <div className="flex flex-wrap gap-2 px-3 py-3 sm:px-4">
          {rankSeries.map((series, index) => {
            const isVisible = visibleIds.has(series.user_id);
            const color = LINE_COLORS[index % LINE_COLORS.length];

            return (
              <button
                key={series.user_id}
                type="button"
                onClick={() => togglePlayer(series.user_id)}
                className={cn(
                  "inline-flex items-center gap-2 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  isVisible
                    ? "border-border bg-background text-foreground"
                    : "border-border/50 bg-muted/40 text-muted-foreground line-through"
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: isVisible ? color : "transparent" }}
                />
                {series.display_name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

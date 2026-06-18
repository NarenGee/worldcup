"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TournamentRound } from "@/lib/tournament-rounds";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type LeaderboardRoundNavProps = {
  rounds: TournamentRound[];
  roundIndex: number;
  onRoundIndexChange: (index: number) => void;
  className?: string;
};

export function LeaderboardRoundNav({
  rounds,
  roundIndex,
  onRoundIndexChange,
  className,
}: LeaderboardRoundNavProps) {
  if (rounds.length <= 1) return null;

  const currentRound = rounds[roundIndex];
  const atStart = roundIndex <= 0;
  const atEnd = roundIndex >= rounds.length - 1;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="instrument-label">Viewing</p>
          <p className="truncate font-display text-sm font-bold uppercase tracking-wide sm:text-base">
            {currentRound?.label ?? "Leaderboard"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous round"
            disabled={atStart}
            onClick={() => onRoundIndexChange(roundIndex - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next round"
            disabled={atEnd}
            onClick={() => onRoundIndexChange(roundIndex + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="range"
          min={0}
          max={rounds.length - 1}
          step={1}
          value={roundIndex}
          onChange={(event) => onRoundIndexChange(Number(event.target.value))}
          aria-label="Scrub leaderboard by round"
          className="h-2 w-full flex-1 cursor-pointer accent-primary"
        />
        <Select
          value={String(roundIndex)}
          onValueChange={(value) => onRoundIndexChange(Number(value))}
        >
          <SelectTrigger className="w-full rounded-none sm:w-52" size="sm">
            <SelectValue placeholder="Jump to round" />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {rounds.map((round, index) => (
              <SelectItem key={round.id} value={String(index)}>
                {round.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

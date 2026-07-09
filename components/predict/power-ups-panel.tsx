"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  POWER_UP_DESCRIPTIONS,
  POWER_UP_LABELS,
  POWER_UP_TYPES,
  type PowerUpType,
  isPowerUpEligibleMatch,
} from "@/lib/power-ups";
import { isMatchLocked } from "@/lib/predictions";
import type { Match, UserPowerUp } from "@/lib/supabase/types";
import { formatTeam } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type PowerUpsPanelProps = {
  qfMatches: Match[];
  powerUps: UserPowerUp[];
  onAssign: (type: PowerUpType, matchId: number | null) => Promise<void>;
};

function formatMatchLabel(match: Match): string {
  return `${formatTeam(match.home_team)} vs ${formatTeam(match.away_team)} · ${format(
    new Date(match.kickoff_at),
    "d MMM HH:mm"
  )}`;
}

export function PowerUpsPanel({
  qfMatches,
  powerUps,
  onAssign,
}: PowerUpsPanelProps) {
  const [savingType, setSavingType] = useState<PowerUpType | null>(null);

  if (qfMatches.length === 0) return null;

  const openMatches = qfMatches.filter((match) => isPowerUpEligibleMatch(match));
  const hasAnyOpen = openMatches.length > 0;

  async function handleAssign(type: PowerUpType, matchId: number | null) {
    setSavingType(type);
    try {
      await onAssign(type, matchId);
      if (matchId) {
        toast.success(`${POWER_UP_LABELS[type]} assigned`);
      } else {
        toast.success(`${POWER_UP_LABELS[type]} cleared`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update power-up"
      );
    } finally {
      setSavingType(null);
    }
  }

  return (
    <section className="instrument-panel">
      <div className="instrument-divider px-3 py-3 sm:px-4">
        <p className="instrument-label">Quarter-final power-ups</p>
        <p className="instrument-meta mt-1.5 normal-case tracking-normal">
          One double-points pick and one sneak peek for the quarter-finals.
          Change either until that match kicks off.
        </p>
      </div>

      <div className="divide-y divide-border sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {POWER_UP_TYPES.map((type) => {
          const assigned = powerUps.find((powerUp) => powerUp.power_up_type === type);
          const assignedMatch = assigned
            ? qfMatches.find((match) => match.id === assigned.match_id)
            : null;
          const assignedLocked = assignedMatch
            ? isMatchLocked(assignedMatch.kickoff_at)
            : false;
          const canEdit = hasAnyOpen && !assignedLocked;

          return (
            <div key={type} className="space-y-4 px-3 py-4 sm:px-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="instrument-heading text-sm">
                    {POWER_UP_LABELS[type]}
                  </h2>
                  {assignedMatch && (
                    <Badge
                      variant="outline"
                      className="rounded-none border-accent/40 text-[10px] uppercase tracking-widest text-accent"
                    >
                      {assignedLocked ? "Locked" : "Active"}
                    </Badge>
                  )}
                </div>
                <p className="instrument-meta normal-case tracking-normal">
                  {POWER_UP_DESCRIPTIONS[type]}
                </p>
              </div>

              {assignedMatch ? (
                <div className="border border-border bg-secondary/20 px-3 py-2.5">
                  <p className="instrument-label mb-1">Assigned match</p>
                  <p className="text-sm">{formatMatchLabel(assignedMatch)}</p>
                </div>
              ) : (
                <p className="instrument-meta normal-case tracking-normal">
                  Not assigned yet
                </p>
              )}

              {canEdit ? (
                <div className="space-y-2">
                  {openMatches.map((match) => {
                    const isSelected = assigned?.match_id === match.id;
                    return (
                      <Button
                        key={match.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-auto w-full justify-start rounded-none px-3 py-2 text-left",
                          isSelected && "ring-1 ring-accent"
                        )}
                        disabled={savingType === type}
                        onClick={() =>
                          handleAssign(type, isSelected ? null : match.id)
                        }
                      >
                        <span className="text-sm">{formatMatchLabel(match)}</span>
                      </Button>
                    );
                  })}
                </div>
              ) : assignedMatch ? (
                <p className="instrument-meta normal-case tracking-normal">
                  {assignedLocked
                    ? "This power-up is locked in for this match."
                    : "No open quarter-finals left to reassign."}
                </p>
              ) : (
                <p className="instrument-meta normal-case tracking-normal">
                  Quarter-finals are locked — power-ups can no longer be assigned.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  POWER_UP_DESCRIPTIONS,
  POWER_UP_LABELS,
  POWER_UP_TYPES,
  type PowerUpType,
  canAssignSneakPeek,
  canEditDoublePoints,
  getAssignedPowerUp,
  isDoublePointsLocked,
  isPowerUpEligibleMatch,
  isSneakPeekLocked,
} from "@/lib/power-ups";
import type { Match, UserPowerUp } from "@/lib/supabase/types";
import { formatTeam } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type PowerUpsPanelProps = {
  qfMatches: Match[];
  powerUps: UserPowerUp[];
  onAssign: (type: PowerUpType, matchId: number) => Promise<void>;
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
  const [pendingSneakPeekMatch, setPendingSneakPeekMatch] =
    useState<Match | null>(null);

  if (qfMatches.length === 0) return null;

  const openMatches = qfMatches.filter((match) => isPowerUpEligibleMatch(match));

  async function handleAssign(type: PowerUpType, matchId: number) {
    setSavingType(type);
    try {
      await onAssign(type, matchId);
      toast.success(`${POWER_UP_LABELS[type]} assigned`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update power-up"
      );
    } finally {
      setSavingType(null);
    }
  }

  async function confirmSneakPeek() {
    if (!pendingSneakPeekMatch) return;
    const matchId = pendingSneakPeekMatch.id;
    setPendingSneakPeekMatch(null);
    await handleAssign("sneak_peek", matchId);
  }

  return (
    <>
      <section className="instrument-panel">
        <div className="instrument-divider px-3 py-3 sm:px-4">
          <p className="instrument-label">Quarter-final power-ups</p>
          <p className="instrument-meta mt-1.5 normal-case tracking-normal">
            One double-points pick and one sneak peek for the quarter-finals.
            Sneak peek locks in when confirmed. Double points can be changed
            until that match kicks off.
          </p>
        </div>

        <div className="divide-y divide-border sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {POWER_UP_TYPES.map((type) => {
            const assigned = getAssignedPowerUp(powerUps, type);
            const assignedMatch = assigned
              ? qfMatches.find((match) => match.id === assigned.match_id)
              : null;
            const locked =
              type === "sneak_peek"
                ? isSneakPeekLocked(powerUps)
                : isDoublePointsLocked(powerUps, qfMatches);
            const canEdit =
              type === "sneak_peek"
                ? canAssignSneakPeek(powerUps, qfMatches)
                : canEditDoublePoints(powerUps, qfMatches);

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
                        {locked ? "Locked" : "Active"}
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
                          disabled={
                            savingType === type ||
                            (type === "double_points" && isSelected)
                          }
                          onClick={() => {
                            if (type === "sneak_peek") {
                              setPendingSneakPeekMatch(match);
                              return;
                            }
                            void handleAssign(type, match.id);
                          }}
                        >
                          <span className="text-sm">
                            {formatMatchLabel(match)}
                            {type === "double_points" && isSelected
                              ? " · Selected"
                              : ""}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ) : assignedMatch ? (
                  <p className="instrument-meta normal-case tracking-normal">
                    {locked
                      ? type === "sneak_peek"
                        ? "Sneak peek is locked in and cannot be changed."
                        : "Double points are locked in — this match has kicked off."
                      : "No open quarter-finals left to assign."}
                  </p>
                ) : (
                  <p className="instrument-meta normal-case tracking-normal">
                    Quarter-finals are locked — power-ups can no longer be
                    assigned.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Dialog
        open={pendingSneakPeekMatch !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSneakPeekMatch(null);
        }}
      >
        <DialogContent className="instrument-panel max-w-md rounded-none sm:max-w-md">
          <DialogHeader className="gap-3 border-b border-border pb-4">
            <p className="instrument-label">Confirm sneak peek</p>
            <DialogTitle className="instrument-heading text-left text-base">
              Lock in this match?
            </DialogTitle>
            <DialogDescription className="instrument-meta text-left normal-case tracking-normal">
              {pendingSneakPeekMatch
                ? `Use sneak peek on ${formatMatchLabel(pendingSneakPeekMatch)}. This cannot be changed once confirmed.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="border-t border-border bg-transparent p-0 pt-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-none uppercase tracking-widest"
              onClick={() => setPendingSneakPeekMatch(null)}
              disabled={savingType === "sneak_peek"}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none uppercase tracking-widest"
              onClick={() => void confirmSneakPeek()}
              disabled={savingType === "sneak_peek"}
            >
              {savingType === "sneak_peek" ? "Locking..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

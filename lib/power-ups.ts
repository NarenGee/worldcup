import { isMatchLocked } from "@/lib/predictions";
import type { Match, UserPowerUp } from "@/lib/supabase/types";

export type PowerUpType = UserPowerUp["power_up_type"];

export const POWER_UP_TYPES: PowerUpType[] = ["double_points", "sneak_peek"];

export const POWER_UP_LABELS: Record<PowerUpType, string> = {
  double_points: "Double Points",
  sneak_peek: "Sneak Peek",
};

export const POWER_UP_DESCRIPTIONS: Record<PowerUpType, string> = {
  double_points:
    "Earn double match points on one quarter-final. Changeable until that match kicks off.",
  sneak_peek:
    "Reveal all rivals' saved picks on one quarter-final before kickoff. Locks in when confirmed.",
};

export function isPowerUpEligibleMatch(
  match: Pick<Match, "stage" | "kickoff_at">,
  now = new Date()
): boolean {
  return match.stage === "qf" && !isMatchLocked(match.kickoff_at, now);
}

export function getAssignedPowerUp(
  powerUps: UserPowerUp[],
  type: PowerUpType
): UserPowerUp | undefined {
  return powerUps.find((powerUp) => powerUp.power_up_type === type);
}

export function isSneakPeekLocked(
  powerUps: UserPowerUp[]
): boolean {
  return !!getAssignedPowerUp(powerUps, "sneak_peek");
}

export function isDoublePointsLocked(
  powerUps: UserPowerUp[],
  qfMatches: Pick<Match, "id" | "kickoff_at">[],
  now = new Date()
): boolean {
  const assigned = getAssignedPowerUp(powerUps, "double_points");
  if (!assigned) return false;

  const assignedMatch = qfMatches.find((match) => match.id === assigned.match_id);
  if (!assignedMatch) return true;

  return isMatchLocked(assignedMatch.kickoff_at, now);
}

export function canEditDoublePoints(
  powerUps: UserPowerUp[],
  qfMatches: Pick<Match, "id" | "stage" | "kickoff_at">[],
  now = new Date()
): boolean {
  if (isDoublePointsLocked(powerUps, qfMatches, now)) return false;
  return qfMatches.some((match) => isPowerUpEligibleMatch(match, now));
}

export function canAssignSneakPeek(
  powerUps: UserPowerUp[],
  qfMatches: Pick<Match, "stage" | "kickoff_at">[],
  now = new Date()
): boolean {
  if (isSneakPeekLocked(powerUps)) return false;
  return qfMatches.some((match) => isPowerUpEligibleMatch(match, now));
}

export function getPowerUpForMatch(
  powerUps: UserPowerUp[],
  matchId: number,
  type: PowerUpType
): UserPowerUp | undefined {
  return powerUps.find(
    (powerUp) => powerUp.power_up_type === type && powerUp.match_id === matchId
  );
}

export function getAssignedPowerUpMatchId(
  powerUps: UserPowerUp[],
  type: PowerUpType
): number | null {
  return powerUps.find((powerUp) => powerUp.power_up_type === type)?.match_id ?? null;
}

export function hasSneakPeekOnMatch(
  powerUps: UserPowerUp[],
  matchId: number
): boolean {
  return !!getPowerUpForMatch(powerUps, matchId, "sneak_peek");
}

export function hasDoublePointsOnMatch(
  powerUps: UserPowerUp[],
  matchId: number
): boolean {
  return !!getPowerUpForMatch(powerUps, matchId, "double_points");
}

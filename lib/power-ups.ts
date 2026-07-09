import { isMatchLocked } from "@/lib/predictions";
import type { Match, UserPowerUp } from "@/lib/supabase/types";

export type PowerUpType = UserPowerUp["power_up_type"];

export const POWER_UP_TYPES: PowerUpType[] = ["double_points", "sneak_peek"];

export const POWER_UP_LABELS: Record<PowerUpType, string> = {
  double_points: "Double Points",
  sneak_peek: "Sneak Peek",
};

export const POWER_UP_DESCRIPTIONS: Record<PowerUpType, string> = {
  double_points: "Earn double match points on one quarter-final.",
  sneak_peek: "Reveal all rivals' saved picks on one quarter-final before kickoff.",
};

export function isPowerUpEligibleMatch(
  match: Pick<Match, "stage" | "kickoff_at">,
  now = new Date()
): boolean {
  return match.stage === "qf" && !isMatchLocked(match.kickoff_at, now);
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

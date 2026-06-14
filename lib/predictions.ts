import type { Prediction } from "@/lib/supabase/types";

export const DEFAULT_PREDICTION = { home: 1, away: 1 } as const;

export function isMatchLocked(kickoffAt: string, now = new Date()): boolean {
  return new Date(kickoffAt) <= now;
}

export function getEffectivePrediction(
  kickoffAt: string,
  prediction?: Pick<
    Prediction,
    "predicted_home" | "predicted_away" | "is_default"
  > | null,
  now = new Date()
): {
  predicted_home: number;
  predicted_away: number;
  isDefault: boolean;
} {
  if (prediction) {
    return {
      predicted_home: prediction.predicted_home,
      predicted_away: prediction.predicted_away,
      isDefault: prediction.is_default ?? false,
    };
  }

  if (isMatchLocked(kickoffAt, now)) {
    return {
      predicted_home: DEFAULT_PREDICTION.home,
      predicted_away: DEFAULT_PREDICTION.away,
      isDefault: true,
    };
  }

  return {
    predicted_home: 0,
    predicted_away: 0,
    isDefault: false,
  };
}

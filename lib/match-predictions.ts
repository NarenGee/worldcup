import type { Prediction } from "@/lib/supabase/types";
import { getEffectivePrediction } from "@/lib/predictions";

export type PlayerProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type MatchPlayerPick = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  predictedHome: number;
  predictedAway: number;
  isDefault: boolean;
  hasSubmitted: boolean;
  isCurrentUser: boolean;
};

export function formatPredictionScore(home: number, away: number): string {
  return `${String(home).padStart(2, "0")}–${String(away).padStart(2, "0")}`;
}

export function buildMatchPlayerPicks(
  kickoffAt: string,
  players: PlayerProfile[],
  predictionsForMatch: Record<
    string,
    Pick<Prediction, "predicted_home" | "predicted_away"> | undefined
  >,
  currentUserId?: string
): MatchPlayerPick[] {
  return players
    .map((player) => {
      const stored = predictionsForMatch[player.id];
      const effective = getEffectivePrediction(kickoffAt, stored);

      return {
        userId: player.id,
        displayName: player.display_name,
        avatarUrl: player.avatar_url,
        predictedHome: effective.predicted_home,
        predictedAway: effective.predicted_away,
        isDefault: effective.isDefault,
        hasSubmitted: !!stored,
        isCurrentUser: player.id === currentUserId,
      };
    })
    .sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
}

export function groupPredictionsByMatch(
  predictions: Array<
    Pick<Prediction, "user_id" | "match_id" | "predicted_home" | "predicted_away">
  >
): Record<number, Record<string, Pick<Prediction, "predicted_home" | "predicted_away">>> {
  const grouped: Record<
    number,
    Record<string, Pick<Prediction, "predicted_home" | "predicted_away">>
  > = {};

  for (const prediction of predictions) {
    if (!grouped[prediction.match_id]) {
      grouped[prediction.match_id] = {};
    }
    grouped[prediction.match_id][prediction.user_id] = {
      predicted_home: prediction.predicted_home,
      predicted_away: prediction.predicted_away,
    };
  }

  return grouped;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { awardMatchPoints, calculatePropsPoints } from "@/lib/scoring";
import type { Database, LeaderboardEntry, Match, Profile } from "@/lib/supabase/types";
import {
  buildGroupMatchdayMap,
  buildTournamentRounds,
  formatMatchStepLabel,
  getMatchesForRound,
  type TournamentRound,
} from "@/lib/tournament-rounds";

type PredictionRow = {
  user_id: string;
  match_id: number;
  predicted_home: number;
  predicted_away: number;
  points: number | null;
  is_default: boolean;
};

type PropsRow = {
  user_id: string;
  champion: string | null;
  top_scorer: string | null;
};

export type LeaderboardMatchStep = {
  id: string;
  label: string;
  match_id: number | null;
  kickoff_at: string | null;
};

export type LeaderboardRankSeries = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  ranks_by_round: (number | null)[];
  ranks_by_match: (number | null)[];
};

export type LeaderboardSnapshotsPayload = {
  rounds: TournamentRound[];
  round_snapshots: LeaderboardEntry[][];
  match_steps: LeaderboardMatchStep[];
  match_snapshots: LeaderboardEntry[][];
  rank_series: LeaderboardRankSeries[];
  default_round_index: number;
};

function buildPredictionMap(predictions: PredictionRow[]) {
  const map = new Map<string, Map<number, PredictionRow>>();

  for (const prediction of predictions) {
    if (!map.has(prediction.user_id)) {
      map.set(prediction.user_id, new Map());
    }
    map.get(prediction.user_id)!.set(prediction.match_id, prediction);
  }

  return map;
}

function buildPropsMap(props: PropsRow[]) {
  return new Map(props.map((row) => [row.user_id, row]));
}

function matchPointsForUser(
  userId: string,
  match: Match,
  predictionMap: Map<string, Map<number, PredictionRow>>
): number {
  if (!match.result_confirmed || match.home_score === null || match.away_score === null) {
    return 0;
  }

  const prediction = predictionMap.get(userId)?.get(match.id);
  const predictedHome = prediction?.predicted_home ?? 1;
  const predictedAway = prediction?.predicted_away ?? 1;
  const isDefault = prediction?.is_default ?? !prediction;

  if (prediction?.points != null) {
    return prediction.points;
  }

  return awardMatchPoints(
    predictedHome,
    predictedAway,
    match.home_score,
    match.away_score,
    match.result_confirmed,
    isDefault
  );
}

function propsPointsForUser(
  userId: string,
  propsMap: Map<string, PropsRow>,
  actualChampion: string | null,
  actualTopScorer: string | null,
  includeProps: boolean
): number {
  if (!includeProps) return 0;

  const props = propsMap.get(userId);
  return calculatePropsPoints(
    props?.champion ?? null,
    props?.top_scorer ?? null,
    actualChampion,
    actualTopScorer
  );
}

function computeSnapshotEntries(
  profiles: Profile[],
  scopeMatches: Match[],
  scoringMatches: Match[],
  predictionMap: Map<string, Map<number, PredictionRow>>,
  propsMap: Map<string, PropsRow>,
  actualChampion: string | null,
  actualTopScorer: string | null,
  includeProps: boolean
): LeaderboardEntry[] {
  const entries = profiles.map((profile) => {
    let matchScore = 0;
    let matchesScored = 0;

    for (const match of scoringMatches) {
      const points = matchPointsForUser(profile.id, match, predictionMap);
      matchScore += points;
      if (match.result_confirmed) {
        matchesScored += 1;
      }
    }

    const propsScore = propsPointsForUser(
      profile.id,
      propsMap,
      actualChampion,
      actualTopScorer,
      includeProps
    );

    return {
      user_id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      score: matchScore + propsScore,
      matches_scored: matchesScored,
      matches_predicted: scopeMatches.length,
    };
  });

  return entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.display_name.localeCompare(b.display_name);
  });
}

function ranksFromEntries(entries: LeaderboardEntry[]): Map<string, number> {
  const ranks = new Map<string, number>();
  entries.forEach((entry, index) => {
    ranks.set(entry.user_id, index + 1);
  });
  return ranks;
}

function defaultRoundIndex(rounds: TournamentRound[]): number {
  return Math.max(0, rounds.length - 1);
}

export async function getLeaderboardSnapshots(
  supabase: SupabaseClient<Database>
): Promise<LeaderboardSnapshotsPayload> {
  const [
    { data: profiles, error: profilesError },
    { data: matches, error: matchesError },
    { data: predictions, error: predictionsError },
    { data: props, error: propsError },
    { data: tournamentResults, error: tournamentResultsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_active")
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("matches")
      .select(
        "id, stage, home_team, away_team, kickoff_at, home_score, away_score, result_confirmed"
      )
      .order("kickoff_at"),
    supabase
      .from("predictions")
      .select("user_id, match_id, predicted_home, predicted_away, points, is_default"),
    supabase.from("props").select("user_id, champion, top_scorer"),
    supabase.from("tournament_results").select("champion, top_scorer").eq("id", 1).maybeSingle(),
  ]);

  if (profilesError) throw profilesError;
  if (matchesError) throw matchesError;
  if (predictionsError) throw predictionsError;
  if (propsError) throw propsError;
  if (tournamentResultsError) throw tournamentResultsError;

  const activeProfiles = (profiles ?? []) as Profile[];
  const allMatches = (matches ?? []) as Match[];
  const predictionMap = buildPredictionMap((predictions ?? []) as PredictionRow[]);
  const propsMap = buildPropsMap((props ?? []) as PropsRow[]);
  const actualChampion = tournamentResults?.champion ?? null;
  const actualTopScorer = tournamentResults?.top_scorer ?? null;
  const propsResultsSet = Boolean(actualChampion || actualTopScorer);

  const groupMatchdayMap = buildGroupMatchdayMap(allMatches);
  const rounds = buildTournamentRounds(allMatches, propsResultsSet);

  const roundSnapshots = rounds.map((round) => {
    const scopeMatches = getMatchesForRound(allMatches, round, groupMatchdayMap);
    const scoringMatches = scopeMatches.filter((match) => match.result_confirmed);
    const includeProps = round.kind === "props" || round.kind === "live";

    return computeSnapshotEntries(
      activeProfiles,
      scopeMatches,
      scoringMatches,
      predictionMap,
      propsMap,
      actualChampion,
      actualTopScorer,
      includeProps
    );
  });

  const matchSteps: LeaderboardMatchStep[] = [
    {
      id: "start",
      label: "Kickoff",
      match_id: null,
      kickoff_at: null,
    },
  ];

  const matchSnapshots: LeaderboardEntry[][] = [
    computeSnapshotEntries(
      activeProfiles,
      [],
      [],
      predictionMap,
      propsMap,
      actualChampion,
      actualTopScorer,
      false
    ),
  ];

  const matchesByKickoff = [...allMatches].sort(
    (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
  );

  const confirmedSoFar: Match[] = [];

  for (const match of matchesByKickoff) {
    if (!match.result_confirmed) continue;

    confirmedSoFar.push(match);
    matchSteps.push({
      id: `match-${match.id}`,
      label: formatMatchStepLabel(match),
      match_id: match.id,
      kickoff_at: match.kickoff_at,
    });

    matchSnapshots.push(
      computeSnapshotEntries(
        activeProfiles,
        confirmedSoFar,
        confirmedSoFar,
        predictionMap,
        propsMap,
        actualChampion,
        actualTopScorer,
        false
      )
    );
  }

  if (propsResultsSet) {
    matchSteps.push({
      id: "props",
      label: "Tournament Props",
      match_id: null,
      kickoff_at: null,
    });

    matchSnapshots.push(
      computeSnapshotEntries(
        activeProfiles,
        confirmedSoFar,
        confirmedSoFar,
        predictionMap,
        propsMap,
        actualChampion,
        actualTopScorer,
        true
      )
    );
  }

  const roundRankSteps = roundSnapshots.map((snapshot) => ranksFromEntries(snapshot));
  const matchRankSteps = matchSnapshots.map((snapshot) => ranksFromEntries(snapshot));

  const rankSeries: LeaderboardRankSeries[] = activeProfiles.map((profile) => ({
    user_id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    ranks_by_round: roundRankSteps.map((stepRanks) => stepRanks.get(profile.id) ?? null),
    ranks_by_match: matchRankSteps.map((stepRanks) => stepRanks.get(profile.id) ?? null),
  }));

  return {
    rounds,
    round_snapshots: roundSnapshots,
    match_steps: matchSteps,
    match_snapshots: matchSnapshots,
    rank_series: rankSeries,
    default_round_index: defaultRoundIndex(rounds),
  };
}

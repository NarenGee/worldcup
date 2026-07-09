export function calculateMatchPoints(
  predictedHome: number,
  predictedAway: number,
  homeScore: number | null,
  awayScore: number | null,
  resultConfirmed: boolean
): number {
  if (!resultConfirmed || homeScore === null || awayScore === null) {
    return 0;
  }

  if (predictedHome === homeScore && predictedAway === awayScore) {
    return 3;
  }

  const predictedSign = Math.sign(predictedHome - predictedAway);
  const actualSign = Math.sign(homeScore - awayScore);

  if (predictedSign === actualSign) {
    return 1;
  }

  return 0;
}

export function awardMatchPoints(
  predictedHome: number,
  predictedAway: number,
  homeScore: number | null,
  awayScore: number | null,
  resultConfirmed: boolean,
  isDefault: boolean,
  isDoubled = false
): number {
  const base = calculateMatchPoints(
    predictedHome,
    predictedAway,
    homeScore,
    awayScore,
    resultConfirmed
  );
  const awarded = isDefault ? base / 2 : base;
  return isDoubled ? awarded * 2 : awarded;
}

export function formatAwardedPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export function baseResultLabel(
  predictedHome: number,
  predictedAway: number,
  homeScore: number | null,
  awayScore: number | null,
  resultConfirmed: boolean
): "exact" | "outcome" | "miss" {
  const base = calculateMatchPoints(
    predictedHome,
    predictedAway,
    homeScore,
    awayScore,
    resultConfirmed
  );
  if (base === 3) return "exact";
  if (base === 1) return "outcome";
  return "miss";
}

export function calculatePropsPoints(
  champion: string | null,
  topScorer: string | null,
  actualChampion: string | null,
  actualTopScorer: string | null
): number {
  let points = 0;
  if (champion && actualChampion && champion === actualChampion) {
    points += 5;
  }
  if (topScorer && actualTopScorer && topScorer === actualTopScorer) {
    points += 3;
  }
  return points;
}

export function outcomeLabel(home: number, away: number): string {
  if (home > away) return "Home win";
  if (home < away) return "Away win";
  return "Draw";
}

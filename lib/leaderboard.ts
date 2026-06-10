export function formatCorrectPredictionRate(
  rate: number | null | undefined
): string {
  if (rate === null || rate === undefined) return "—";
  return Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(1)}%`;
}

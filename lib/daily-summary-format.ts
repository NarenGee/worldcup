export type PickKind = "chosen" | "chosen_one_one" | "default";

export function classifyPick(
  predictedHome: number,
  predictedAway: number,
  isDefault: boolean
): PickKind {
  if (isDefault) return "default";
  if (predictedHome === 1 && predictedAway === 1) return "chosen_one_one";
  return "chosen";
}

export function formatPickLabel(
  predictedHome: number,
  predictedAway: number,
  isDefault: boolean
): string {
  const score = `${predictedHome}-${predictedAway}`;
  const kind = classifyPick(predictedHome, predictedAway, isDefault);

  if (kind === "default") {
    return `${score} (auto-default, missed deadline)`;
  }
  if (kind === "chosen_one_one") {
    return `${score} (chosen 1-1)`;
  }
  return `${score} (chosen)`;
}

export function pickKindLabel(kind: PickKind): string {
  if (kind === "default") return "auto-default";
  if (kind === "chosen_one_one") return "chosen 1-1";
  return "chosen";
}

export function pickKindDescription(kind: PickKind): string {
  if (kind === "default") {
    return "auto-default 1-1 (missed deadline, half points)";
  }
  if (kind === "chosen_one_one") {
    return "deliberate 1-1 (chosen before kickoff)";
  }
  return "chosen pick (submitted before kickoff)";
}

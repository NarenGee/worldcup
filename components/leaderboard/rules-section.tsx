const MATCH_RULES = [
  { label: "Exact score", points: 3 },
  { label: "Correct outcome", points: 1, detail: "win, draw, or loss" },
  { label: "Wrong outcome", points: 0 },
] as const;

const PROP_RULES = [
  { label: "Champion", points: 5 },
  { label: "Top scorer", points: 3 },
] as const;

export function RulesSection() {
  return (
    <section className="instrument-panel">
      <div className="instrument-divider px-3 py-3 sm:px-4">
        <span className="instrument-label">Rules</span>
      </div>

      <div className="divide-y divide-border sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="space-y-4 px-3 py-4 sm:px-4">
          <div>
            <h2 className="instrument-heading text-sm">Match predictions</h2>
            <p className="instrument-meta mt-1.5">
              Pick a score for every match on the Predict page before kickoff.
              Missed picks default to 1–1 and lock at kickoff. Other players&apos;
              picks stay hidden until kickoff — yours are always visible to you.
            </p>
          </div>
          <ul className="space-y-2">
            {MATCH_RULES.map((rule) => (
              <li
                key={rule.label}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-sm text-foreground">
                  {rule.label}
                  {"detail" in rule && (
                    <span className="instrument-meta ml-1 normal-case">
                      ({rule.detail})
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-display text-sm font-black tabular-nums text-primary">
                  +{rule.points}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 px-3 py-4 sm:px-4">
          <div>
            <h2 className="instrument-heading text-sm">Tournament props</h2>
            <p className="instrument-meta mt-1.5">
              Pick the champion and top scorer once. Locked when the first group
              match kicks off.
            </p>
          </div>
          <ul className="space-y-2">
            {PROP_RULES.map((rule) => (
              <li
                key={rule.label}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-sm text-foreground">{rule.label}</span>
                <span className="shrink-0 font-display text-sm font-black tabular-nums text-primary">
                  +{rule.points}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="instrument-divider border-t px-3 py-3 sm:px-4">
        <p className="text-sm text-muted-foreground">
          Total points = match points + prop points. Correct % is the share of
          finished matches where you picked the right outcome (win, draw, or
          loss). The leaderboard updates in real time. Sign in to submit your
          picks.
        </p>
      </div>
    </section>
  );
}

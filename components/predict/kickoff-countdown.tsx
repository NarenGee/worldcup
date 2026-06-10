"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type KickoffCountdownProps = {
  kickoffAt: string | null;
};

export function KickoffCountdown({ kickoffAt }: KickoffCountdownProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!kickoffAt) {
      setLabel("");
      return;
    }

    const update = () => {
      const kickoff = new Date(kickoffAt);
      const now = new Date();
      if (kickoff <= now) {
        setLabel("Next match kicking off soon");
        return;
      }
      setLabel(
        `Next kickoff in ${formatDistanceToNow(kickoff, { addSuffix: false })}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [kickoffAt]);

  if (!label) return null;

  return (
    <div className="instrument-status-bar">{label}</div>
  );
}

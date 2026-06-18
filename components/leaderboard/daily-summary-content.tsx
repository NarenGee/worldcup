import { cn } from "@/lib/utils";
import { isTakeBulletLine } from "@/lib/daily-summary-opener";
import type { ReactNode } from "react";

type ParsedLine =
  | { kind: "take"; text: string }
  | { kind: "bullet"; text: string; indent: number }
  | { kind: "paragraph"; text: string };

function parseSummaryLines(summary: string): ParsedLine[] {
  const parsed: ParsedLine[] = [];
  let inTakeSection = true;

  for (const rawLine of summary.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const bulletMatch = line.match(/^(\s*)[-•]\s+(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const text = bulletMatch[2].trim();

      if (inTakeSection && isTakeBulletLine(text)) {
        parsed.push({ kind: "take", text });
        continue;
      }

      inTakeSection = false;
      parsed.push({ kind: "bullet", text, indent });
      continue;
    }

    inTakeSection = false;
    parsed.push({ kind: "paragraph", text: line.trim() });
  }

  return parsed;
}

function parseBulletSummary(summary: string): ReactNode[] {
  const lines = parseSummaryLines(summary);
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let takeItems: ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul
        key={`list-${listKey++}`}
        className="list-none space-y-1.5 pl-0 text-sm leading-relaxed text-foreground/90"
      >
        {listItems}
      </ul>
    );
    listItems = [];
  };

  const flushTake = () => {
    if (takeItems.length === 0) return;
    nodes.push(
      <div key={`take-${listKey++}`} className="space-y-1.5">
        <p className="font-display text-[10px] font-black uppercase tracking-widest text-primary">
          The take
        </p>
        <ul className="list-none space-y-1.5 pl-0 text-sm leading-relaxed text-foreground/90">
          {takeItems}
        </ul>
      </div>
    );
    takeItems = [];
  };

  for (const line of lines) {
    if (line.kind === "take") {
      flushList();
      takeItems.push(
        <li
          key={`take-item-${takeItems.length}`}
          className="relative pl-4 before:absolute before:left-0 before:top-[0.55em] before:content-['•'] before:text-primary"
        >
          {line.text}
        </li>
      );
      continue;
    }

    flushTake();

    if (line.kind === "bullet") {
      listItems.push(
        <li
          key={`${listKey}-${listItems.length}`}
          className={cn(
            "relative pl-4 before:absolute before:left-0 before:content-['•'] before:text-primary",
            line.indent >= 2 && "ml-4"
          )}
        >
          {line.text}
        </li>
      );
      continue;
    }

    flushList();
    nodes.push(
      <p key={`p-${listKey++}`} className="text-sm leading-relaxed text-foreground/90">
        {line.text}
      </p>
    );
  }

  flushTake();
  flushList();
  return nodes;
}

type DailySummaryContentProps = {
  summary: string;
};

export function DailySummaryContent({ summary }: DailySummaryContentProps) {
  return <div className="space-y-3">{parseBulletSummary(summary)}</div>;
}

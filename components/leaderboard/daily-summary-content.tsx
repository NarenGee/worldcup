import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function parseBulletSummary(summary: string): ReactNode[] {
  const lines = summary.split("\n");
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];
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

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^(\s*)[-•]\s+(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const text = bulletMatch[2].trim();
      const isOpenerLead = listItems.length === 0 && indent < 2;
      listItems.push(
        <li
          key={`${listKey}-${listItems.length}`}
          className={cn(
            "relative pl-4 before:absolute before:left-0 before:content-['•'] before:text-primary",
            indent >= 2 && "ml-4",
            isOpenerLead &&
              "border-l-2 border-primary/30 pl-3 text-foreground/90 before:content-none"
          )}
        >
          {isOpenerLead && (
            <span className="mb-1 block font-display text-[10px] font-black uppercase tracking-widest text-primary">
              The take
            </span>
          )}
          {text}
        </li>
      );
      continue;
    }

    flushList();
    nodes.push(
      <p
        key={`p-${listKey++}`}
        className="text-sm leading-relaxed text-foreground/90"
      >
        {line.trim()}
      </p>
    );
  }

  flushList();
  return nodes;
}

type DailySummaryContentProps = {
  summary: string;
};

export function DailySummaryContent({ summary }: DailySummaryContentProps) {
  return <div className="space-y-3">{parseBulletSummary(summary)}</div>;
}

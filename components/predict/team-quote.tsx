import { getTeamQuote } from "@/lib/team-quotes";
import { cn } from "@/lib/utils";

type TeamQuoteProps = {
  teamName: string;
  className?: string;
  compact?: boolean;
  align?: "left" | "center" | "right";
};

export function TeamQuote({
  teamName,
  className,
  compact = false,
  align = "left",
}: TeamQuoteProps) {
  const quote = getTeamQuote(teamName);
  if (!quote) return null;

  return (
    <blockquote
      className={cn(
        "instrument-quote",
        compact && "instrument-quote-compact",
        align === "center" && "mx-auto max-w-prose text-center",
        align === "right" &&
          "border-l-0 border-r-2 border-accent/35 pl-0 pr-3 text-right",
        className
      )}
    >
      {quote}
    </blockquote>
  );
}

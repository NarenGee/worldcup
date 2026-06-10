import { formatTeam } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { TeamQuote } from "./team-quote";

type TeamWithQuoteProps = {
  teamName: string;
  className?: string;
  nameClassName?: string;
  quoteClassName?: string;
};

export function TeamWithQuote({
  teamName,
  className,
  nameClassName,
  quoteClassName,
}: TeamWithQuoteProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p
        className={cn(
          "font-display text-sm font-black uppercase leading-snug tracking-wide sm:text-lg",
          nameClassName
        )}
      >
        {formatTeam(teamName)}
      </p>
      <TeamQuote teamName={teamName} className={quoteClassName} />
    </div>
  );
}

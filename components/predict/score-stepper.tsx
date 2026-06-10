"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScoreStepperProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label: string;
};

export function ScoreStepper({
  value,
  onChange,
  disabled,
  label,
}: ScoreStepperProps) {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-2">
      <span className="instrument-meta max-w-full truncate px-2 text-center sm:max-w-[5rem]">
        {label}
      </span>
      <div className="flex w-full max-w-xs items-center justify-center gap-2 sm:max-w-none">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 border-primary text-primary sm:size-9"
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="instrument-score w-14 text-center text-3xl text-primary sm:w-16 sm:text-4xl">
          {String(value).padStart(2, "0")}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 border-primary text-primary sm:size-9"
          disabled={disabled || value >= 9}
          onClick={() => onChange(Math.min(9, value + 1))}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

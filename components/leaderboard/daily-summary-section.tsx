"use client";

import { DailySummaryContent } from "@/components/leaderboard/daily-summary-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailySummaryBootstrap, DailySummaryResult } from "@/lib/daily-summary";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function sourceLabel(source: DailySummaryResult["source"]): string {
  return source === "cache" ? "Cached" : "Generated";
}

type DailySummarySectionProps = {
  bootstrap: DailySummaryBootstrap | null;
};

export function DailySummarySection({ bootstrap }: DailySummarySectionProps) {
  const [dates, setDates] = useState<string[]>(bootstrap?.dates ?? []);
  const [today, setToday] = useState<string | null>(bootstrap?.today ?? null);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    bootstrap?.recap.date ?? null
  );
  const [payload, setPayload] = useState<DailySummaryResult | null>(
    bootstrap?.recap ?? null
  );
  const [loading, setLoading] = useState(!bootstrap);
  const [error, setError] = useState<string | null>(null);

  const selectedIndex =
    selectedDate && dates.length > 0 ? dates.indexOf(selectedDate) : -1;
  const canGoPrev = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < dates.length - 1;

  const loadSummary = useCallback(async (date: string, showLoading: boolean) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/daily-summary?date=${date}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Could not load daily summary");
      }

      const data = (await response.json()) as DailySummaryResult;
      setPayload(data);
      setSelectedDate(date);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load daily summary"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootstrap) return;

    let cancelled = false;

    const fetchBootstrap = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/daily-summary?bootstrap=1", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Could not load daily summary");
        }

        const data = (await response.json()) as DailySummaryBootstrap;
        if (cancelled) return;

        setDates(data.dates);
        setToday(data.today);
        setSelectedDate(data.recap.date);
        setPayload(data.recap);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load daily summary"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchBootstrap();

    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  const goToDate = (date: string) => {
    if (date === selectedDate && payload) return;
    void loadSummary(date, !payload);
  };

  const goPrev = () => {
    if (!canGoPrev) return;
    goToDate(dates[selectedIndex - 1]);
  };

  const goNext = () => {
    if (!canGoNext) return;
    goToDate(dates[selectedIndex + 1]);
  };

  const showSkeleton = loading && !payload;

  return (
    <section className="instrument-panel">
      <div className="instrument-divider flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <span className="instrument-label">Daily recap</span>

        {dates.length > 0 && selectedDate && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={goPrev}
              disabled={!canGoPrev || loading}
              aria-label="Previous recap"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <label className="sr-only" htmlFor="recap-date-select">
              Select recap date
            </label>
            <select
              id="recap-date-select"
              value={selectedDate}
              onChange={(event) => goToDate(event.target.value)}
              disabled={loading && !payload}
              className="h-8 max-w-[11rem] truncate border border-border bg-background px-2 text-xs text-foreground sm:max-w-none sm:text-sm"
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date === today ? "Today · " : ""}
                  {date}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={goNext}
              disabled={!canGoNext || loading}
              aria-label="Next recap"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="px-3 py-4 sm:px-4">
        {showSkeleton && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading daily summary">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[88%]" />
            <Skeleton className="h-4 w-[70%]" />
          </div>
        )}

        {!showSkeleton && error && (
          <p className="instrument-meta text-sm">{error}</p>
        )}

        {!showSkeleton && payload && (
          <div
            className={cn(
              "space-y-3 transition-opacity",
              loading && "opacity-60"
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="instrument-heading text-sm">{payload.date_label}</p>
              <span className="instrument-meta text-xs normal-case">
                {payload.matches_count} result
                {payload.matches_count === 1 ? "" : "s"} confirmed ·{" "}
                {sourceLabel(payload.source)}
                {dates.length > 1 && selectedIndex >= 0 && (
                  <> · {selectedIndex + 1} of {dates.length}</>
                )}
              </span>
            </div>
            <DailySummaryContent summary={payload.summary} />
          </div>
        )}
      </div>
    </section>
  );
}

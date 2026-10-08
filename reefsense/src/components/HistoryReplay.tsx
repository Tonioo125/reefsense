import { useEffect } from "react";
import { Pause, Play, X } from "lucide-react";
import { BLEACH_GRADIENT, FEW_SURVEYS, eventForYear } from "@/lib/history";
import { formatPercent } from "@/lib/reef";
import { PALETTE, RESILIENCE } from "@/lib/palette";
import { cn } from "@/lib/utils";
import type { HistoryYear } from "@/types/reef";

interface HistoryReplayProps {
  years: HistoryYear[];
  year: number;
  onYearChange: (year: number) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onExit: () => void;
}

const STEP_MS = 1400;

/**
 * Replay controls over the map: play/pause, a clickable timeline of the share of surveys that found
 * bleaching each year (mass bleaching events marked), and the colour key for the survey dots.
 */
export default function HistoryReplay({ years, year, onYearChange, playing, onPlayingChange, onExit }: HistoryReplayProps) {
  const index = years.findIndex((y) => y.year === year);
  const current = years[index];
  const event = eventForYear(year);
  const maxShare = Math.max(...years.map((y) => y.bleachedShare), 0.01);

  // Advance one year per step; stop at the end.
  useEffect(() => {
    if (!playing) return;
    if (index >= years.length - 1) {
      onPlayingChange(false);
      return;
    }
    const timer = setTimeout(() => onYearChange(years[index + 1].year), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, index, years, onYearChange, onPlayingChange]);

  const togglePlay = () => {
    if (!playing && index >= years.length - 1) onYearChange(years[0].year); // replay from the start
    onPlayingChange(!playing);
  };

  return (
    <div className="absolute inset-x-3 bottom-6 z-[1000] mx-auto max-w-3xl rounded-lg border border-border bg-card/95 p-3 shadow-float sm:inset-x-4 sm:p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-2xl font-medium tabular-nums leading-none text-foreground">{year}</span>
            {event && <span className="text-xs font-semibold" style={{ color: RESILIENCE.Low.text }}>{event.name}</span>}
          </p>
          {current && (
            <p className="mt-1 text-xs text-muted-strong">
              <span className="font-medium tabular-nums text-foreground">{formatPercent(current.bleachedShare)}</span> of{" "}
              {current.surveys.toLocaleString()} surveys found 10% or more of corals bleached
              {event && <span className="hidden sm:inline"> · {event.note}</span>}
              {current.surveys < FEW_SURVEYS && " · few surveys this year"}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onExit}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Back to today</span>
          <span className="sm:hidden">Today</span>
        </button>
      </div>

      {/* Timeline: bar height = share of surveys that found bleaching; click a year to jump to it. */}
      <div role="group" aria-label="Choose a year" className="mt-3 flex h-14 items-end gap-[2px]">
        {years.map((y) => {
          const selected = y.year === year;
          const inEvent = eventForYear(y.year) != null;
          return (
            <button
              key={y.year}
              type="button"
              onClick={() => {
                onPlayingChange(false);
                onYearChange(y.year);
              }}
              aria-pressed={selected}
              aria-label={`${y.year}: ${formatPercent(y.bleachedShare)} of ${y.surveys} surveys found bleaching`}
              title={`${y.year}: ${formatPercent(y.bleachedShare)} of ${y.surveys.toLocaleString()} surveys found bleaching`}
              className="group relative flex h-full min-w-0 flex-1 items-end rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn("block w-full rounded-t-[3px] transition-opacity", !selected && "opacity-60 group-hover:opacity-90")}
                style={{
                  height: `${Math.max((y.bleachedShare / maxShare) * 100, 4)}%`,
                  background: selected ? PALETTE.ink : inEvent ? RESILIENCE.Low.base : PALETTE.current,
                  opacity: y.surveys < FEW_SURVEYS && !selected ? 0.3 : undefined,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-strong" aria-hidden="true">
        <span>{years[0]?.year}</span>
        <span>{years[years.length - 1]?.year}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-strong">
        <span className="flex items-center gap-1.5">
          Survey dots, % of corals bleached
          <span className="inline-flex items-center gap-1 tabular-nums">
            0
            <span aria-hidden="true" className="inline-block h-2 w-16 rounded-full" style={{ background: BLEACH_GRADIENT }} />
            75%+
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm" style={{ background: RESILIENCE.Low.base }} />
          Mass bleaching event
        </span>
      </div>
    </div>
  );
}

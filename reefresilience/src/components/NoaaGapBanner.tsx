import { BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoaaGapSummary } from "@/types/reef";

interface NoaaGapBannerProps {
  summary: NoaaGapSummary;
  active: boolean;
  onToggle: () => void;
}

/** Floating summary of reefs the model flags although NOAA's alerts stayed below Alert Level 1. */
export default function NoaaGapBanner({ summary, active, onToggle }: NoaaGapBannerProps) {
  if (summary.count === 0) return null;
  return (
    <div
      className={cn(
        "absolute left-3 top-14 z-[1000] flex max-w-[calc(100%-1.5rem)] items-center gap-2.5 rounded-lg border px-3 py-2 shadow-float backdrop-blur-md sm:left-14 sm:top-3 sm:max-w-[23rem]",
        active ? "border-coral/50 bg-coral-soft/95" : "border-border bg-card/90",
      )}
    >
      <BellOff className="h-4 w-4 shrink-0 text-coral" strokeWidth={1.75} aria-hidden="true" />
      <p
        className="text-xs leading-snug text-foreground"
        title={`${summary.definition} For ${summary.nonHeatTopDriverCount} of these reefs the model's largest driver is a site attribute rather than recent heat.`}
      >
        <span className="font-semibold tabular-nums">{summary.count.toLocaleString()}</span> reefs at
        elevated predicted bleaching risk where NOAA&apos;s alerts stayed below Alert Level 1 for 12
        weeks
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className="shrink-0 rounded-md bg-primary-strong px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary-strong/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {active ? "Show all" : "Highlight"}
      </button>
    </div>
  );
}

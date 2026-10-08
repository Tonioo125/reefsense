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
        "flex max-w-full items-center gap-2 rounded-xl border py-1 pl-2.5 pr-1 shadow-float",
        active ? "border-coral/50 bg-coral-soft/95" : "border-border bg-card/95",
      )}
    >
      <BellOff className="h-3.5 w-3.5 shrink-0 text-coral" strokeWidth={2} aria-hidden="true" />
      <p
        className="whitespace-nowrap text-xs leading-snug text-foreground"
        title={`${summary.definition} For ${summary.nonHeatTopDriverCount} of these reefs the model's largest driver is a site attribute rather than recent heat.`}
      >
        <span className="font-semibold tabular-nums">{summary.count.toLocaleString()}</span> at-risk reefs
        with no NOAA heat alert
        <span className="sr-only">
          : elevated predicted bleaching risk where NOAA&apos;s alerts stayed below Alert Level 1 for 12 weeks
        </span>
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

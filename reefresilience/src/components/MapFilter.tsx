import { CATEGORY_COLORS } from "@/lib/reef";
import { cn } from "@/lib/utils";
import type { ReefFilter } from "@/types/reef";

interface MapFilterProps {
  value: ReefFilter;
  onChange: (value: ReefFilter) => void;
  counts: Record<ReefFilter, number>;
}

const OPTIONS: ReefFilter[] = ["All", "High", "Medium", "Low"];

const fullLabel = (f: ReefFilter) => (f === "All" ? "All" : `${f} resilience`);

/** Segmented control to filter visible markers by predicted resilience category. */
export default function MapFilter({ value, onChange, counts }: MapFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter reefs by predicted resilience"
      className="absolute right-3 top-3 z-[1000] flex items-center gap-0.5 rounded-lg border border-border bg-background/90 p-1 shadow-float backdrop-blur-md sm:right-4 sm:top-4"
    >
      {OPTIONS.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={active}
            aria-label={`${fullLabel(o)} (${counts[o]} reefs)`}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2.5",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {o !== "All" && (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: CATEGORY_COLORS[o].base }}
              />
            )}
            <span aria-hidden="true">
              {o}
              {o !== "All" && <span className="hidden sm:inline"> resilience</span>}
            </span>
            <span
              aria-hidden="true"
              className={cn("tabular-nums", active ? "opacity-70" : "opacity-60")}
            >
              {counts[o]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

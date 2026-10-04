import { cn } from "@/lib/utils";
import type { ReefFilter } from "@/types/reef";

interface MapFilterProps {
  value: ReefFilter;
  onChange: (value: ReefFilter) => void;
  counts: Record<ReefFilter, number>;
}

const OPTIONS: { value: ReefFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

/** Segmented control to filter visible markers by resilience category. */
export default function MapFilter({ value, onChange, counts }: MapFilterProps) {
  return (
    <div className="absolute right-4 top-4 z-[1000] flex items-center gap-0.5 rounded-lg border border-border bg-background/85 p-1 shadow-float backdrop-blur-md">
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {o.label}
            <span className={cn("ml-1.5 tabular-nums", active ? "opacity-70" : "opacity-50")}>
              {counts[o.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

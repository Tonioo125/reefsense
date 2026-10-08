import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  CORAL_COVER_GRADIENT,
  CORAL_COVER_MAX,
  CORAL_COVER_NO_DATA,
  REEF_AREA_COLOR,
  categoryRangeLabel,
} from "@/lib/reef";
import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { MapColorBy } from "@/types/reef";

interface MapLegendProps {
  colorBy: MapColorBy;
  onColorByChange: (value: MapColorBy) => void;
  showReefArea: boolean;
  onShowReefAreaChange: (value: boolean) => void;
}

const LAYERS: { value: MapColorBy; label: string }[] = [
  { value: "resilience", label: "Resilience" },
  { value: "coral", label: "Coral cover" },
];

/** Floating legend that also switches what the markers are coloured by. */
export default function MapLegend({
  colorBy,
  onColorByChange,
  showReefArea,
  onShowReefAreaChange,
}: MapLegendProps) {
  // Open by default only on large screens; elsewhere a small pill until asked for, so it never covers the toolbar.
  const roomy = useMediaQuery("(min-width: 1024px) and (min-height: 820px)");
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = open ?? roomy;

  return (
    <div
      className={cn(
        "absolute bottom-6 left-3 z-[1000] rounded-xl border border-border bg-card/95 shadow-float sm:left-4",
        expanded ? "w-[13.5rem] p-2.5" : "p-1",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        aria-controls="map-legend-body"
        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-strong transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          Legend
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-300", expanded && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {expanded && (
      <div id="map-legend-body" className="mt-2 px-0.5 animate-fade-in">
      <div
        role="group"
        aria-label="Colour reefs by"
        className="mb-3 grid grid-cols-2 gap-0.5 rounded-lg bg-background/60 p-0.5"
      >
        {LAYERS.map((layer) => (
          <button
            key={layer.value}
            type="button"
            onClick={() => onColorByChange(layer.value)}
            aria-pressed={colorBy === layer.value}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              colorBy === layer.value
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-strong hover:text-foreground",
            )}
          >
            {layer.label}
          </button>
        ))}
      </div>

      {colorBy === "resilience" ? (
        <>
          <p className="mb-2 text-xs font-semibold leading-snug text-foreground">
            Predicted probability of high resilience
          </p>
          <ul className="space-y-1.5">
            {CATEGORY_ORDER.map((cat) => (
              <li key={cat} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-foreground/20"
                  style={{ background: CATEGORY_COLORS[cat].base }}
                />
                <span className="text-foreground">{cat}</span>
                <span className="ml-auto pl-3 tabular-nums text-muted-strong">
                  {categoryRangeLabel(cat)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted-strong">Model-based estimate</p>
        </>
      ) : (
        <>
          <p className="mb-2 text-[11px] font-medium uppercase leading-snug tracking-wide text-muted-strong">
            Hard coral cover
          </p>
          <div aria-hidden="true" className="h-2.5 w-full rounded-full" style={{ background: CORAL_COVER_GRADIENT }} />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-strong">
            <span>0%</span>
            <span>{CORAL_COVER_MAX / 2}%</span>
            <span>{CORAL_COVER_MAX}%+</span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-foreground">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CORAL_COVER_NO_DATA }}
            />
            No survey within 10 km
          </p>
          <p className="mt-2 text-[10px] leading-snug text-muted-strong">
            Latest survey per reef (Global Coral-Bleaching Database); survey years vary.
          </p>
        </>
      )}
      <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-border pt-3 text-xs text-foreground">
        <input
          type="checkbox"
          checked={showReefArea}
          onChange={(e) => onShowReefAreaChange(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
        />
        <span className="flex-1">
          <span className="flex items-center gap-2">
            Reef area
            <span
              aria-hidden="true"
              className="h-2.5 w-4 rounded-sm border border-primary-strong"
              style={{ background: REEF_AREA_COLOR }}
            />
          </span>
          <span className="mt-0.5 block text-[10px] leading-snug text-muted-strong">
            Mapped coral reef extent across Asia. UNEP-WCMC v4.1 (2021).
          </span>
        </span>
      </label>
      </div>
      )}
    </div>
  );
}

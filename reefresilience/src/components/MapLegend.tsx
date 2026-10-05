import { CATEGORY_COLORS, CATEGORY_ORDER, categoryRangeLabel } from "@/lib/reef";

/** Floating legend mapping marker colour to predicted-resilience band. */
export default function MapLegend() {
  return (
    <div className="absolute bottom-6 left-3 z-[1000] rounded-lg border border-border bg-background/90 p-3 shadow-float backdrop-blur-md sm:left-4">
      <p className="mb-2 max-w-[11rem] text-[11px] font-medium uppercase leading-snug tracking-wide text-muted-foreground">
        Predicted probability of high resilience
      </p>
      <ul className="space-y-1.5">
        {CATEGORY_ORDER.map((cat) => (
          <li key={cat} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CATEGORY_COLORS[cat].base }}
            />
            <span className="text-foreground">{cat}</span>
            <span className="ml-auto pl-3 tabular-nums text-muted-foreground">
              {categoryRangeLabel(cat)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground">Model-based estimate</p>
    </div>
  );
}

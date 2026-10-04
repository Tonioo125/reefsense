import { CATEGORY_COLORS, CATEGORY_ORDER } from "@/lib/reef";

const RANGES: Record<string, string> = {
  High: "≥ 66%",
  Medium: "40–65%",
  Low: "< 40%",
};

/** Floating legend mapping marker colour to predicted-resilience band. */
export default function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-border bg-background/85 p-3 shadow-float backdrop-blur-md">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Predicted resilience
      </p>
      <ul className="space-y-1.5">
        {CATEGORY_ORDER.map((cat) => (
          <li key={cat} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CATEGORY_COLORS[cat].base }}
            />
            <span className="text-foreground">{cat}</span>
            <span className="ml-auto pl-3 tabular-nums text-muted-foreground">{RANGES[cat]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

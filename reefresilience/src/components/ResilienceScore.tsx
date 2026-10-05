import { CATEGORY_COLORS, formatPercent, resilienceLabel } from "@/lib/reef";
import type { ResilienceCategory } from "@/types/reef";

interface ResilienceScoreProps {
  probability: number;
  category: ResilienceCategory;
}

/**
 * The headline prediction. Deliberately framed as a probability, not a "score",
 * and paired with a disclaimer: the model estimates a likelihood of resilience,
 * it offers no certainty.
 */
export default function ResilienceScore({ probability, category }: ResilienceScoreProps) {
  const c = CATEGORY_COLORS[category];
  const pct = formatPercent(probability);
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Climate Resilience
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-6xl font-medium leading-none tracking-tight text-foreground">
          {pct}
        </span>
      </div>
      <p className="mt-2.5 max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
        Predicted probability of high climate resilience
      </p>

      <span
        className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
        style={{ background: c.soft, color: c.text }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.base }} />
        {resilienceLabel(category)}
      </span>

      <div
        role="img"
        aria-label={`${pct} predicted probability`}
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: pct, background: c.base }}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Model prediction based on environmental and ecological predictors. It is the estimated
        chance the reef avoids bleaching of 10% or more of its colonies under recent satellite
        heat stress.
      </p>
    </div>
  );
}

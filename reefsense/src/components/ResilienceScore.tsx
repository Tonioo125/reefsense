import { useCountUp } from "@/hooks/useCountUp";
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
  // The panel remounts per reef, so this counts up from 0 on every selection.
  const shown = useCountUp(probability);
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">Climate Resilience</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-6xl font-medium leading-none tracking-tight tabular-nums text-foreground">
          <span aria-hidden="true">{formatPercent(shown)}</span>
          <span className="sr-only">{pct}</span>
        </span>
      </div>
      <p className="mt-2.5 max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
        Predicted probability of high climate resilience
      </p>

      <span
        className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
        style={{ background: c.soft, color: c.text }}
      >
        <span className="h-1.5 w-1.5 rounded-full ring-1 ring-foreground/15" style={{ background: c.base }} />
        {resilienceLabel(category)}
      </span>

      <div
        role="img"
        aria-label={`${pct} predicted probability`}
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full w-full origin-left rounded-full"
          style={{ transform: `scaleX(${shown})`, background: c.base }}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-strong">
        Model prediction based on environmental and ecological predictors. It is the estimated
        chance the reef avoids bleaching of 10% or more of its colonies under recent satellite
        heat stress.
      </p>
    </div>
  );
}

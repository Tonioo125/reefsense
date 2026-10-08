 import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { canAnimate, EASE_OUT } from "@/lib/motion";
import { CATEGORY_COLORS, explanationHeading, formatSigned } from "@/lib/reef";
import type { FeatureContribution, ResilienceCategory } from "@/types/reef";

interface FeatureContributionsProps {
  contributions: FeatureContribution[];
  category: ResilienceCategory;
}

const POSITIVE = CATEGORY_COLORS.High.base;
const NEGATIVE = CATEGORY_COLORS.Low.base;
const POSITIVE_TEXT = CATEGORY_COLORS.High.text;
const NEGATIVE_TEXT = CATEGORY_COLORS.Low.text;

/**
 * SHAP-style explanation: a diverging horizontal bar per predictor. Bars grow
 * right (favourable) or left (unfavourable) from a shared zero axis, scaled to
 * the largest absolute contribution for this reef.
 */
export default function FeatureContributions({
  contributions,
  category,
}: FeatureContributionsProps) {
  const sorted = [...contributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );
  const maxAbs = Math.max(...sorted.map((c) => Math.abs(c.contribution)), 0.01);

  // Bars start collapsed on the zero axis and grow out after the first paint.
  // The component remounts per reef, so they grow again on every selection.
  const reduce = usePrefersReducedMotion();
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!canAnimate()) {
      setGrown(true);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setGrown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  const show = grown || reduce;

  return (
    <section>
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">
        Model explanation
      </p>
      <h3 className="mt-1 text-[15px] font-semibold text-foreground">
        {explanationHeading(category)}
      </h3>

      <ul className="mt-4 space-y-3">
        {sorted.map((c, i) => {
          const positive = c.contribution >= 0;
          const width = `${(Math.abs(c.contribution) / maxAbs) * 50}%`;
          const Trend = positive ? TrendingUp : TrendingDown;
          return (
            <li
              key={c.feature}
              className="space-y-1.5"
              aria-label={`${c.feature}: ${positive ? "raises" : "lowers"} predicted resilience by ${Math.abs(c.contribution).toFixed(2)}`}
            >
              <div className="flex items-center justify-between text-sm" aria-hidden="true">
                <span className="text-foreground">{c.feature}</span>
                <span
                  className="flex items-center gap-1 text-xs font-medium tabular-nums"
                  style={{ color: positive ? POSITIVE_TEXT : NEGATIVE_TEXT }}
                >
                  <Trend className="h-3.5 w-3.5" strokeWidth={2} />
                  {formatSigned(c.contribution)}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className="absolute left-1/2 top-0 h-full w-px bg-border" />
                <span
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    ...(positive
                      ? { left: "50%", width, background: POSITIVE }
                      : { right: "50%", width, background: NEGATIVE }),
                    transform: show ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: positive ? "left" : "right",
                    transition: `transform 700ms ${EASE_OUT}`,
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-strong">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: POSITIVE }} />
          Raises predicted resilience
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: NEGATIVE }} />
          Lowers it
        </span>
        <span className="ml-auto">log-odds</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-strong">
        Contributions are model-based estimates (SHAP-style) relative to the dataset average.
      </p>
    </section>
  );
}

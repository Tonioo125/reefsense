import { CATEGORY_COLORS, formatSigned, resiliencePhrase } from "@/lib/reef";
import type { FeatureContribution, ResilienceCategory } from "@/types/reef";

interface FeatureContributionsProps {
  contributions: FeatureContribution[];
  category: ResilienceCategory;
}

const POSITIVE = CATEGORY_COLORS.High.base;
const NEGATIVE = CATEGORY_COLORS.Low.base;

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

  return (
    <section>
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">
        Model explanation
      </p>
      <h3 className="mt-1 text-[15px] font-semibold text-foreground">
        Why does the model predict {resiliencePhrase(category)}?
      </h3>

      <ul className="mt-4 space-y-3">
        {sorted.map((c) => {
          const positive = c.contribution >= 0;
          const width = `${(Math.abs(c.contribution) / maxAbs) * 50}%`;
          return (
            <li key={c.feature} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{c.feature}</span>
                <span
                  className="tabular-nums text-xs font-medium"
                  style={{ color: positive ? POSITIVE : NEGATIVE }}
                >
                  {formatSigned(c.contribution)}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <span className="absolute left-1/2 top-0 h-full w-px bg-border" />
                <span
                  className="absolute top-0 h-full rounded-full"
                  style={
                    positive
                      ? { left: "50%", width, background: POSITIVE }
                      : { right: "50%", width, background: NEGATIVE }
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
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
    </section>
  );
}

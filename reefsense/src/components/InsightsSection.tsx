import { memo, useMemo, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  categoryRangeLabel,
  formatPercent,
  heatBandShares,
  type HeatBandShare,
} from "@/lib/reef";
import Reveal from "@/components/Reveal";
import { useInView } from "@/hooks/useInView";
import type { ModelMetrics, Reef, ResilienceCategory } from "@/types/reef";

interface InsightsSectionProps {
  reefs: Reef[];
  metrics: ModelMetrics | null;
}

const BAND_NAMES: Record<ResilienceCategory, string> = { High: "High", Medium: "Moderate", Low: "Low" };
/** Stacked bottom-up: the low-resilience share sits on the baseline so it compares across bins. */
const STACK: ResilienceCategory[] = ["Low", "Medium", "High"];
const NOAA_ALERT1_DHW = 4;

function Swatch({ category }: { category: ResilienceCategory }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{ background: CATEGORY_COLORS[category].base }}
    />
  );
}

/** Horizontal bars, every value labelled directly (no axis needed). */
function CategoryBars({ data, total }: { data: { category: ResilienceCategory; count: number }[]; total: number }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  // Bars grow in once scrolled into view (instantly under reduced motion).
  const [ref, inView] = useInView<HTMLUListElement>({ threshold: 0.25 });
  return (
    <ul ref={ref} className="mt-6 flex flex-1 flex-col justify-center gap-7">
      {data.map((d) => (
        <li key={d.category}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Swatch category={d.category} />
              {BAND_NAMES[d.category]}
              <span className="font-normal text-muted-strong">{categoryRangeLabel(d.category)}</span>
            </span>
            <span className="tabular-nums text-muted-strong">
              <span className="font-semibold text-foreground">{d.count.toLocaleString()}</span>
              {total > 0 && ` · ${formatPercent(d.count / total)}`}
            </span>
          </div>
          <div className="mt-2 h-3.5 rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: inView ? `${(d.count / max) * 100}%` : "0%", background: CATEGORY_COLORS[d.category].base }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * 100% stacked columns: for each heat-stress bin, the share of reefs in each predicted band. Plain
 * HTML (seven columns), with a dashed marker where NOAA's Alert Level 1 begins and a hover tooltip.
 */
function HeatBandChart({ data }: { data: HeatBandShare[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.25 });
  const alertIndex = data.findIndex((d) => d.min >= NOAA_ALERT1_DHW);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-strong" aria-hidden="true">
        {CATEGORY_ORDER.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <Swatch category={c} />
            {BAND_NAMES[c]}
          </span>
        ))}
      </div>

      <div className="mt-4 flex gap-2" aria-hidden="true">
        {/* y axis */}
        <div className="flex h-52 w-8 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-muted-strong">
          <span className="-translate-y-1/2">100%</span>
          <span>50%</span>
          <span className="translate-y-1/2">0%</span>
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            ref={ref}
            className={`relative flex h-52 origin-bottom items-stretch gap-1.5 transition-transform duration-700 ease-out motion-reduce:transition-none sm:gap-2.5 ${
              inView ? "scale-y-100" : "scale-y-0"
            }`}
          >
            {/* recessive gridlines */}
            {[0, 50, 100].map((y) => (
              <span key={y} className="absolute inset-x-0 border-t border-border" style={{ bottom: `${y}%` }} />
            ))}
            {data.map((d, i) => (
              <div
                key={d.label}
                className="relative flex flex-1 cursor-default flex-col-reverse gap-[2px]"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                style={{ opacity: active === null || active === i ? 1 : 0.55 }}
              >
                {d.count > 0 &&
                  STACK.map((c, j) => {
                    const share = d.shares[c];
                    if (share <= 0) return null;
                    const top = STACK.slice(j + 1).every((k) => d.shares[k] <= 0);
                    return (
                      <div
                        key={c}
                        className={top ? "rounded-t" : undefined}
                        style={{ height: `calc(${share * 100}% - 2px)`, background: CATEGORY_COLORS[c].base }}
                      />
                    );
                  })}
                {i === alertIndex && (
                  <span className="pointer-events-none absolute -left-[4px] -top-3 bottom-0 border-l border-dashed border-muted-foreground sm:-left-[6px]" />
                )}
                {active === i && d.count > 0 && (
                  <div
                    className={`pointer-events-none absolute bottom-full z-10 mb-2 w-40 rounded-lg ${
                      i === 0 ? "left-0" : i === data.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"
                    } border border-border bg-card px-3 py-2 text-xs text-foreground shadow-float`}
                  >
                    <p className="font-semibold tabular-nums">
                      {d.label} DHW · {d.count.toLocaleString()} reefs
                    </p>
                    {CATEGORY_ORDER.map((c) => (
                      <p key={c} className="mt-0.5 flex items-center justify-between gap-2 tabular-nums">
                        <span className="flex items-center gap-1.5 text-muted-strong">
                          <Swatch category={c} />
                          {BAND_NAMES[c]}
                        </span>
                        {formatPercent(d.shares[c])}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* x axis: bin label and reef count */}
          <div className="mt-2 flex gap-1.5 sm:gap-2.5">
            {data.map((d) => (
              <div key={d.label} className="flex-1 text-center leading-tight">
                <p className="text-[11px] font-medium tabular-nums text-foreground">{d.label}</p>
                <p className="text-[10px] tabular-nums text-muted-strong">n={d.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
          {alertIndex > 0 && (
            <p className="mt-1 text-[10px] text-muted-strong">
              Dashed line: NOAA Alert Level 1 begins at {NOAA_ALERT1_DHW} DHW
            </p>
          )}
        </div>
      </div>

      {/* The same numbers for screen readers. */}
      <table className="sr-only">
        <caption>Share of reefs in each predicted resilience band, by peak Degree Heating Weeks</caption>
        <thead>
          <tr>
            <th scope="col">Peak DHW</th>
            <th scope="col">Reefs</th>
            {CATEGORY_ORDER.map((c) => (
              <th key={c} scope="col">
                {BAND_NAMES[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.count}</td>
              {CATEGORY_ORDER.map((c) => (
                <td key={c}>{formatPercent(d.shares[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const mean = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

/** Memoised: the Explore page re-renders on every reef selection, and these inputs rarely change. */
export default memo(function InsightsSection({ reefs, metrics }: InsightsSectionProps) {
  const { countData, heatData, stats } = useMemo(() => {
    const counts = CATEGORY_ORDER.map((category) => ({
      category,
      count: reefs.filter((r) => r.category === category).length,
    }));
    const high = reefs.filter((r) => r.category === "High").length;
    const has = reefs.length > 0;
    const auc = metrics?.model.roc_auc;
    const baseAuc = metrics?.baseline_dhw?.roc_auc;
    return {
      countData: counts,
      heatData: heatBandShares(reefs),
      stats: [
        { value: has ? reefs.length.toLocaleString() : "—", label: "Reef sites analysed" },
        {
          value: has ? formatPercent(high / reefs.length) : "—",
          label: "High predicted resilience",
        },
        {
          value: has ? formatPercent(mean(reefs.map((r) => r.resilienceProbability))) : "—",
          label: "Mean predicted probability",
        },
        {
          value: auc != null ? auc.toFixed(2) : "—",
          label:
            baseAuc != null
              ? `Model ROC AUC (vs ${baseAuc.toFixed(2)} for heat stress alone)`
              : "Model ROC AUC",
        },
        { value: metrics ? String(metrics.features.length) : "—", label: "Model predictors" },
      ],
    };
  }, [reefs, metrics]);

  return (
    <section id="insights" className="scroll-mt-16 border-t border-border bg-secondary">
      <div className="mx-auto max-w-[1240px] px-6 py-20">
        <div className="max-w-2xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">Insights</p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Patterns across the global dataset
            </h2>
          </Reveal>
          <Reveal as="p" delay={100} className="mt-4 text-base leading-relaxed text-muted-foreground">
            Model-based estimates for every mapped reef under its most recent 12 weeks of
            satellite heat stress. The model is validated on surveys from ecoregions it never saw
            during training, and compared against heat stress alone.
          </Reveal>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-y-6 border-y border-border py-6 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-border">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="flex flex-col-reverse lg:px-6 lg:first:pl-0">
              <dt className="mt-1 text-sm text-muted-foreground">{s.label}</dt>
              <dd className="font-display text-3xl font-medium tabular-nums text-foreground">
                {s.value}
              </dd>
            </Reveal>
          ))}
        </dl>

        <div className="mt-8 grid grid-cols-1 rounded-lg border border-border bg-card lg:grid-cols-[2fr_3fr] lg:divide-x lg:divide-border">
          <Reveal as="figure" className="flex flex-col p-6">
            <figcaption>
              <h3 className="text-sm font-semibold text-foreground">Reefs by predicted resilience</h3>
              <p className="mt-1 text-xs text-muted-strong">
                {reefs.length.toLocaleString()} reefs, by probability of avoiding significant bleaching
              </p>
            </figcaption>
            <CategoryBars data={countData} total={reefs.length} />
          </Reveal>

          <Reveal as="figure" delay={120} className="border-t border-border p-6 lg:border-t-0">
            <figcaption>
              <h3 className="text-sm font-semibold text-foreground">Predicted resilience by recent heat stress</h3>
              <p className="mt-1 text-xs text-muted-strong">
                Share of reefs in each band, by peak heat stress over the past 12 weeks (Degree Heating Weeks)
              </p>
            </figcaption>
            <HeatBandChart data={heatData} />
          </Reveal>
        </div>

        <Reveal as="p" variant="fade-in" className="mt-4 text-xs text-muted-strong">
          Heat stress: NOAA Coral Reef Watch. Patterns are model-based estimates, not observed
          outcomes.
        </Reveal>
      </div>
    </section>
  );
});

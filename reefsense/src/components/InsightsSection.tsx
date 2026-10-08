import { memo, useId, useMemo, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  categoryRangeLabel,
  formatPercent,
  heatBandShares,
  type HeatBandShare,
} from "@/lib/reef";
import FishShoal from "@/components/FishShoal";
import Reveal from "@/components/Reveal";
import Term from "@/components/Term";
import { DolphinPass, LiveLayer } from "@/components/SeaLife";
import { useInView } from "@/hooks/useInView";
import type { ModelMetrics, Reef, ResilienceCategory } from "@/types/reef";

interface InsightsSectionProps {
  reefs: Reef[];
  metrics: ModelMetrics | null;
}

const BAND_NAMES: Record<ResilienceCategory, string> = { High: "High", Medium: "Medium", Low: "Low" };
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
      {/* sr-only on the wrapper: a table ignores the 1px width and would widen the page. */}
      <div className="sr-only">
      <table>
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
    </div>
  );
}

/** What the illustration shows at each heat level, in plain words. */
function reefStatus(dhw: number): string {
  if (dhw < 2.5) return "The reef is healthy and the fish are at home.";
  if (dhw < 4) return "The branching corals are starting to pale.";
  if (dhw < 8) return "NOAA Alert Level 1: bleaching is likely. Fish leave the white corals.";
  return "NOAA Alert Level 2: severe bleaching. Almost nowhere is left for the fish.";
}

/** A slider that heats the illustrated reef: corals bleach one by one and their fish move on. */
function ReefHeatControl({ heat, onChange }: { heat: number; onChange: (dhw: number) => void }) {
  const id = useId();
  return (
    <div
      data-no-bubbles=""
      className="relative mt-8 max-w-md rounded-2xl border border-border bg-card/90 p-4 shadow-soft"
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          What if the water gets hotter?
        </label>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {heat.toFixed(1)} <Term term="dhw">DHW</Term>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={12}
        step={0.5}
        value={heat}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${heat.toFixed(1)} degree heating weeks. ${reefStatus(heat)}`}
        className="mt-3 w-full accent-[#E8603F]"
      />
      {/* NOAA's alert thresholds on the same scale as the slider. */}
      <div aria-hidden="true" className="relative mt-1 h-4 text-[10px] text-muted-strong">
        <span className="absolute -translate-x-1/2" style={{ left: `${(4 / 12) * 100}%` }}>Alert 1</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${(8 / 12) * 100}%` }}>Alert 2</span>
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <p aria-live="polite" className="text-xs leading-relaxed text-muted-foreground">
          {reefStatus(heat)}
        </p>
        {heat > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-brand hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cool it down
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-strong">
        An illustration of how bleaching spreads as heat builds, not a prediction for a real reef.
      </p>
    </div>
  );
}

/** Memoised: the Explore page re-renders on every reef selection, and these inputs rarely change. */
export default memo(function InsightsSection({ reefs, metrics }: InsightsSectionProps) {
  const [heat, setHeat] = useState(0);
  const { countData, heatData, skill, facts, tests } = useMemo(() => {
    const counts = CATEGORY_ORDER.map((category) => ({
      category,
      count: reefs.filter((r) => r.category === category).length,
    }));
    const high = reefs.filter((r) => r.category === "High").length;
    const has = reefs.length > 0;
    const auc = metrics?.model.roc_auc ?? null;
    const baseAuc = metrics?.baseline_dhw?.roc_auc ?? null;
    return {
      countData: counts,
      heatData: heatBandShares(reefs),
      skill: { auc, baseAuc },
      tests: metrics?.stressTests ?? [],
      facts: [
        { value: has ? reefs.length.toLocaleString() : "—", label: "reefs mapped" },
        { value: has ? formatPercent(high / reefs.length) : "—", label: "with high predicted resilience" },
        { value: metrics ? String(metrics.features.length) : "—", label: "conditions weighed per reef" },
        { value: metrics ? metrics.n_rows.toLocaleString() : "—", label: "dive surveys it learned from" },
      ],
    };
  }, [reefs, metrics]);

  return (
    <section id="insights" className="scroll-mt-24">
      <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-28 sm:px-8 sm:pt-36">
        {/* A full-width reef behind the heading: its fish swim behind the text and still notice the cursor. */}
        <div className="relative pb-48 sm:pb-56 lg:pb-64">
          <FishShoal heat={heat} className="absolute -top-28 bottom-0 left-1/2 w-screen -translate-x-1/2 sm:-top-36" />
          <div className="relative max-w-3xl">
          <Reveal variant="mask">
            <h2 className="text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
              Patterns across the{" "}
              <span className="font-display font-normal italic tracking-[-0.02em] text-brand">every mapped reef</span>
            </h2>
          </Reveal>
          <Reveal as="p" delay={150} className="mt-6 max-w-2xl text-base leading-relaxed text-muted-strong sm:text-lg">
            Every mapped reef, scored against its latest 12 weeks of ocean heat measured by
            satellite. Before trusting it, we tested the model on parts of the ocean it had never
            seen.
          </Reveal>
          <ReefHeatControl heat={heat} onChange={setHeat} />
        </div>
        </div>

        {/* The model's skill as one sentence anyone can read; the numbers carry the emphasis. */}
        <Reveal className="mt-14 border-y border-border py-10">
          {skill.auc != null ? (
            <p className="max-w-4xl text-balance text-2xl font-medium leading-snug tracking-[-0.015em] text-foreground sm:text-3xl">
              Shown two reef surveys where only one found bleaching, the model picks the bleached one{" "}
              <span className="font-display text-[1.15em] italic text-brand">
                {formatPercent(skill.auc)} of the time
              </span>
              {skill.baseAuc != null && (
                <>
                  . Ocean heat alone gets{" "}
                  <span className="font-display text-[1.15em] italic text-coral-text">
                    {formatPercent(skill.baseAuc)}
                  </span>
                </>
              )}
              .
            </p>
          ) : (
            <p className="text-2xl font-medium text-muted-strong">Model skill is loading…</p>
          )}
          <p className="mt-3 text-sm text-muted-strong">
            50% would be a coin toss. Tested on reefs in regions the model never saw while learning.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-row-reverse items-baseline justify-end gap-2">
                <dt className="text-sm text-muted-strong">{f.label}</dt>
                <dd className="font-display text-2xl font-medium tabular-nums text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>

          {tests.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-semibold text-foreground">
                Tested {tests.length} more ways, each on data it never saw
              </h3>
              <table className="mt-3 w-full max-w-3xl text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-strong">
                    <th scope="col" className="py-2 pr-4 font-medium">Test</th>
                    <th scope="col" className="hidden py-2 pr-4 text-right font-medium sm:table-cell">Surveys</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Model</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Heat alone</th>
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">Result</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tests.map((t) => {
                    const better = t.modelAuc - t.heatAuc >= 0.01;
                    return (
                      <tr key={t.label}>
                        <th scope="row" className="py-2.5 pr-4 font-normal text-foreground">{t.label}</th>
                        <td className="hidden py-2.5 pr-4 text-right tabular-nums text-muted-strong sm:table-cell">
                          {t.surveys.toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-foreground">
                          {formatPercent(t.modelAuc)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-muted-strong">
                          {formatPercent(t.heatAuc)}
                        </td>
                        <td className="py-2.5 text-xs">
                          {better ? (
                            <span className="text-brand">Model better</span>
                          ) : (
                            <span className="text-muted-strong">Heat alone does as well</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-strong">
                Same measure as above: how often the bleached survey of a pair is ranked higher.
              </p>
            </div>
          )}
        </Reveal>

        {/* A dolphin and its fish glide along the top of the charts (full-bleed, decorative). */}
        <div className="relative mt-24">
          <LiveLayer className="pointer-events-none absolute -top-[4.75rem] left-1/2 h-24 w-screen -translate-x-1/2 overflow-hidden">
            <DolphinPass top="18px" duration={28} delay={4} />
          </LiveLayer>
        <div className="relative grid grid-cols-1 rounded-[28px] border border-border bg-card shadow-float lg:grid-cols-[2fr_3fr] lg:divide-x lg:divide-border">
          <Reveal as="figure" className="flex flex-col p-6 sm:p-8">
            <figcaption>
              <h3 className="text-sm font-semibold text-foreground">Reefs by predicted resilience</h3>
              <p className="mt-1 text-xs text-muted-strong">
                {reefs.length.toLocaleString()} reefs, by probability of avoiding significant bleaching
              </p>
            </figcaption>
            <CategoryBars data={countData} total={reefs.length} />
          </Reveal>

          <Reveal as="figure" delay={120} className="border-t border-border p-6 sm:p-8 lg:border-t-0">
            <figcaption>
              <h3 className="text-sm font-semibold text-foreground">Predicted resilience by recent heat stress</h3>
              <p className="mt-1 text-xs text-muted-strong">
                Share of reefs in each band, by peak heat stress over the past 12 weeks (<Term term="dhw">Degree Heating Weeks</Term>)
              </p>
            </figcaption>
            <HeatBandChart data={heatData} />
          </Reveal>
        </div>

        </div>

        <Reveal as="p" variant="fade-in" className="mt-4 text-xs text-muted-strong">
          Heat stress: NOAA Coral Reef Watch. Patterns are model-based estimates, not observed
          outcomes.
        </Reveal>
      </div>
    </section>
  );
});

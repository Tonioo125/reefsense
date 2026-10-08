import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Reveal from "@/components/Reveal";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { PALETTE } from "@/lib/palette";
import { CATEGORY_COLORS, CATEGORY_ORDER, formatPercent } from "@/lib/reef";
import type { ModelMetrics, Reef } from "@/types/reef";

interface InsightsSectionProps {
  reefs: Reef[];
  metrics: ModelMetrics | null;
}

const AXIS = { fill: PALETTE.seaGrayStrong, fontSize: 11 };

const tooltipStyle = {
  borderRadius: 8,
  border: `1px solid ${PALETTE.border}`,
  fontSize: 12,
  boxShadow: "0 10px 30px -18px rgba(22,78,90,0.3)",
  color: PALETTE.deepTeal,
};

const mean = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

interface CountDatum {
  category: string;
  count: number;
  color: string;
}

interface ScatterDatum {
  sst: number;
  prob: number;
  name: string;
  color: string;
}

/**
 * Charts mount only once their box scrolls into view, so Recharts plays its
 * entry animation where the reader can see it. The fixed-height box is always
 * rendered, so nothing shifts when the chart appears.
 */
function CategoryChart({ data }: { data: CountDatum[] }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.25 });
  const reduceMotion = usePrefersReducedMotion();
  return (
    <div ref={ref} className="mt-5 h-64">
      {inView && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={PALETTE.border} />
            <XAxis dataKey="category" tickLine={false} axisLine={false} tick={AXIS} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
            <Tooltip
              cursor={{ fill: PALETTE.softAqua }}
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value} reefs`, "Count"]}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={72}
              isAnimationActive={!reduceMotion}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {data.map((d) => (
                <Cell key={d.category} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function HeatScatterChart({ data }: { data: ScatterDatum[] }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.25 });
  const reduceMotion = usePrefersReducedMotion();
  return (
    <div ref={ref} className="mt-5 h-64">
      {inView && (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 12, bottom: 4, left: -18 }}>
            <CartesianGrid stroke={PALETTE.border} />
            <XAxis
              type="number"
              dataKey="sst"
              name="SST"
              unit="°C"
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tickFormatter={(v: number) => v.toFixed(0)}
              tickLine={false}
              axisLine={false}
              tick={AXIS}
            />
            <YAxis
              type="number"
              dataKey="prob"
              name="Predicted probability"
              unit="%"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={AXIS}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: PALETTE.seaGray }}
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [
                name === "SST" ? `${value} °C` : `${value}%`,
                name === "SST" ? "Sea surface temp" : "Predicted probability",
              ]}
            />
            <Scatter
              data={data}
              isAnimationActive={!reduceMotion}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} stroke={PALETTE.deepTeal} strokeOpacity={0.3} strokeWidth={0.5} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function InsightsSection({ reefs, metrics }: InsightsSectionProps) {
  const { countData, scatterData, stats } = useMemo(() => {
    const counts = CATEGORY_ORDER.map((category) => ({
      category,
      count: reefs.filter((r) => r.category === category).length,
      color: CATEGORY_COLORS[category].base,
    }));
    const scatter = reefs
      .filter((r) => r.metrics.seaSurfaceTemp != null)
      .map((r) => ({
        sst: Number(r.metrics.seaSurfaceTemp!.toFixed(1)),
        prob: Math.round(r.resilienceProbability * 100),
        name: r.name,
        color: CATEGORY_COLORS[r.category].base,
      }));
    const high = reefs.filter((r) => r.category === "High").length;
    const has = reefs.length > 0;
    const auc = metrics?.model.roc_auc;
    const baseAuc = metrics?.baseline_dhw?.roc_auc;
    return {
      countData: counts,
      scatterData: scatter,
      stats: [
        { value: has ? String(reefs.length) : "—", label: "Reef sites analysed" },
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

        <div className="mt-8 grid grid-cols-1 rounded-lg border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-border">
          <Reveal as="figure" className="p-6">
            <figcaption>
              <h3 className="text-sm font-semibold text-foreground">
                Reefs by predicted resilience category
              </h3>
              <p className="mt-1 text-xs text-muted-strong">
                Number of reef systems in each predicted band
              </p>
            </figcaption>
            <CategoryChart data={countData} />
          </Reveal>

          <Reveal as="figure" delay={120} className="border-t border-border p-6 lg:border-t-0">
            <figcaption>
              <h3 className="text-sm font-semibold text-foreground">
                Heat exposure vs predicted resilience
              </h3>
              <p className="mt-1 text-xs text-muted-strong">
                Sea surface temperature (°C) against predicted probability of high climate
                resilience (%)
              </p>
            </figcaption>
            <HeatScatterChart data={scatterData} />
          </Reveal>
        </div>

        <Reveal as="p" variant="fade-in" className="mt-4 text-xs text-muted-strong">
          Heat stress: NOAA Coral Reef Watch. Patterns are model-based estimates, not observed
          outcomes.
        </Reveal>
      </div>
    </section>
  );
}

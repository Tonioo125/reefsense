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
import { CATEGORY_COLORS, CATEGORY_ORDER, formatPercent } from "@/lib/reef";
import type { Reef } from "@/types/reef";

interface InsightsSectionProps {
  reefs: Reef[];
}

const AXIS = { fill: "hsl(155 9% 42%)", fontSize: 11 };

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(54 12% 88%)",
  fontSize: 12,
  boxShadow: "0 10px 30px -18px rgba(16,40,34,0.35)",
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="font-display text-3xl font-medium text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default function InsightsSection({ reefs }: InsightsSectionProps) {
  const { countData, scatterData, meanProb, highShare } = useMemo(() => {
    const counts = CATEGORY_ORDER.map((category) => ({
      category,
      count: reefs.filter((r) => r.category === category).length,
      color: CATEGORY_COLORS[category].base,
    }));
    const scatter = reefs.map((r) => ({
      sst: r.metrics.seaSurfaceTemp,
      prob: Math.round(r.resilienceProbability * 100),
      name: r.name,
      color: CATEGORY_COLORS[r.category].base,
    }));
    const mean = reefs.length
      ? reefs.reduce((s, r) => s + r.resilienceProbability, 0) / reefs.length
      : 0;
    const high = reefs.filter((r) => r.category === "High").length;
    return {
      countData: counts,
      scatterData: scatter,
      meanProb: mean,
      highShare: reefs.length ? high / reefs.length : 0,
    };
  }, [reefs]);

  return (
    <section id="insights" className="scroll-mt-16 border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1240px] px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">Insights</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Patterns across the global dataset
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Aggregate, model-based patterns across the reef systems in this prototype. Predicted
            resilience tends to decline as sea surface temperatures rise — consistent with heat
            stress as a dominant driver.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat value={String(reefs.length)} label="Reef systems analysed" />
          <Stat value={formatPercent(highShare)} label="High predicted resilience" />
          <Stat value={formatPercent(meanProb)} label="Mean predicted probability" />
          <Stat value="5" label="Environmental predictors" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground">Reefs by resilience category</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Distribution of predicted categories
            </p>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid vertical={false} stroke="hsl(54 12% 90%)" />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} tick={AXIS} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
                  <Tooltip
                    cursor={{ fill: "hsl(150 20% 95%)" }}
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value} reefs`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={72}>
                    {countData.map((d) => (
                      <Cell key={d.category} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground">
              Heat exposure vs predicted resilience
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Sea surface temperature (°C) against predicted probability (%)
            </p>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 4, right: 12, bottom: 4, left: -18 }}>
                  <CartesianGrid stroke="hsl(54 12% 90%)" />
                  <XAxis
                    type="number"
                    dataKey="sst"
                    name="SST"
                    unit="°C"
                    domain={[25, 31]}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                  />
                  <YAxis
                    type="number"
                    dataKey="prob"
                    name="Resilience"
                    unit="%"
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3", stroke: "hsl(54 12% 80%)" }}
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      name === "SST" ? `${value} °C` : `${value}%`,
                      name === "SST" ? "Sea surface temp" : "Predicted resilience",
                    ]}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getSurveyHistory } from "@/api/client";
import { useReefResource } from "@/hooks/useReefResource";
import { PALETTE, RESILIENCE } from "@/lib/palette";
import { coverTrend } from "@/lib/reef";
import type { SurveyYear } from "@/types/reef";

const AXIS = { fill: PALETTE.seaGrayStrong, fontSize: 10 };

function YearTooltip({ active, payload }: { active?: boolean; payload?: { payload: SurveyYear }[] }) {
  if (!active || !payload?.length) return null;
  const y = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-float">
      <p className="font-semibold">{y.year}</p>
      <p className="mt-0.5 tabular-nums">
        Mean {y.meanBleachedPct}% bleached · max {y.maxBleachedPct}%
      </p>
      <p className="tabular-nums text-muted-strong">
        {y.bleachingSamples} survey{y.bleachingSamples === 1 ? "" : "s"} at {y.locations} location
        {y.locations === 1 ? "" : "s"}
        {y.bleachedShare != null && `, ${Math.round(y.bleachedShare * 100)}% at 10% or more`}
      </p>
      {y.coralCoverPct != null && <p className="tabular-nums text-muted-strong">Hard coral cover {y.coralCoverPct}%</p>}
    </div>
  );
}

/**
 * What past field surveys near this reef recorded, by year (GET /api/reefs/{id}/survey-history):
 * the observations the model learned from, as distinct from the model's own estimate.
 */
export default function SurveyHistory({ reefId }: { reefId: string }) {
  const { data, status } = useReefResource(reefId, getSurveyHistory);
  const years = (data?.years ?? []).filter((y) => y.meanBleachedPct != null);
  const cover = data ? coverTrend(data.years) : null;
  const threshold = data?.thresholdPct ?? 10;

  return (
    <section aria-label="Past bleaching surveys">
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">Field record</p>
      <h3 className="mt-1 text-[15px] font-semibold text-foreground">Past bleaching surveys nearby</h3>

      {status === "loading" ? (
        <div aria-hidden="true" className="mt-3 h-32 rounded-md bg-muted motion-safe:animate-pulse" />
      ) : status === "error" || !data ? (
        <p className="mt-3 text-xs text-muted-foreground">Could not load the survey history.</p>
      ) : data.samples === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No surveys recorded within {data.radiusKm} km of this reef in the Global Coral-Bleaching Database.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-strong">
            {data.samples} survey{data.samples === 1 ? "" : "s"} at {data.locations} location
            {data.locations === 1 ? "" : "s"} within {data.radiusKm} km
            {data.years.length > 0 && `, ${data.years[0].year}–${data.years[data.years.length - 1].year}`}
          </p>

          {years.length > 0 ? (
            <div
              className="mt-3 h-32"
              role="img"
              aria-label={`Mean percent of colonies bleached by survey year: ${years
                .map((y) => `${y.year} ${y.meanBleachedPct}%`)
                .join(", ")}.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={years} margin={{ top: 6, right: 6, bottom: 0, left: -26 }}>
                  <CartesianGrid vertical={false} stroke={PALETTE.border} />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tick={AXIS} minTickGap={8} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} unit="%" tickLine={false} axisLine={false} tick={AXIS} />
                  <ReferenceLine y={threshold} stroke={PALETTE.seaGray} strokeDasharray="4 3" />
                  <Tooltip cursor={{ fill: PALETTE.softAqua }} content={<YearTooltip />} />
                  <Bar dataKey="meanBleachedPct" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                    {years.map((y) => (
                      <Cell
                        key={y.year}
                        fill={(y.meanBleachedPct ?? 0) >= threshold ? RESILIENCE.Low.base : PALETTE.brightTeal}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">These surveys recorded coral cover, not bleaching.</p>
          )}

          {cover && (
            <p className="mt-2 text-xs text-muted-strong">
              Hard coral cover:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {cover.first.pct}% ({cover.first.year})
              </span>
              {cover.last.year !== cover.first.year && (
                <>
                  {" → "}
                  <span className="font-medium tabular-nums text-foreground">
                    {cover.last.pct}% ({cover.last.year})
                  </span>
                </>
              )}
            </p>
          )}

          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Mean percent of colonies bleached per year; red bars reached the model&apos;s {threshold}% bleaching
            threshold (dashed). Global Coral-Bleaching Database
            {data.sources.length > 0 && ` (${data.sources.map((s) => s.replace(/_/g, " ")).join(", ")})`}.
            {data.coarseSamples > 0 &&
              ` ${data.coarseSamples} of ${data.samples} records give a severity band, not a measured percent, so are approximate.`}
          </p>
        </>
      )}
    </section>
  );
}

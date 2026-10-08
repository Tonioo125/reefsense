import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getHeatHistory } from "@/api/client";
import { useReefResource } from "@/hooks/useReefResource";
import { PALETTE, RESILIENCE } from "@/lib/palette";
import { formatDay, heatPeak } from "@/lib/reef";

const AXIS = { fill: PALETTE.seaGrayStrong, fontSize: 10 };
const tooltipStyle = {
  borderRadius: 8,
  border: `1px solid ${PALETTE.border}`,
  fontSize: 12,
  boxShadow: "0 10px 30px -18px rgba(22,78,90,0.3)",
  color: PALETTE.deepTeal,
};

/**
 * Daily NOAA Coral Reef Watch Degree Heating Weeks at the reef's pixel, with NOAA's alert thresholds,
 * so the 12-week peak the model uses can be seen building up (GET /api/reefs/{id}/heat-history).
 */
export default function HeatTimeline({ reefId }: { reefId: string }) {
  const { data, status } = useReefResource(reefId, getHeatHistory);
  const points = data?.points ?? [];
  const peak = heatPeak(points);
  const yMax = Math.max(Math.ceil((peak?.dhw ?? 0) + 1), 9);

  return (
    <section aria-label="Heat stress timeline">
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">Satellite record</p>
      <h3 className="mt-1 text-[15px] font-semibold text-foreground">Heat stress, last 12 weeks</h3>

      {status === "loading" ? (
        <div aria-hidden="true" className="mt-3 h-36 rounded-md bg-muted motion-safe:animate-pulse" />
      ) : !peak ? (
        <p className="mt-3 text-xs text-muted-foreground">No daily heat-stress record for this reef.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-strong">
            {peak.dhw > 0 ? (
              <>
                Peak <span className="font-medium tabular-nums text-foreground">{peak.dhw.toFixed(1)} DHW</span>{" "}
                on {formatDay(peak.date, false)}
              </>
            ) : (
              "No accumulated heat stress over this period."
            )}
          </p>
          <div
            className="mt-3 h-36"
            role="img"
            aria-label={`Degree Heating Weeks from ${formatDay(points[0].date)} to ${formatDay(
              points[points.length - 1].date,
            )}, peaking at ${peak.dhw.toFixed(1)} on ${formatDay(peak.date)}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: -26 }}>
                <defs>
                  <linearGradient id={`heat-${reefId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.coral} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PALETTE.coral} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={PALETTE.border} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => formatDay(d, false)}
                  minTickGap={36}
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS}
                />
                <YAxis domain={[0, yMax]} allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
                {data!.alertThresholds.map((t) => (
                  <ReferenceLine
                    key={t.dhw}
                    y={t.dhw}
                    stroke={t.dhw >= 8 ? RESILIENCE.Low.base : RESILIENCE.Medium.base}
                    strokeDasharray="4 3"
                    label={{ value: t.label, position: "insideTopRight", fontSize: 9, fill: PALETTE.seaGrayStrong }}
                  />
                ))}
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(d: string) => formatDay(d)}
                  formatter={(v: number) => [`${v.toFixed(2)} DHW`, "Heat stress"]}
                />
                <Area
                  type="monotone"
                  dataKey="dhw"
                  stroke={PALETTE.coral}
                  strokeWidth={1.75}
                  fill={`url(#heat-${reefId})`}
                  connectNulls
                  isAnimationActive={false}
                />
                {peak.dhw > 0 && (
                  <ReferenceDot x={peak.date} y={peak.dhw} r={3.5} fill={PALETTE.coral} stroke={PALETTE.white} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {data!.source}, to {data!.asOf ? formatDay(data!.asOf) : "the latest day"}. NOAA alerts escalate at 4
            and 8 DHW.
          </p>
        </>
      )}
    </section>
  );
}

import type { ReactNode } from "react";
import { Flame, Ruler, Sprout, Thermometer, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { levelTone } from "@/lib/reef";
import type { EnvironmentalMetrics as Metrics, QualitativeLevel } from "@/types/reef";

interface EnvironmentalMetricsProps {
  metrics: Metrics;
}

function LevelPill({ level, note }: { level: QualitativeLevel; note?: string | null }) {
  const tone = levelTone(level);
  return (
    <span className="flex items-center gap-2">
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      <span
        className="rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ background: tone.soft, color: tone.text }}
      >
        {level}
      </span>
    </span>
  );
}

function Value({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <span className="block text-right">
      <span className="text-sm font-medium tabular-nums text-foreground">{children}</span>
      {note && <span className="block text-[11px] text-muted-foreground">{note}</span>}
    </span>
  );
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

const fmt = (v: number | null | undefined, digits = 1) => (v == null ? "n/a" : v.toFixed(digits));
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`;

/**
 * Environmental predictors for the selected reef. Styled as a quiet, scientific
 * variable list rather than a grid of dashboard stat cards. Values the source
 * data does not provide are shown as "n/a", never estimated.
 */
export default function EnvironmentalMetrics({ metrics }: EnvironmentalMetricsProps) {
  return (
    <dl className="divide-y divide-border">
      <Row icon={Thermometer} label="Sea surface temperature">
        <Value
          note={metrics.sstAnomaly != null ? `${signed(metrics.sstAnomaly)} °C vs normal` : undefined}
        >
          {fmt(metrics.seaSurfaceTemp)} °C
        </Value>
      </Row>
      {metrics.dhwMax12w != null && (
        <Row icon={TrendingUp} label="Peak heat stress, 12 weeks">
          <Value note={metrics.dhwNow != null ? `${fmt(metrics.dhwNow)} DHW today` : undefined}>
            {fmt(metrics.dhwMax12w)} DHW
          </Value>
        </Row>
      )}
      <Row icon={Flame} label="Heat stress">
        {metrics.heatStress ? (
          <LevelPill level={metrics.heatStress} note={metrics.alertLevel} />
        ) : (
          <Value>n/a</Value>
        )}
      </Row>
      <Row icon={Sprout} label="Coral cover">
        <Value
          note={
            metrics.coralCoverSource === "nearby surveys" && metrics.coralCover != null
              ? "nearby surveys"
              : undefined
          }
        >
          {metrics.coralCover == null ? "n/a" : `${Math.round(metrics.coralCover)}%`}
        </Value>
      </Row>
      <Row icon={Ruler} label="Depth">
        <Value>{metrics.depth == null ? "n/a" : `${fmt(metrics.depth)} m`}</Value>
      </Row>
    </dl>
  );
}

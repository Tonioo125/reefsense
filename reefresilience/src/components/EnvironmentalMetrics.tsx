import { Flame, Ruler, Sprout, Thermometer, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { levelTone } from "@/lib/reef";
import type { EnvironmentalMetrics as Metrics, QualitativeLevel } from "@/types/reef";

interface EnvironmentalMetricsProps {
  metrics: Metrics;
}

function LevelPill({ level }: { level: QualitativeLevel }) {
  const tone = levelTone(level);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: tone.soft, color: tone.text }}
    >
      {level}
    </span>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary/70" strokeWidth={1.75} />
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * Environmental predictors for the selected reef. Styled as a quiet, scientific
 * variable list rather than a grid of dashboard stat cards.
 */
export default function EnvironmentalMetrics({ metrics }: EnvironmentalMetricsProps) {
  return (
    <div className="divide-y divide-border">
      <Row icon={Thermometer} label="Sea surface temperature">
        <span className="text-sm font-medium tabular-nums">
          {metrics.seaSurfaceTemp.toFixed(1)} °C
        </span>
      </Row>
      <Row icon={Sprout} label="Coral cover">
        <span className="text-sm font-medium tabular-nums">{metrics.coralCover}%</span>
      </Row>
      <Row icon={Ruler} label="Depth">
        <span className="text-sm font-medium tabular-nums">{metrics.depth.toFixed(1)} m</span>
      </Row>
      <Row icon={Flame} label="Heat stress">
        <LevelPill level={metrics.heatStress} />
      </Row>
      <Row icon={Users} label="Human pressure">
        <LevelPill level={metrics.humanPressure} />
      </Row>
    </div>
  );
}

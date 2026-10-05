import type { ReactNode } from "react";
import { Flame, Ruler, Sprout, Thermometer, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ENVIRONMENTAL_VARIABLES, levelTone } from "@/lib/reef";
import type { EnvironmentalMetrics as Metrics, QualitativeLevel } from "@/types/reef";

interface EnvironmentalMetricsProps {
  metrics: Metrics;
}

const ICONS: Record<keyof Metrics, LucideIcon> = {
  seaSurfaceTemp: Thermometer,
  coralCover: Sprout,
  depth: Ruler,
  heatStress: Flame,
  humanPressure: Users,
};

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

function formatValue(value: Metrics[keyof Metrics], unit?: string): ReactNode {
  if (typeof value === "string") return <LevelPill level={value} />;
  const text = unit === "%" ? `${value}%` : `${value.toFixed(1)} ${unit ?? ""}`.trim();
  return <span className="text-sm font-medium tabular-nums text-foreground">{text}</span>;
}

/**
 * Environmental predictors for the selected reef. Styled as a quiet, scientific
 * variable list rather than a grid of dashboard stat cards.
 */
export default function EnvironmentalMetrics({ metrics }: EnvironmentalMetricsProps) {
  return (
    <dl className="divide-y divide-border">
      {ENVIRONMENTAL_VARIABLES.map(({ key, label, unit }) => {
        const Icon = ICONS[key];
        return (
          <div key={key} className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Icon className="h-4 w-4 text-primary/70" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </dt>
            <dd>{formatValue(metrics[key], unit)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

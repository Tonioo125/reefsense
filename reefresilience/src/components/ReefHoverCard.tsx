import {
  CATEGORY_COLORS,
  CATEGORY_THRESHOLDS,
  CORAL_COVER_GRADIENT,
  CORAL_COVER_MAX,
  RESILIENCE_GRADIENT,
  coralCoverColor,
  formatPercent,
  resilienceLabel,
} from "@/lib/reef";
import type { MapColorBy, Reef } from "@/types/reef";

interface ReefHoverCardProps {
  reef: Reef;
  colorBy: MapColorBy;
}

/** A gradient scale with a dot marking where this reef sits on it. */
function ScaleBar({
  gradient,
  position,
  color,
  ticks = [],
}: {
  gradient: string;
  position: number;
  color: string;
  ticks?: number[];
}) {
  return (
    <div className="relative mt-2 h-1.5 w-full rounded-full" style={{ background: gradient }}>
      {ticks.map((t) => (
        <span key={t} className="absolute top-0 h-full w-px bg-white/60" style={{ left: `${t * 100}%` }} />
      ))}
      <span
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_3px_rgba(255,255,255,0.15)]"
        style={{ left: `${Math.min(Math.max(position, 0), 1) * 100}%`, background: color }}
      />
    </div>
  );
}

/** Rich hover content for a reef marker, coloured by the active map layer. */
export default function ReefHoverCard({ reef, colorBy }: ReefHoverCardProps) {
  const header = (
    <>
      <p className="truncate text-[12px] font-semibold leading-tight">{reef.name}</p>
      <p className="truncate text-[10px] opacity-70">{reef.region}</p>
    </>
  );

  if (colorBy === "coral") {
    const { coralCover, coralCoverYear, coralCoverKm } = reef.metrics;
    if (coralCover == null) {
      return (
        <div className="w-44">
          {header}
          <p className="mt-2 text-[11px] opacity-80">No coral survey within 10 km</p>
        </div>
      );
    }
    const color = coralCoverColor(coralCover);
    const source = [coralCoverYear && `${coralCoverYear} survey`, coralCoverKm && coralCoverKm >= 0.5 && `${coralCoverKm} km away`]
      .filter(Boolean)
      .join(" · ");
    return (
      <div className="w-44">
        {header}
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="h-2 w-2 shrink-0 self-center rounded-full ring-1 ring-white/70" style={{ background: color }} />
          <span className="text-[16px] font-semibold tabular-nums leading-none">{Math.round(coralCover)}%</span>
          <span className="text-[10px] opacity-75">hard coral</span>
        </p>
        <ScaleBar gradient={CORAL_COVER_GRADIENT} position={coralCover / CORAL_COVER_MAX} color={color} />
        {source && <p className="mt-1.5 text-[10px] opacity-70">{source}</p>}
      </div>
    );
  }

  const color = CATEGORY_COLORS[reef.category].base;
  return (
    <div className="w-44">
      {header}
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="h-2 w-2 shrink-0 self-center rounded-full ring-1 ring-white/70" style={{ background: color }} />
        <span className="text-[16px] font-semibold tabular-nums leading-none">
          {formatPercent(reef.resilienceProbability)}
        </span>
        <span className="text-[10px] opacity-75">{resilienceLabel(reef.category).toLowerCase()}</span>
      </p>
      <ScaleBar
        gradient={RESILIENCE_GRADIENT}
        position={reef.resilienceProbability}
        color={color}
        ticks={[CATEGORY_THRESHOLDS.medium, CATEGORY_THRESHOLDS.high]}
      />
      {reef.metrics.dhwMax12w != null && (
        <p className="mt-1.5 text-[10px] opacity-70">
          Peak heat stress {reef.metrics.dhwMax12w.toFixed(1)} DHW, last 12 weeks
        </p>
      )}
    </div>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { predict } from "@/api/client";
import { CATEGORY_COLORS, formatPercent, resilienceLabel } from "@/lib/reef";
import { cn } from "@/lib/utils";
import type { PredictResponse } from "@/types/reef";

interface HeatScenarioProps {
  latitude: number;
  longitude: number;
  /** Starting peak DHW: the reef's current value, or an assumed one for an arbitrary point. */
  initialDhw: number;
  /** Kept fixed while DHW varies, so the scenario starts from the reef's current conditions. */
  sstAnomaly?: number | null;
  /** The reef's current predicted probability, to show the scenario's change against it. */
  currentProbability?: number;
  /** "reef": a scored reef's current heat stress; "assumed": a user-chosen value for a map point. */
  mode?: "reef" | "assumed";
  compact?: boolean;
}

export const DHW_MAX = 16;
const NOAA_TICKS = [
  { dhw: 4, label: "Alert 1" },
  { dhw: 8, label: "Alert 2" },
];
const DEBOUNCE_MS = 250;
const FAR_SURVEY_KM = 25;

/**
 * "What if heat stress changes?": re-scores a location with the real model (POST /api/predict)
 * as peak Degree Heating Weeks vary. Only heat changes; other conditions stay as surveyed.
 */
export default function HeatScenario({
  latitude,
  longitude,
  initialDhw,
  sstAnomaly,
  currentProbability,
  mode = "reef",
  compact = false,
}: HeatScenarioProps) {
  const start = Math.min(Math.max(Math.round(initialDhw * 2) / 2, 0), DHW_MAX);
  const [dhw, setDhw] = useState(start);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const sliderId = useId();

  // A different reef or point restarts the scenario from its own value.
  useEffect(() => {
    setDhw(start);
  }, [latitude, longitude, start]);

  useEffect(() => {
    const request = ++latest.current;
    setLoading(true);
    const timer = setTimeout(() => {
      predict({
        latitude,
        longitude,
        // At the starting position use the exact current value, so the result matches the map.
        dhwMax12w: dhw === start && mode === "reef" ? initialDhw : dhw,
        ...(sstAnomaly != null ? { sstAnomaly } : {}),
      })
        .then((res) => {
          if (request !== latest.current) return; // a newer slider position superseded this one
          setResult(res);
          setError(null);
        })
        .catch(() => {
          if (request === latest.current) setError("Could not run the scenario.");
        })
        .finally(() => {
          if (request === latest.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [latitude, longitude, dhw, start, initialDhw, sstAnomaly, mode]);

  const color = result ? CATEGORY_COLORS[result.category] : null;
  const delta =
    result && currentProbability != null ? Math.round((result.probability - currentProbability) * 100) : null;
  const changed = dhw !== start;

  return (
    <section aria-label="Heat stress scenario">
      {!compact && (
        <>
          <p className="text-[11px] font-medium uppercase tracking-wide text-brand">Scenario</p>
          <h3 className="mt-1 text-[15px] font-semibold text-foreground">What if heat stress changes?</h3>
        </>
      )}

      <div className={cn("flex items-baseline justify-between gap-3", !compact && "mt-3")}>
        <label htmlFor={sliderId} className="text-xs text-muted-foreground">
          {mode === "assumed" ? "Assumed peak heat stress" : "Peak heat stress, 12 weeks"}
        </label>
        <span className="text-sm font-semibold tabular-nums text-foreground">{dhw.toFixed(1)} DHW</span>
      </div>

      <div className="relative mt-2 pb-4">
        <input
          id={sliderId}
          type="range"
          min={0}
          max={DHW_MAX}
          step={0.5}
          value={dhw}
          onChange={(e) => setDhw(Number(e.target.value))}
          aria-valuetext={`${dhw.toFixed(1)} Degree Heating Weeks`}
          className="w-full cursor-pointer accent-[hsl(var(--brand))]"
        />
        {NOAA_TICKS.map((t) => (
          <span
            key={t.dhw}
            aria-hidden="true"
            className="absolute top-6 -translate-x-1/2 text-[9px] leading-none text-muted-foreground"
            style={{ left: `${(t.dhw / DHW_MAX) * 100}%` }}
          >
            <span className="mx-auto mb-0.5 block h-1.5 w-px bg-muted-foreground/60" />
            {t.label}
          </span>
        ))}
      </div>

      <div
        className="mt-1 flex min-h-[3.25rem] items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2"
        aria-live="polite"
      >
        {error ? (
          <p className="text-xs text-muted-foreground">{error}</p>
        ) : !result ? (
          <Loader2 className="h-4 w-4 text-muted-foreground motion-safe:animate-spin" aria-label="Running scenario" />
        ) : (
          <>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color!.base }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {formatPercent(result.probability)}
                </span>
                {delta != null && delta !== 0 && (
                  <span
                    className="text-xs font-medium tabular-nums"
                    style={{ color: delta < 0 ? CATEGORY_COLORS.Low.text : CATEGORY_COLORS.High.text }}
                  >
                    {delta > 0 ? "+" : "−"}
                    {Math.abs(delta)} pts vs now
                  </span>
                )}
                {loading && (
                  <Loader2 className="h-3 w-3 text-muted-foreground motion-safe:animate-spin" aria-hidden="true" />
                )}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {resilienceLabel(result.category)} · {formatPercent(result.bleachingProbability)} bleaching risk
              </p>
            </div>
          </>
        )}
      </div>

      {mode === "reef" && changed && (
        <button
          type="button"
          onClick={() => setDhw(start)}
          className="mt-2 inline-flex items-center gap-1 rounded text-xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Back to current ({initialDhw.toFixed(1)} DHW)
        </button>
      )}

      {result && result.nearestSurveyKm > FAR_SURVEY_KM && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          Nearest surveyed reef is {Math.round(result.nearestSurveyKm)} km away, so local conditions are
          uncertain here.
        </p>
      )}

      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Model scenario: only heat stress changes; other conditions stay as surveyed. NOAA alerts escalate
        at 4 and 8 DHW.
      </p>
    </section>
  );
}

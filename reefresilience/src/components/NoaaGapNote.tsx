import { BellOff } from "lucide-react";
import { formatPercent } from "@/lib/reef";
import type { Reef } from "@/types/reef";

/**
 * Callout for a reef the model flags at elevated risk although NOAA's alerts stayed below Alert
 * Level 1 (4 DHW) for the past 12 weeks. Phrased as a difference between two signals: NOAA's alerts
 * use heat stress alone, the model adds local conditions.
 */
export default function NoaaGapNote({ reef }: { reef: Reef }) {
  const dhw = reef.metrics.dhwMax12w;
  return (
    <div
      role="note"
      className="flex gap-3 rounded-md border border-[#e9c3b9] bg-[#fbf1ee] px-3 py-2.5 text-xs leading-relaxed text-[#6e2a1f]"
    >
      <BellOff className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <p>
        <span className="font-semibold">Below NOAA&apos;s alert threshold.</span> Peak heat stress here
        was {dhw != null ? <span className="font-medium tabular-nums">{dhw.toFixed(1)} DHW</span> : "below 4 DHW"}{" "}
        over 12 weeks, so NOAA&apos;s alerts did not reach Alert Level 1 (4 DHW). The model, adding local
        conditions, still estimates a{" "}
        <span className="font-medium tabular-nums">
          {formatPercent(reef.bleachingProbability ?? 1 - reef.resilienceProbability)}
        </span>{" "}
        chance of significant bleaching.
      </p>
    </div>
  );
}

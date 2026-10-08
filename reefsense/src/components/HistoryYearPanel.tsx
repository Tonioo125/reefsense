import { History } from "lucide-react";
import { BLEACHING_EVENTS, FEW_SURVEYS, eventForYear } from "@/lib/history";
import { RESILIENCE } from "@/lib/palette";
import { formatPercent } from "@/lib/reef";
import type { HistoryYear } from "@/types/reef";

/** Side panel during the history replay: the selected year's surveys, worst-hit countries and context. */
export default function HistoryYearPanel({ data, source }: { data: HistoryYear | null; source: string }) {
  if (!data) return null;
  const event = eventForYear(data.year);

  return (
    <article className="p-6" aria-label={`Observed bleaching in ${data.year}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Bleaching history
      </p>
      <h2 className="mt-1 font-display text-3xl font-medium tabular-nums text-foreground">{data.year}</h2>

      {event && (
        <div
          className="mt-3 rounded-md border border-resilience-low/30 px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: RESILIENCE.Low.soft, color: RESILIENCE.Low.text }}
        >
          <p className="font-semibold">{event.name}</p>
          <p>{event.note}</p>
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <dt className="text-xs text-muted-strong">of surveys found 10%+ of corals bleached</dt>
          <dd className="order-first font-display text-2xl font-medium tabular-nums text-foreground">
            {formatPercent(data.bleachedShare)}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-muted-strong">surveys at {data.locations.toLocaleString()} locations</dt>
          <dd className="order-first font-display text-2xl font-medium tabular-nums text-foreground">
            {data.surveys.toLocaleString()}
          </dd>
        </div>
      </dl>

      {data.topCountries.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-muted-strong">Most surveyed that year</p>
          <ul className="mt-2 divide-y divide-border">
            {data.topCountries.map((c) => (
              <li key={c.country} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                <span className="text-foreground">{c.country}</span>
                <span className="text-xs tabular-nums text-muted-strong">
                  <span className="font-medium text-foreground">{formatPercent(c.bleachedShare)}</span> of{" "}
                  {c.surveys.toLocaleString()} bleached
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 space-y-2 text-[11px] leading-snug text-muted-strong">
        <p>
          Each dot is a surveyed location, coloured by the average share of corals divers found bleached. These are
          observations, not model predictions.
        </p>
        <p>
          Surveys are not spread evenly: the yearly share reflects where people looked as well as how hot it got.
          {data.surveys < FEW_SURVEYS && " This year has few surveys, so treat it with caution."}
        </p>
        <p>
          Mass bleaching events marked: {BLEACHING_EVENTS.map((e) => (e.start === e.end ? e.start : `${e.start}–${e.end}`)).join(", ")}.
          The fourth global event began in 2023, after this record ends. Source: {source}.
        </p>
      </div>
    </article>
  );
}

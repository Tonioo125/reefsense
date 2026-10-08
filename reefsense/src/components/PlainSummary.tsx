import { MessageCircle } from "lucide-react";
import { getSurveyHistory } from "@/api/client";
import { useReefResource } from "@/hooks/useReefResource";
import { formatDay } from "@/lib/reef";
import { PLAIN_NOAA_GAP, plainHeat, plainHistory, plainRisk } from "@/lib/plain";
import type { Reef } from "@/types/reef";

/** The reef's situation in everyday words: risk, recent heat, NOAA's alerts and the worst bleaching on record nearby. */
export default function PlainSummary({ reef }: { reef: Reef }) {
  const { data: history, status } = useReefResource(reef.id, getSurveyHistory);
  const risk = reef.bleachingProbability ?? 1 - reef.resilienceProbability;
  const sentences = [
    plainRisk(risk),
    plainHeat(reef.metrics.dhwMax12w),
    reef.noaaGap ? PLAIN_NOAA_GAP : null,
    status === "ready" ? plainHistory(history) : null,
  ].filter((s): s is string => s != null);

  return (
    <section aria-label="This reef in plain words" className="rounded-lg border border-border bg-secondary/50 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        In plain words
      </p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground">
        {sentences.map((s) => (
          <p key={s}>{s}</p>
        ))}
        {status === "loading" && <div aria-hidden="true" className="h-4 w-3/4 rounded bg-muted motion-safe:animate-pulse" />}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-muted-strong">
        This is a prediction, not an observation: only divers in the water can confirm bleaching.
        {reef.asOf && ` Ocean heat as of ${formatDay(reef.asOf)}.`}
      </p>
    </section>
  );
}

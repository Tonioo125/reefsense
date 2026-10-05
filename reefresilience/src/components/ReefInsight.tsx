import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { environmentalSummary, insightCopy, topPositiveFactors } from "@/lib/reef";
import type { Reef, ReefExplanation } from "@/types/reef";

interface ReefInsightProps {
  reef: Reef;
  explanation: ReefExplanation;
}

function Label({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/** Compact, scientific interpretation of the model output for one reef. */
export default function ReefInsight({ reef, explanation }: ReefInsightProps) {
  const copy = insightCopy(explanation.category);
  const factors = topPositiveFactors(explanation.contributions);

  return (
    <section>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-brand">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Model insight
      </p>
      <h3 className="mt-1 text-[15px] font-semibold text-foreground">{copy.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{explanation.summary}</p>

      <div className="mt-5 space-y-5 border-t border-border pt-4">
        {(reef.asOf || reef.nearestSurveyKm != null) && (
          <div>
            <Label>Data support</Label>
            <dl className="mt-2 space-y-1.5 text-xs">
              {reef.asOf && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Satellite heat stress as of</dt>
                  <dd className="font-medium tabular-nums text-foreground">{reef.asOf}</dd>
                </div>
              )}
              {reef.nearestSurveyKm != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Nearest survey data</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {reef.nearestSurveyKm} km away
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {factors.length > 0 && (
          <div>
            <Label>Top contributing factors</Label>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {factors.map((f) => (
                <li key={f.feature}>
                  <Badge variant="outline" className="bg-background font-normal">
                    {f.feature}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <Label>Environmental summary</Label>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
            {environmentalSummary(reef.metrics)}
          </p>
        </div>
      </div>
    </section>
  );
}

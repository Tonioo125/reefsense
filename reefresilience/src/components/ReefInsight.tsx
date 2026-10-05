import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  confidenceLabel,
  environmentalSummary,
  formatPercent,
  insightCopy,
  topPositiveFactors,
} from "@/lib/reef";
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
  const confidence = explanation.confidence;

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
        <div>
          <div className="flex items-center justify-between">
            <Label>Model confidence</Label>
            <span className="text-xs font-medium tabular-nums text-foreground">
              {formatPercent(confidence)}
              <span className="ml-1.5 font-normal text-muted-foreground">
                {confidenceLabel(confidence)}
              </span>
            </span>
          </div>
          <div
            role="img"
            aria-label={`Model confidence ${formatPercent(confidence)}`}
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: formatPercent(confidence) }}
            />
          </div>
        </div>

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

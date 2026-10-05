import { Sparkles, X } from "lucide-react";
import CategoryBadge from "@/components/CategoryBadge";
import EnvironmentalMetrics from "@/components/EnvironmentalMetrics";
import FeatureContributions from "@/components/FeatureContributions";
import ResilienceScore from "@/components/ResilienceScore";
import { Button } from "@/components/ui/button";
import type { Reef } from "@/types/reef";

interface ReefAnalysisPanelProps {
  reef: Reef;
  onClose: () => void;
}

/** Compact, scientific interpretation block for the selected reef. */
function InsightBlock({ reef }: { reef: Reef }) {
  const topFactors = [...reef.contributions]
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2);

  return (
    <section className="rounded-lg border border-border bg-secondary/50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-brand" strokeWidth={1.75} />
        Model insight
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reef.insight}</p>

      {(reef.nearestSurveyKm != null || reef.asOf) && (
        <dl className="mt-4 space-y-1.5 text-xs">
          {reef.asOf && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Satellite heat stress as of</dt>
              <dd className="font-medium tabular-nums">{reef.asOf}</dd>
            </div>
          )}
          {reef.nearestSurveyKm != null && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Nearest survey data</dt>
              <dd className="font-medium tabular-nums">{reef.nearestSurveyKm} km away</dd>
            </div>
          )}
        </dl>
      )}

      {topFactors.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Top contributing factors
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topFactors.map((f) => (
              <span
                key={f.feature}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground"
              >
                {f.feature}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Detailed analysis for one reef: headline probability, environmental
 * predictors, the model explanation and a plain-language insight.
 */
export default function ReefAnalysisPanel({ reef, onClose }: ReefAnalysisPanelProps) {
  return (
    <article key={reef.id} className="animate-slide-up p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {reef.region}
          </p>
          <h2 className="mt-1 font-display text-xl font-medium leading-tight text-foreground">
            {reef.name}
          </h2>
          <div className="mt-2">
            <CategoryBadge category={reef.category} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close analysis panel"
          className="shrink-0 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="mt-6">
        <ResilienceScore probability={reef.resilienceProbability} category={reef.category} />
      </div>

      <div className="my-6 h-px bg-border" />

      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Environmental predictors
        </p>
        <EnvironmentalMetrics metrics={reef.metrics} />
      </div>

      <div className="my-6 h-px bg-border" />

      <FeatureContributions contributions={reef.contributions} category={reef.category} />

      <div className="my-6 h-px bg-border" />

      <InsightBlock reef={reef} />
    </article>
  );
}

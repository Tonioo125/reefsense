import type { Ref } from "react";
import { AlertCircle, X } from "lucide-react";
import EnvironmentalMetrics from "@/components/EnvironmentalMetrics";
import FeatureContributions from "@/components/FeatureContributions";
import ReefInsight from "@/components/ReefInsight";
import ResilienceScore from "@/components/ResilienceScore";
import { Button } from "@/components/ui/button";
import type { DetailStatus } from "@/hooks/useReefDetail";
import { cn } from "@/lib/utils";
import type { Reef, ReefExplanation } from "@/types/reef";

interface ReefAnalysisPanelProps {
  reef: Reef;
  explanation: ReefExplanation | null;
  status: DetailStatus;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  /** "wide" lays the panel out in two columns (tablet, below the map). */
  layout?: "stacked" | "wide";
  /** Id applied to the reef name heading, for aria-labelledby. */
  headingId?: string;
  closeButtonRef?: Ref<HTMLButtonElement>;
}

function Divider() {
  return <div className="my-6 h-px bg-border" />;
}

/** Quiet placeholder bars while the explanation is loading. */
function ExplanationSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="h-3 w-24 rounded bg-muted motion-safe:animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-muted motion-safe:animate-pulse" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-1/3 rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-2 w-full rounded-full bg-muted motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-border p-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm text-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      </div>
    </div>
  );
}

/**
 * Detailed analysis for one reef: headline probability, environmental
 * predictors, the model explanation and a plain-language insight.
 * Purely presentational; data loading lives in `useReefDetail`.
 */
export default function ReefAnalysisPanel({
  reef,
  explanation,
  status,
  error,
  onRetry,
  onClose,
  layout = "stacked",
  headingId,
  closeButtonRef,
}: ReefAnalysisPanelProps) {
  const wide = layout === "wide";
  const ready = explanation !== null && explanation.reefId === reef.id;

  return (
    <article key={reef.id} className="animate-slide-up p-6" aria-labelledby={headingId}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {reef.region}
          </p>
          <h2
            id={headingId}
            className="mt-1 font-display text-xl font-medium leading-tight text-foreground"
          >
            {reef.name}
          </h2>
        </div>
        <Button
          ref={closeButtonRef}
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close reef analysis"
          className="shrink-0 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className={cn("mt-6", wide && "md:grid md:grid-cols-2 md:gap-10")}>
        <div>
          <ResilienceScore probability={reef.resilienceProbability} category={reef.category} />
          <Divider />
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Environmental predictors
            </p>
            <EnvironmentalMetrics metrics={reef.metrics} />
          </div>
        </div>

        <div className={cn(wide && "md:border-l md:border-border md:pl-10")}>
          <div className={cn(wide && "md:hidden")}>
            <Divider />
          </div>
          {status === "error" && error ? (
            <DetailError message={error} onRetry={onRetry} />
          ) : ready ? (
            <>
              <FeatureContributions
                contributions={explanation.contributions}
                category={explanation.category}
              />
              <Divider />
              <ReefInsight reef={reef} explanation={explanation} />
            </>
          ) : (
            <>
              <span className="sr-only" role="status">
                Loading model explanation…
              </span>
              <ExplanationSkeleton />
            </>
          )}
        </div>
      </div>
    </article>
  );
}

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { Loader2, MapPin } from "lucide-react";
import { getModelMetrics, getNoaaGap, listReefs } from "@/api/client";
import AboutSection from "@/components/AboutSection";
import Hero from "@/components/Hero";
import InsightsSection from "@/components/InsightsSection";
import MapFilter from "@/components/MapFilter";
import MapLegend from "@/components/MapLegend";
import NoaaGapBanner from "@/components/NoaaGapBanner";
import ReefAnalysisPanel from "@/components/ReefAnalysisPanel";
import ResilienceMap from "@/components/ResilienceMap";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReefDetail } from "@/hooks/useReefDetail";
import { useReefPhotos } from "@/hooks/useReefPhotos";
import type { ReefPhotos } from "@/hooks/useReefPhotos";
import { scrollToSection } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import type {
  MapColorBy,
  ModelMetrics,
  NoaaGapSummary,
  Reef,
  ReefExplanation,
  ReefFilter,
} from "@/types/reef";

function PanelEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center lg:py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <MapPin className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">Select a reef</p>
      <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
        Choose a marker on the map to view its predicted climate resilience and the model's
        explanation.
      </p>
      <p className="mt-4 max-w-[16rem] text-xs leading-relaxed text-muted-strong">
        Or click anywhere on the water to test how a location responds to different heat stress.
      </p>
    </div>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  initialFocusRef: RefObject<HTMLButtonElement>;
  children: ReactNode;
}

/** Mobile analysis panel: a dismissable bottom sheet that slides up over the map. */
function BottomSheet({ open, onClose, labelledBy, initialFocusRef, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Focus the close button on open; restore focus and scrolling on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocusRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, initialFocusRef]);

  // Keep keyboard focus inside the dialog while it is open.
  const trapFocus = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !sheetRef.current) return;
    const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div aria-hidden={!open}>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[55] bg-foreground/20 transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onKeyDown={trapFocus}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[60] max-h-[82vh] overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-[0_-16px_40px_-24px_rgba(22,78,90,0.3)] duration-300 motion-reduce:transition-none",
          // Visibility flips immediately on open (so focus can move in) and
          // only after the slide-out on close.
          open
            ? "visible translate-y-0 transition-transform"
            : "invisible translate-y-full transition-[transform,visibility]",
        )}
      >
        <div className="flex justify-center pt-2.5" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="scroll-subtle max-h-[calc(82vh-1.5rem)] overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Explore() {
  const [reefs, setReefs] = useState<Reef[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [noaaGap, setNoaaGap] = useState<NoaaGapSummary | null>(null);
  const [highlightGaps, setHighlightGaps] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReefFilter>("All");
  const [colorBy, setColorBy] = useState<MapColorBy>("resilience");
  const [showReefArea, setShowReefArea] = useState(true);

  const isMdUp = useMediaQuery("(min-width: 768px)");
  const isLgUp = useMediaQuery("(min-width: 1024px)");
  const headingId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      listReefs(),
      getModelMetrics().catch(() => null),
      getNoaaGap().catch(() => null),
    ])
      .then(([data, m, gap]) => {
        if (!active) return;
        setReefs(data);
        setMetrics(m);
        setNoaaGap(gap);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Could not load the reef dataset.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const detail = useReefDetail(selectedId);
  const photos = useReefPhotos(selectedId);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  // Escape closes the analysis panel / bottom sheet.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, clearSelection]);

  const counts = useMemo<Record<ReefFilter, number>>(
    () => ({
      All: reefs.length,
      High: reefs.filter((r) => r.category === "High").length,
      Medium: reefs.filter((r) => r.category === "Medium").length,
      Low: reefs.filter((r) => r.category === "Low").length,
    }),
    [reefs],
  );

  const visibleReefs = useMemo(
    () => (filter === "All" ? reefs : reefs.filter((r) => r.category === filter)),
    [reefs, filter],
  );

  // Show the list record immediately; swap in the detail response once loaded.
  const listReef = reefs.find((r) => r.id === selectedId) ?? null;
  const panelReef = detail.reef && detail.reef.id === selectedId ? detail.reef : listReef;

  // A filter that hides the selected reef also closes its analysis.
  const handleFilterChange = (next: ReefFilter) => {
    setFilter(next);
    if (next !== "All" && listReef && listReef.category !== next) setSelectedId(null);
  };

  // Keep the last content mounted so the bottom sheet can slide out with it.
  const lastSheet = useRef<{
    reef: Reef;
    explanation: ReefExplanation | null;
    photos: ReefPhotos;
  } | null>(null);
  if (panelReef) lastSheet.current = { reef: panelReef, explanation: detail.explanation, photos };

  const renderPanel = (
    reef: Reef,
    explanation: ReefExplanation | null,
    reefPhotos: ReefPhotos,
    layout: "stacked" | "wide",
  ) => (
    <ReefAnalysisPanel
      reef={reef}
      explanation={explanation}
      status={detail.status}
      error={detail.error}
      photos={reefPhotos.photos}
      photosStatus={reefPhotos.status}
      photosReefId={reefPhotos.reefId}
      onRetry={detail.retry}
      onPhotosRetry={reefPhotos.retry}
      onClose={clearSelection}
      layout={layout}
      headingId={headingId}
      closeButtonRef={closeButtonRef}
    />
  );

  return (
    <>
      <Hero
        onExplore={() => scrollToSection("explore")}
        reefCount={loading || error ? null : reefs.length}
        surveyCount={metrics?.n_rows ?? null}
        predictorCount={metrics?.features.length ?? null}
      />

      <section id="explore" aria-label="Explore the resilience map" className="scroll-mt-16">
        <div className="relative isolate flex flex-col lg:h-[calc(100vh-4rem)] lg:min-h-[600px] lg:flex-row">
          {/* Opacity-only reveals here: a transformed ancestor would break fixed positioning. */}
          <Reveal
            variant="fade-in"
            className="relative h-[44vh] min-h-[300px] w-full bg-muted md:h-[58vh] md:min-h-[420px] lg:h-full lg:min-h-0 lg:flex-1"
          >
            <ResilienceMap
              reefs={visibleReefs}
              selectedId={selectedId}
              onSelect={setSelectedId}
              colorBy={colorBy}
              showReefArea={showReefArea}
              highlightGaps={highlightGaps}
            />

            {!loading && !error && (
              <>
                <MapFilter value={filter} onChange={handleFilterChange} counts={counts} />
                {noaaGap && (
                  <NoaaGapBanner
                    summary={noaaGap}
                    active={highlightGaps}
                    onToggle={() => setHighlightGaps((v) => !v)}
                  />
                )}
                <MapLegend
                  colorBy={colorBy}
                  onColorByChange={setColorBy}
                  showReefArea={showReefArea}
                  onShowReefAreaChange={setShowReefArea}
                />
              </>
            )}

            {loading && (
              <div
                role="status"
                className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2"
              >
                <span className="flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-strong shadow-float backdrop-blur-md">
                  <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
                  Loading reef dataset…
                </span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center p-6">
                <div
                  role="alert"
                  className="rounded-lg border border-border bg-card px-5 py-4 text-center shadow-float"
                >
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <p className="mt-1 text-xs text-muted-strong">
                    Is the API running? <code>uvicorn main:app --port 8000</code> in{" "}
                    <code>backend/</code>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setLoadAttempt((n) => n + 1)}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            )}
          </Reveal>

          {isMdUp && (
            <Reveal
              as="aside"
              variant="fade-in"
              delay={150}
              aria-label="Reef analysis"
              className="border-t border-border bg-card md:w-full lg:flex lg:w-[400px] lg:shrink-0 lg:flex-col lg:border-l lg:border-t-0"
            >
              <div className="scroll-subtle lg:flex-1 lg:overflow-y-auto">
                {panelReef ? (
                  renderPanel(panelReef, detail.explanation, photos, isLgUp ? "stacked" : "wide")
                ) : (
                  <PanelEmptyState />
                )}
              </div>
            </Reveal>
          )}
        </div>

        {!isMdUp && (
          <BottomSheet
            open={!!panelReef}
            onClose={clearSelection}
            labelledBy={headingId}
            initialFocusRef={closeButtonRef}
          >
            {lastSheet.current &&
              renderPanel(
                lastSheet.current.reef,
                lastSheet.current.explanation,
                lastSheet.current.photos,
                "stacked",
              )}
          </BottomSheet>
        )}
      </section>

      <InsightsSection reefs={reefs} metrics={metrics} />
      <AboutSection />
    </>
  );
}

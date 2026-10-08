import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { ArrowRight, History, Loader2, MapPin, Maximize2, Minimize2 } from "lucide-react";
import { getBleachingHistory, getModelMetrics, getNoaaGap, listReefs } from "@/api/client";
import AboutSection from "@/components/AboutSection";
import ActSection from "@/components/ActSection";
import Hero from "@/components/Hero";
import HistoryReplay from "@/components/HistoryReplay";
import HistoryYearPanel from "@/components/HistoryYearPanel";
import InsightsSection from "@/components/InsightsSection";
import MapFilter from "@/components/MapFilter";
import MapLegend from "@/components/MapLegend";
import NoaaGapBanner from "@/components/NoaaGapBanner";
import ReefAnalysisPanel from "@/components/ReefAnalysisPanel";
import ResilienceMap from "@/components/ResilienceMap";
import RestoreSection from "@/components/RestoreSection";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReefDetail } from "@/hooks/useReefDetail";
import { useReefPhotos } from "@/hooks/useReefPhotos";
import type { ReefPhotos } from "@/hooks/useReefPhotos";
import { CATEGORY_COLORS, formatPercent } from "@/lib/reef";
import { scrollToSection } from "@/lib/scroll";
import { suggestedReefs } from "@/lib/suggest";
import type { SuggestedReef } from "@/lib/suggest";
import { cn } from "@/lib/utils";
import type {
  BleachingHistory,
  MapColorBy,
  MapMode,
  ModelMetrics,
  NoaaGapSummary,
  Reef,
  ReefExplanation,
  ReefFilter,
} from "@/types/reef";

function PanelEmptyState({
  suggestions,
  onPick,
}: {
  suggestions: SuggestedReef[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center px-6 py-10 lg:py-12">
      <div className="flex items-center gap-3">
        {/* A slow sonar ping: the panel is listening for a selection. */}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-primary/40 motion-safe:animate-[ping_2.8s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary">
            <MapPin className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} aria-hidden="true" />
          </span>
        </div>
        <div>
          <p className="text-[15px] font-semibold text-foreground">Select a reef</p>
          <p className="text-sm leading-snug text-muted-foreground">
            Choose a marker on the map, or start with one of these.
          </p>
        </div>
      </div>

      {suggestions.length > 0 && (
        <ul className="mt-6 space-y-2">
          {suggestions.map(({ reef, reason }) => (
            <li key={reef.id}>
              <button
                type="button"
                onClick={() => onPick(reef.id)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-left transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                  style={{ background: CATEGORY_COLORS[reef.category].base }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{reef.name}</span>
                  <span className="block text-xs leading-snug text-muted-strong">
                    {reason} · {reef.region}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-lg font-medium leading-none tabular-nums text-foreground">
                    {formatPercent(reef.resilienceProbability)}
                  </span>
                  <span className="text-[10px] text-muted-strong">resilience</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-strong transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted-strong">
        Or click anywhere on the water to test how a place would cope with more or less ocean heat.
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
          "fixed inset-0 z-[55] bg-ink/25 transition-opacity duration-300 motion-reduce:transition-none",
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
          "fixed inset-x-0 bottom-0 z-[60] max-h-[82vh] overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-[0_-16px_40px_-24px_rgba(10,37,64,0.3)] duration-300 motion-reduce:transition-none",
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
  const [mode, setMode] = useState<MapMode>("today");
  const [history, setHistory] = useState<BleachingHistory | null>(null);
  const [historyStatus, setHistoryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [historyYear, setHistoryYear] = useState(1998);
  const [playing, setPlaying] = useState(false);

  const isMdUp = useMediaQuery("(min-width: 768px)");
  const isLgUp = useMediaQuery("(min-width: 1024px)");

  // Fullscreen map: the browser's own fullscreen where the panel lives inside the frame (tablet and
  // up); on phones a fixed full-viewport layer, so the reef bottom sheet can still open over it.
  const frameRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [placeholder, setPlaceholder] = useState<number | null>(null);
  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!fullscreen) {
      setPlaceholder(frame?.offsetHeight ?? null);
      setFullscreen(true);
      if (isMdUp && frame?.requestFullscreen) frame.requestFullscreen().catch(() => {});
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  }, [fullscreen, isMdUp]);

  // Leaving the browser's fullscreen (Esc, F11) leaves ours too.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
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

  const replaying = mode === "history" && history != null;

  const startReplay = () => {
    setSelectedId(null);
    setMode("history");
    if (history) {
      setPlaying(true);
      return;
    }
    setHistoryStatus("loading");
    getBleachingHistory()
      .then((data) => {
        setHistory(data);
        setHistoryYear(data.years[0]?.year ?? 1998);
        setHistoryStatus("idle");
        setPlaying(true);
      })
      .catch(() => {
        setHistoryStatus("error");
        setMode("today");
      });
  };

  const exitReplay = useCallback(() => {
    setPlaying(false);
    setMode("today");
  }, []);

  const historyLayer = useMemo(
    () =>
      replaying
        ? {
            points: history.points.filter((p) => p[2] === historyYear),
            countries: history.countries,
            thresholdPct: history.thresholdPct,
          }
        : null,
    [replaying, history, historyYear],
  );
  const historyYearData = history?.years.find((y) => y.year === historyYear) ?? null;

  const detail = useReefDetail(selectedId);
  const photos = useReefPhotos(selectedId);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  // While fullscreen: the page behind stays put, and Escape steps out (after closing an open reef).
  useEffect(() => {
    if (!fullscreen) {
      setPlaceholder(null);
      return;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectedId) setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, selectedId]);

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

  const suggestions = useMemo(() => suggestedReefs(reefs, noaaGap?.reefIds), [reefs, noaaGap]);
  // A suggestion opens even when the current filter hides its band.
  const pickSuggestion = useCallback((id: string) => {
    setFilter("All");
    setSelectedId(id);
  }, []);
  // From elsewhere on the page (the restoration ranking): open the reef and bring the map into view.
  const openReef = useCallback(
    (id: string) => {
      pickSuggestion(id);
      scrollToSection("explore");
    },
    [pickSuggestion],
  );

  // Shareable links: the open reef lives in the URL (?reef=ID), and a link opens straight to it.
  const linkedReef = useRef<string | null>(
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("reef"),
  );
  useEffect(() => {
    const id = linkedReef.current;
    if (!id || reefs.length === 0) return;
    linkedReef.current = null;
    if (reefs.some((r) => r.id === id)) {
      setSelectedId(id);
      // Wait a frame for the page to lay out, then bring the map into view.
      requestAnimationFrame(() => scrollToSection("explore"));
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("reef");
      window.history.replaceState(window.history.state, "", url);
    }
  }, [reefs]);
  useEffect(() => {
    if (linkedReef.current) return; // the link has not been applied yet
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("reef", selectedId);
    else url.searchParams.delete("reef");
    window.history.replaceState(window.history.state, "", url);
  }, [selectedId]);

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
        alertRecall={metrics?.baseline_dhw?.dhw_ge_4?.recall ?? null}
        surveys={metrics?.n_rows ?? null}
        reefCount={loading || error ? null : reefs.length}
      />

      <section
        id="explore"
        aria-label="Explore the resilience map"
        className="scroll-mt-24 px-2 pt-3 sm:px-3"
        // Hold the frame's place in the page while it is lifted out to fullscreen.
        style={placeholder ? { minHeight: placeholder + 12 } : undefined}
      >
        <div
          ref={frameRef}
          className={cn(
            "relative isolate flex flex-col overflow-clip rounded-[28px] border border-border bg-card shadow-float sm:rounded-[32px] lg:h-[calc(100svh-7rem)] lg:min-h-[600px] lg:flex-row",
            fullscreen &&
              "fixed inset-0 z-[54] h-[100dvh] rounded-none border-0 shadow-none max-lg:overflow-y-auto sm:rounded-none lg:h-[100dvh] lg:min-h-0",
          )}
        >
          {/* Opacity-only reveals here: a transformed ancestor would break fixed positioning. */}
          <Reveal
            variant="fade-in"
            className={cn(
              "relative h-[56vh] min-h-[380px] w-full bg-background md:h-[66vh] md:min-h-[540px] lg:h-full lg:min-h-0 lg:flex-1",
              fullscreen && "max-md:h-[100dvh] max-md:min-h-0",
            )}
          >
            <ResilienceMap
              reefs={visibleReefs}
              selectedId={selectedId}
              onSelect={setSelectedId}
              colorBy={colorBy}
              showReefArea={showReefArea}
              highlightGaps={highlightGaps}
              history={historyLayer}
            />

            {replaying && (
              <HistoryReplay
                years={history.years}
                year={historyYear}
                onYearChange={setHistoryYear}
                playing={playing}
                onPlayingChange={setPlaying}
                onExit={exitReplay}
              />
            )}

            {!loading && !error && (
              <button
                type="button"
                data-map-toolbar=""
                onClick={toggleFullscreen}
                aria-pressed={fullscreen}
                aria-label={fullscreen ? "Exit fullscreen map" : "Show the map fullscreen"}
                title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen map"}
                className="absolute right-3 top-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/95 text-foreground shadow-float transition-[background-color,opacity] duration-300 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-4 sm:top-4"
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}

            {!loading && !error && !replaying && (
              <>
                <button
                  type="button"
                  onClick={startReplay}
                  disabled={historyStatus === "loading"}
                  className="absolute bottom-7 right-3 z-[1000] inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-medium text-foreground shadow-float transition-colors hover:border-brand/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 sm:right-4"
                >
                  {historyStatus === "loading" ? (
                    <Loader2 className="h-3.5 w-3.5 text-brand motion-safe:animate-spin" aria-hidden="true" />
                  ) : (
                    <History className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  )}
                  <span className="max-sm:hidden">Replay bleaching history, 1998–2020</span>
                  <span className="sm:hidden">Replay 1998–2020</span>
                  {historyStatus === "error" && <span className="text-muted-strong">(could not load)</span>}
                </button>
                {/* One toolbar row: the filter, then the NOAA-gap toggle; it wraps rather than overlapping. */}
                <div data-map-toolbar="" className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex flex-wrap items-start gap-2 pr-11 transition-opacity duration-300 sm:inset-x-4 sm:top-4 sm:pl-11 sm:pr-12 [&>*]:pointer-events-auto">
                  <MapFilter value={filter} onChange={handleFilterChange} counts={counts} />
                  {noaaGap && (
                    <NoaaGapBanner
                      summary={noaaGap}
                      active={highlightGaps}
                      onToggle={() => setHighlightGaps((v) => !v)}
                    />
                  )}
                </div>
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
                <span className="flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-strong shadow-float">
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
              className="border-t border-border bg-card md:w-full lg:flex lg:w-[420px] lg:shrink-0 lg:flex-col lg:border-l lg:border-t-0"
            >
              <div className="scroll-subtle relative lg:flex-1 lg:overflow-y-auto">
                {replaying ? (
                  <HistoryYearPanel data={historyYearData} source={history.source} />
                ) : panelReef ? (
                  renderPanel(panelReef, detail.explanation, photos, isLgUp ? "stacked" : "wide")
                ) : (
                  <PanelEmptyState suggestions={suggestions} onPick={pickSuggestion} />
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

      <RestoreSection reefs={reefs} onOpen={openReef} />
      <InsightsSection reefs={reefs} metrics={metrics} />
      <ActSection />
      <AboutSection />
    </>
  );
}

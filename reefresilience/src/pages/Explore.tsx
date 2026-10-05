import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { getModelMetrics, listReefs } from "@/api/client";
import AboutSection from "@/components/AboutSection";
import Hero from "@/components/Hero";
import InsightsSection from "@/components/InsightsSection";
import MapFilter from "@/components/MapFilter";
import MapLegend from "@/components/MapLegend";
import ReefAnalysisPanel from "@/components/ReefAnalysisPanel";
import ResilienceMap from "@/components/ResilienceMap";
import { scrollToSection } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import type { ModelMetrics, Reef, ReefFilter } from "@/types/reef";

function PanelEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <MapPin className="h-5 w-5 text-primary/70" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">Select a reef</p>
      <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
        Choose a marker on the map to view its predicted climate resilience and the model's
        explanation.
      </p>
    </div>
  );
}

/** Mobile / tablet analysis panel: a bottom sheet that slides up over the map. */
function BottomSheet({ reef, onClose }: { reef: Reef | null; onClose: () => void }) {
  const open = !!reef;
  return (
    <div className="lg:hidden" aria-hidden={!open}>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[55] bg-foreground/20 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[60] max-h-[82vh] overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-[0_-16px_40px_-24px_rgba(16,40,34,0.5)] transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="scroll-subtle max-h-[calc(82vh-1.5rem)] overflow-y-auto">
          {reef && <ReefAnalysisPanel reef={reef} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

export default function Explore() {
  const [reefs, setReefs] = useState<Reef[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReefFilter>("All");

  useEffect(() => {
    let active = true;
    Promise.all([listReefs(), getModelMetrics().catch(() => null)])
      .then(([data, m]) => {
        if (active) {
          setReefs(data);
          setMetrics(m);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

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

  const selected = reefs.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      <Hero
        onExplore={() => scrollToSection("explore")}
        reefCount={reefs.length || null}
        surveyCount={metrics?.n_rows ?? null}
      />

      <section id="explore" className="scroll-mt-16">
        <div className="relative isolate flex flex-col lg:h-[calc(100vh-4rem)] lg:min-h-[600px] lg:flex-row">
          <div className="relative h-[52vh] min-h-[320px] w-full bg-muted lg:h-full lg:flex-1">
            <ResilienceMap reefs={visibleReefs} selectedId={selectedId} onSelect={setSelectedId} />

            {!loading && !error && (
              <>
                <MapFilter value={filter} onChange={setFilter} counts={counts} />
                <MapLegend />
              </>
            )}

            {loading && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
                <span className="flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-float backdrop-blur-md">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading reef dataset…
                </span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center p-6">
                <div className="max-w-sm rounded-lg border border-border bg-background px-5 py-4 text-sm shadow-float">
                  <p className="font-medium text-foreground">{error}</p>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">
                    Start it with <code className="text-foreground">uvicorn main:app --port 8000</code>{" "}
                    in <code className="text-foreground">backend/</code>.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="hidden border-l border-border bg-background lg:flex lg:w-[400px] lg:shrink-0 lg:flex-col">
            <div className="scroll-subtle flex-1 overflow-y-auto">
              {selected ? (
                <ReefAnalysisPanel reef={selected} onClose={() => setSelectedId(null)} />
              ) : (
                <PanelEmptyState />
              )}
            </div>
          </aside>
        </div>

        <BottomSheet reef={selected} onClose={() => setSelectedId(null)} />
      </section>

      <InsightsSection reefs={reefs} metrics={metrics} />
      <AboutSection />
    </>
  );
}

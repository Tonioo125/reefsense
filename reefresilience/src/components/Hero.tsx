import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onExplore: () => void;
  reefCount: number | null;
  surveyCount: number | null;
}

/** Subtle bathymetric contour lines — scientific texture, not decoration. */
function ContourBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 700"
    >
      <defs>
        <radialGradient id="reef-glow" cx="78%" cy="28%" r="60%">
          <stop offset="0%" stopColor="hsl(184 52% 34%)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="hsl(184 52% 34%)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#reef-glow)" />
      <g
        fill="none"
        stroke="hsl(160 38% 15%)"
        strokeOpacity="0.07"
        strokeWidth="1.2"
        transform="translate(880 210)"
      >
        {[40, 90, 150, 220, 300, 390].map((r, i) => (
          <ellipse key={r} rx={r} ry={r * 0.72} transform={`rotate(${-18 + i * 2})`} />
        ))}
      </g>
    </svg>
  );
}

export default function Hero({ onExplore, reefCount, surveyCount }: HeroProps) {
  const stats = [
    { value: reefCount == null ? "—" : String(reefCount), label: "Reef sites" },
    { value: surveyCount == null ? "—" : surveyCount.toLocaleString(), label: "Training surveys" },
    { value: "Model-based", label: "Probability estimates" },
  ];

  return (
    <section
      id="top"
      className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden"
    >
      <ContourBackground />
      <div className="relative mx-auto w-full max-w-[1240px] px-6">
        <div className="max-w-2xl animate-fade-in py-20">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-brand">
            <span className="h-px w-8 bg-brand/60" />
            AI-powered reef intelligence
          </p>

          <h1 className="mt-6 text-balance font-display text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Understanding coral resilience in a changing climate.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Explore AI-powered insights into which coral reef environments show stronger potential
            for climate resilience.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={onExplore} className="group">
              Explore the map
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Powered by environmental and ecological data
              <span className="block text-xs">
                Global Coral-Bleaching Database · NOAA Coral Reef Watch
              </span>
            </p>
          </div>

          <dl className="mt-14 flex flex-wrap gap-x-10 gap-y-4 border-t border-border/70 pt-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-2xl font-medium text-foreground">{stat.value}</dt>
                <dd className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

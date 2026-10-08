import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountUp } from "@/hooks/useCountUp";
import { useInView } from "@/hooks/useInView";
import { useParallax } from "@/hooks/useScroll";
import { PALETTE } from "@/lib/palette";

interface HeroProps {
  onExplore: () => void;
  /** Null while the data is loading or unavailable. */
  reefCount: number | null;
  surveyCount: number | null;
  predictorCount: number | null;
}

/** A thin, branching coral-like line motif, drawn from a base point. */
function CoralBranch({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0 C 2 -40, -6 -80, 4 -120 S 22 -170, 16 -210" />
      <path d="M2 -70 C 22 -86, 30 -112, 52 -128 S 70 -150, 66 -172" />
      <path d="M-2 -46 C -22 -62, -34 -84, -58 -96 S -82 -122, -78 -146" />
      <path d="M8 -132 C 24 -146, 34 -160, 30 -184" />
      <path d="M38 -116 C 52 -116, 66 -124, 80 -138" />
      <path d="M-40 -88 C -52 -96, -66 -100, -84 -98" />
    </g>
  );
}

/**
 * Subtle ocean / reef texture: bathymetric contours, a faint depth band rising
 * from the bottom and a few fine coral line motifs. Pure SVG, no images.
 */
function ReefBackground() {
  // Outer groups carry no transform attribute, so the parallax CSS transform
  // never overrides the inner positioning transforms.
  const glowRef = useRef<SVGGElement>(null);
  const contourRef = useRef<SVGGElement>(null);
  const coralRef = useRef<SVGGElement>(null);
  useParallax([
    [glowRef, 0.06],
    [contourRef, 0.18],
    // Positive factors only: layers lag the scroll and sink below the clipped
    // bottom edge, so the coral bases never lift off the section floor.
    [coralRef, 0.1],
  ]);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 700"
    >
      <defs>
        <radialGradient id="reef-glow" cx="78%" cy="28%" r="60%">
          <stop offset="0%" stopColor={PALETTE.aqua} stopOpacity="0.16" />
          <stop offset="100%" stopColor={PALETTE.aqua} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="depth-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.oceanBlue} stopOpacity="0" />
          <stop offset="100%" stopColor={PALETTE.oceanBlue} stopOpacity="0.07" />
        </linearGradient>
      </defs>
      <g ref={glowRef}>
        <rect width="1200" height="700" fill="url(#reef-glow)" />
      </g>
      <rect y="420" width="1200" height="280" fill="url(#depth-band)" />

      <g ref={contourRef}>
        <g
          fill="none"
          stroke={PALETTE.oceanBlue}
          strokeOpacity="0.1"
          strokeWidth="1.2"
          transform="translate(880 210)"
        >
          {[40, 90, 150, 220, 300, 390].map((r, i) => (
            <ellipse key={r} rx={r} ry={r * 0.72} transform={`rotate(${-18 + i * 2})`} />
          ))}
        </g>
      </g>

      <g ref={coralRef}>
        <g
          fill="none"
          stroke={PALETTE.coral}
          strokeOpacity="0.22"
          strokeWidth="1.3"
          strokeLinecap="round"
        >
          <CoralBranch x={1010} y={700} scale={1.05} />
          <CoralBranch x={1120} y={710} scale={0.75} />
          <CoralBranch x={900} y={715} scale={0.6} />
        </g>
      </g>
    </svg>
  );
}

const whole = (n: number) => Math.round(n).toString();
const grouped = (n: number) => Math.round(n).toLocaleString();

/**
 * A stat that counts up once visible. An invisible copy of the final value
 * reserves its width, so the row never shifts while the digits change.
 */
function StatValue({
  value,
  format,
  inView,
}: {
  value: number | null;
  format: (n: number) => string;
  inView: boolean;
}) {
  const v = useCountUp(value ?? 0, { enabled: inView && value != null });
  if (value == null) return <>—</>;
  const final = format(value);
  return (
    <>
      <span className="inline-grid">
        <span className="invisible col-start-1 row-start-1">{final}</span>
        <span aria-hidden="true" className="col-start-1 row-start-1">
          {format(v)}
        </span>
      </span>
      <span className="sr-only">{final}</span>
    </>
  );
}

export default function Hero({ onExplore, reefCount, surveyCount, predictorCount }: HeroProps) {
  const [statsRef, statsInView] = useInView<HTMLDListElement>();
  const stats = [
    { value: reefCount, label: "Reef sites", format: whole },
    { value: surveyCount, label: "Training surveys", format: grouped },
    { value: predictorCount, label: "Model predictors", format: whole },
  ];

  return (
    <section
      id="top"
      className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden"
    >
      <ReefBackground />
      <div className="relative mx-auto w-full max-w-[1240px] px-6">
        <div className="max-w-2xl py-20">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-brand motion-safe:animate-hero-in">
            <span className="h-px w-8 bg-coral" aria-hidden="true" />
            AI-powered reef intelligence
          </p>

          <h1
            className="mt-6 text-balance font-display text-5xl font-medium leading-[1.05] tracking-tight text-foreground motion-safe:animate-hero-in sm:text-6xl"
            style={{ animationDelay: "120ms" }}
          >
            Understanding coral resilience in a changing climate.
          </h1>

          <p
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground motion-safe:animate-hero-in"
            style={{ animationDelay: "240ms" }}
          >
            Explore AI-powered insights into which coral reef environments show stronger potential
            for climate resilience.
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-4 motion-safe:animate-hero-in"
            style={{ animationDelay: "360ms" }}
          >
            <Button size="lg" onClick={onExplore} className="group">
              Explore the map
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Powered by environmental and ecological data
              <span className="block text-xs text-muted-strong">
                Global Coral-Bleaching Database · NOAA Coral Reef Watch
              </span>
            </p>
          </div>

          <dl
            ref={statsRef}
            className="mt-14 flex flex-wrap gap-x-10 gap-y-4 border-t border-border/70 pt-6 motion-safe:animate-hero-in"
            style={{ animationDelay: "480ms" }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="mt-0.5 text-xs uppercase tracking-wide text-muted-strong">
                  {stat.label}
                </dt>
                <dd className="font-display text-2xl font-medium tabular-nums text-foreground">
                  <StatValue value={stat.value} format={stat.format} inView={statsInView} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

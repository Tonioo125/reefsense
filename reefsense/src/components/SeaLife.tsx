import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PALETTE, RESILIENCE } from "@/lib/palette";

/**
 * Decorative sea life: rising bubbles, a school of fish, sun rays and a reef floor of drawn corals.
 * Everything animates with transform and opacity only, is hidden from assistive tech, and pauses
 * while off screen (see `[data-paused]` in index.css).
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** A wrapper that pauses its animations whenever it is scrolled out of view. */
export function LiveLayer({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} aria-hidden="true" data-paused={onScreen ? undefined : ""} className={className}>
      {children}
    </div>
  );
}

// Fixed, hand-tuned spreads (not random) so every render and every visitor sees the same scene.
const BUBBLES = [
  { x: 6, size: 10, dur: 9, delay: 0, dx: 14 },
  { x: 12, size: 6, dur: 7, delay: 2.5, dx: -10 },
  { x: 19, size: 14, dur: 11, delay: 5, dx: 18 },
  { x: 28, size: 7, dur: 8, delay: 1, dx: 8 },
  { x: 71, size: 9, dur: 9.5, delay: 3.5, dx: -16 },
  { x: 78, size: 5, dur: 7.5, delay: 0.5, dx: 10 },
  { x: 84, size: 12, dur: 10.5, delay: 6, dx: -12 },
  { x: 92, size: 7, dur: 8.5, delay: 2, dx: 12 },
  { x: 48, size: 6, dur: 9, delay: 7.5, dx: 9 },
  { x: 57, size: 8, dur: 10, delay: 4.5, dx: -8 },
];

/** Bubbles rising from the bottom of the parent and fading out after `height` px. */
export function Bubbles({ height = 420, opacity = 0.75 }: { height?: number; opacity?: number }) {
  return (
    <>
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={
            {
              left: `${b.x}%`,
              width: b.size,
              height: b.size,
              "--dur": `${b.dur}s`,
              "--delay": `-${b.delay}s`,
              "--dx": `${b.dx}px`,
              "--h": `${height}px`,
              "--o": opacity,
            } as Vars
          }
        />
      ))}
    </>
  );
}

/** A small fish, head to the right (the way every school swims), tail to the left. */
function Fish({ color, stripe }: { color: string; stripe?: string }) {
  return (
    <svg viewBox="0 0 30 14" width="30" height="14">
      <path d="M28 7 C24 1 13 0 8 7 C13 14 24 13 28 7 Z" fill={color} />
      <path d="M9 7 L1 1.5 L3 7 L1 12.5 Z" fill={color} />
      {stripe && <path d="M20 2.4 C18.5 5 18.5 9 20 11.6" stroke={stripe} strokeWidth="1.6" fill="none" />}
      <circle cx="23.8" cy="6" r="1" fill="#fff" />
    </svg>
  );
}

/** A bottlenose dolphin in side view, swimming right. */
export function Dolphin({ body = "#5F87A6", belly = "#D3E4EE" }: { body?: string; belly?: string }) {
  return (
    <svg viewBox="0 0 120 48" width="120" height="48">
      <path
        d="M118 27 C112 25 106 22 102 18 C96 12 84 10 72 11 L66 11 C62 6 58 2 51 0 C54 5 55 9 55 12
           C44 14 34 18 25 23 C18 19 10 14 2 13 C7 19 12 23 16 27 C12 32 8 37 3 41 C12 40 20 36 26 32
           C40 36 60 38 80 36 C92 35 104 32 112 30 C116 29 118 28 118 27 Z"
        fill={body}
      />
      {/* Pale belly from the beak to the tail stock. */}
      <path d="M114 29 C104 31 92 34 80 35 C62 36 44 34 30 31 C44 32 62 32 80 31 C92 30 104 29 114 29 Z" fill={belly} />
      <path d="M84 33 C80 39 74 43 67 45 C72 40 75 36 77 33 Z" fill={body} />
      <path d="M111 27.5 Q106 28.5 101 27" stroke="#3E5F79" strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="103.5" cy="21.5" r="1.5" fill="#1F3448" />
    </svg>
  );
}

/** A dolphin gliding across its parent with an easy up-and-down stroke, a school of fish ahead. */
export function DolphinPass({ top = "0px", duration = 26, delay = 0 }: { top?: string; duration?: number; delay?: number }) {
  return (
    <>
      <div className="swim absolute left-0" style={{ top, "--dur": `${duration}s`, "--delay": `-${delay}s` } as Vars}>
        <div className="dolphin-stroke">
          <Dolphin />
        </div>
      </div>
      {/* The school swims a few seconds ahead of the dolphin (offset wrapped into one loop). */}
      <FishSchool
        top={`calc(${top} + 6px)`}
        duration={duration}
        delay={(delay + 3.2) % duration}
        color={PALETTE.reef}
        scale={0.8}
      />
    </>
  );
}

const SCHOOL = [
  { x: 0, y: 14, s: 1, d: 0 },
  { x: 26, y: 0, s: 0.85, d: 0.3 },
  { x: 34, y: 26, s: 0.9, d: 0.6 },
  { x: 58, y: 10, s: 0.75, d: 0.9 },
  { x: 64, y: 34, s: 0.8, d: 0.2 },
  { x: 86, y: 20, s: 0.7, d: 0.5 },
];

/** A loose school of fish crossing the parent from left to right. */
export function FishSchool({
  top,
  duration = 34,
  delay = 0,
  color = "rgb(10 37 64 / 0.55)",
  stripe,
  scale = 1,
}: {
  top: string;
  duration?: number;
  delay?: number;
  color?: string;
  stripe?: string;
  scale?: number;
}) {
  return (
    <div
      className="swim absolute left-0"
      style={{ top, "--dur": `${duration}s`, "--delay": `-${delay}s` } as Vars}
    >
      <div className="relative h-16 w-28" style={{ transform: `scale(${scale})`, transformOrigin: "left top" }}>
        {SCHOOL.map((f, i) => (
          <div
            key={i}
            className="bob absolute"
            style={{ left: f.x, top: f.y, scale: String(f.s), "--delay": `-${f.d * 2.4}s` } as Vars}
          >
            <Fish color={color} stripe={stripe} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A green sea turtle seen from the side and a little above, swimming right, flippers rowing. */
export function Turtle() {
  return (
    <svg viewBox="0 0 140 80" width="140" height="80">
      {/* Rear flipper, then the front flipper behind the shell. */}
      <path d="M30 50 C20 56 10 62 4 60 C10 54 18 48 28 44 Z" fill="#6E9C7C" />
      <g className="flipper-stroke" style={{ transformOrigin: "84px 46px" }}>
        <path d="M84 46 C96 56 104 70 98 76 C88 72 80 60 76 50 Z" fill="#6E9C7C" />
      </g>
      {/* Shell with scutes. */}
      <ellipse cx="62" cy="38" rx="40" ry="22" fill="#5A7F57" />
      <path d="M26 42 C40 52 84 54 100 42 C86 58 40 58 26 42 Z" fill="#E5D3A1" />
      <g fill="none" stroke="#9DBB86" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M50 22 L62 18 L74 22 L76 34 L62 40 L48 34 Z" />
        <path d="M48 34 L34 30 M76 34 L90 30 M62 40 L62 52 M50 22 L42 18 M74 22 L82 18" />
      </g>
      {/* Head and eye. */}
      <path d="M100 32 C108 26 122 26 128 32 C130 38 122 42 112 42 C106 42 102 38 100 36 Z" fill="#6E9C7C" />
      <circle cx="120" cy="32" r="2" fill="#1F3448" />
      {/* Near front flipper, rowing. */}
      <g className="flipper-stroke" style={{ transformOrigin: "88px 44px", animationDelay: "-0.6s" }}>
        <path d="M88 44 C102 50 116 62 112 70 C100 68 90 58 82 50 Z" fill="#7FAE8B" />
      </g>
    </svg>
  );
}

/** Soft beams of sunlight slanting down from the surface. */
export function SunRays() {
  return (
    <>
      {[8, 24, 63, 81].map((x, i) => (
        <span
          key={x}
          className="ray"
          style={{ left: `${x}%`, "--delay": `-${i * 2.1}s`, "--w": `${[90, 140, 110, 160][i]}px` } as Vars}
        />
      ))}
    </>
  );
}

/* --- Corals: drawn bottom-anchored in a 120 x 160 box, x = 60 at the base -------------------- */

export function Staghorn({ color, tip }: { color: string; tip: string }) {
  const tips: [number, number][] = [[52, 40], [16, 48], [30, 70], [92, 56], [108, 40], [70, 22]];
  return (
    <g>
      <g stroke={color} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M60 160 C60 130 58 110 62 88" />
        <path d="M61 122 C48 110 40 92 30 70" />
        <path d="M62 106 C76 94 86 78 92 56" />
        <path d="M60 92 C54 76 50 62 52 40" />
        <path d="M34 80 C24 70 18 60 16 48" />
        <path d="M88 66 C96 58 104 52 108 40" />
        <path d="M54 52 C60 42 66 34 70 22" />
      </g>
      {tips.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill={tip} />
      ))}
    </g>
  );
}

export function SeaFan({ color }: { color: string }) {
  // Ribs radiating from the holdfast, then cross-links at three radii: the lacework of a gorgonian.
  const ribs = Array.from({ length: 11 }, (_, i) => -62 + i * 12.4);
  const point = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [60 + Math.cos(a) * r, 156 + Math.sin(a) * r * 0.95];
  };
  return (
    <g stroke={color} fill="none" strokeLinecap="round">
      {ribs.map((deg) => {
        const [mx, my] = point(deg * 0.55, 60);
        const [x, y] = point(deg, 128);
        return <path key={deg} d={`M60 158 Q${mx} ${my} ${x} ${y}`} strokeWidth="2.6" />;
      })}
      {[54, 86, 112].map((r) => {
        const pts = ribs.map((deg) => point(deg * (0.55 + (0.45 * r) / 128), r));
        return (
          <path
            key={r}
            d={`M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}`}
            strokeWidth="1.4"
            opacity="0.8"
          />
        );
      })}
      <path d="M60 160 L60 150" strokeWidth="6" />
    </g>
  );
}

export function BrainCoral({ color, groove }: { color: string; groove: string }) {
  return (
    <g>
      <path d="M8 160 C8 118 34 98 60 98 C86 98 112 118 112 160 Z" fill={color} />
      <g stroke={groove} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M22 150 C26 132 36 124 44 128 C52 132 50 116 60 112 C70 108 72 124 80 122 C90 120 94 132 98 150" />
        <path d="M30 156 C34 142 42 138 50 142 C58 146 60 128 70 130 C80 132 82 144 88 156" />
        <path d="M34 122 C42 114 50 112 56 116" />
        <path d="M66 112 C76 110 86 114 92 122" />
      </g>
    </g>
  );
}

export function TubeCoral({ color, mouth }: { color: string; mouth: string }) {
  const tubes = [
    { x: 30, h: 62 },
    { x: 46, h: 92 },
    { x: 62, h: 74 },
    { x: 78, h: 104 },
    { x: 94, h: 58 },
  ];
  return (
    <g>
      {tubes.map((t) => (
        <g key={t.x}>
          <rect x={t.x - 7} y={160 - t.h} width="14" height={t.h} rx="7" fill={color} />
          <ellipse cx={t.x} cy={164 - t.h} rx="4.5" ry="2.6" fill={mouth} />
        </g>
      ))}
    </g>
  );
}

export function Kelp({ color }: { color: string }) {
  return (
    <g fill={color}>
      <path d="M56 160 C40 130 70 110 52 80 C40 60 58 40 50 14 C62 34 52 60 64 80 C80 108 54 128 66 160 Z" />
      <path d="M70 160 C64 138 84 124 76 100 C72 88 82 74 80 58 C90 76 82 92 88 106 C96 128 78 140 80 160 Z" opacity="0.75" />
    </g>
  );
}

export const CORAL_PINK = "#F29C8F";
export const CORAL_LILAC = "#B7A3E3";
export const SAND_LIGHT = "#F4EBD8";

/**
 * The reef floor that closes the page: a sand bank with corals, kelp, bubbles and fish.
 * Wide screens get the whole bank; the drawing is anchored bottom-centre and crops at the sides.
 */
export function ReefFloor() {
  type Piece = { x: number; s: number; sway: number; delay: number; el: ReactNode };
  const pieces: Piece[] = [
    { x: 40, s: 1.05, sway: 7, delay: 0, el: <Kelp color={RESILIENCE.High.base} /> },
    { x: 150, s: 0.95, sway: 9, delay: 1.2, el: <SeaFan color={CORAL_LILAC} /> },
    { x: 270, s: 0.8, sway: 0, delay: 0, el: <BrainCoral color={RESILIENCE.Medium.base} groove="#C8963A" /> },
    { x: 380, s: 1.1, sway: 6, delay: 0.6, el: <Staghorn color={PALETTE.coral} tip={CORAL_PINK} /> },
    { x: 500, s: 0.85, sway: 8, delay: 2, el: <Kelp color={PALETTE.reef} /> },
    { x: 610, s: 0.95, sway: 0, delay: 0, el: <TubeCoral color={CORAL_PINK} mouth="#C9665A" /> },
    { x: 740, s: 1.2, sway: 10, delay: 0.3, el: <SeaFan color={PALETTE.coral} /> },
    { x: 860, s: 0.9, sway: 6, delay: 1.6, el: <Staghorn color={RESILIENCE.High.base} tip="#8FE3D3" /> },
    { x: 980, s: 0.75, sway: 0, delay: 0, el: <BrainCoral color="#E9A7B8" groove="#C77B8E" /> },
    { x: 1090, s: 1.05, sway: 7, delay: 2.4, el: <Kelp color={RESILIENCE.High.base} /> },
    { x: 1190, s: 0.9, sway: 0, delay: 0, el: <TubeCoral color={RESILIENCE.Medium.base} mouth="#B98A2E" /> },
    { x: 1300, s: 1, sway: 8, delay: 0.9, el: <SeaFan color={CORAL_LILAC} /> },
    { x: 1400, s: 0.9, sway: 6, delay: 1.9, el: <Staghorn color={PALETTE.coral} tip={CORAL_PINK} /> },
  ];

  return (
    <LiveLayer className="relative -mt-10 h-[220px] overflow-hidden sm:-mt-16 sm:h-[260px]">
      {/* Water deepening toward the sand. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#E3F1F6]/80 via-30% to-[#D6EBF2]" />
      <Bubbles height={240} opacity={0.9} />
      <FishSchool top="18%" duration={30} delay={6} color={PALETTE.coral} stripe="#fff" scale={0.9} />
      <FishSchool top="42%" duration={42} delay={20} color={RESILIENCE.Medium.base} scale={0.7} />
      <svg
        viewBox="0 0 1440 260"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
      >
        {pieces.map((p, i) => (
          <g key={i} transform={`translate(${p.x - 60 * p.s} ${236 - 160 * p.s}) scale(${p.s})`}>
            <g
              className={p.sway ? "sway" : undefined}
              style={p.sway ? ({ "--dur": `${p.sway}s`, "--delay": `-${p.delay}s` } as Vars) : undefined}
            >
              {p.el}
            </g>
          </g>
        ))}
        {/* The sand bank the reef grows on, flowing into the footer. */}
        <path
          d="M0 232 C160 214 300 236 460 226 C640 214 760 238 940 228 C1120 218 1260 236 1440 224 L1440 260 L0 260 Z"
          fill={SAND_LIGHT}
        />
      </svg>
    </LiveLayer>
  );
}

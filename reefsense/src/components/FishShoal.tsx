import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  BrainCoral,
  CORAL_LILAC,
  CORAL_PINK,
  Kelp,
  SeaFan,
  Staghorn,
  TubeCoral,
  Turtle,
} from "@/components/SeaLife";
import { PALETTE, RESILIENCE } from "@/lib/palette";
import { cn } from "@/lib/utils";

/**
 * A small reef with its resident fish. The fish hang out around the corals: each has a favourite
 * coral it circles, and every few seconds part of the school drifts over to another coral. They
 * scatter from the cursor or a finger and swim back home once it is gone. Decorative and hidden
 * from assistive tech; it only animates while on screen and the tab is visible, and draws one still
 * frame under reduced motion.
 */

interface Fish {
  x: number;
  y: number;
  /** Heading (radians) and speed (px/frame): fish turn and accelerate smoothly, never snap. */
  heading: number;
  speed: number;
  /** Drawn left/right facing, eased between -1 and 1: a turnaround reads as the fish rolling round. */
  facing: number;
  /** Frames before this fish may turn around again, so it commits to a direction. */
  cooldown: number;
  size: number;
  /** 0 (far, faint, slow) to 1 (near, solid, quick). */
  depth: number;
  color: string;
  phase: number;
  /** Index of the coral this fish lives on. */
  home: number;
  /** Whether it follows the school when the school moves to another coral. */
  follower: boolean;
  /** Where on its orbit around the coral it is heading. */
  orbit: number;
  radius: number;
  /** Roamers wander wide and high, up past the text, before coming back to their coral. */
  roam: boolean;
}

/**
 * The reef: x as a fraction of the width, height as a fraction of the band (capped in px so wide or
 * tall bands do not grow giant corals). `wide` pieces only appear on wide bands. `home` marks corals
 * fish like to circle; kelp is scenery.
 */
type Coral = {
  x: number;
  hf: number;
  sway?: number;
  wide?: boolean;
  home?: boolean;
  /** DHW at which this coral starts to pale (illustrative). Kelp is an alga and never bleaches. */
  onset?: number;
  el: ReactNode;
};
const CORALS: Coral[] = [
  { x: 0.04, hf: 0.42, sway: 7, wide: true, el: <Kelp color={RESILIENCE.High.base} /> },
  { x: 0.12, hf: 0.5, sway: 9, home: true, onset: 5, el: <SeaFan color={CORAL_LILAC} /> },
  { x: 0.22, hf: 0.3, wide: true, home: true, onset: 3.5, el: <TubeCoral color={RESILIENCE.Medium.base} mouth="#B98A2E" /> },
  { x: 0.32, hf: 0.3, home: true, onset: 6.5, el: <BrainCoral color={RESILIENCE.Medium.base} groove="#C8963A" /> },
  { x: 0.43, hf: 0.4, sway: 8, wide: true, el: <Kelp color={PALETTE.reef} /> },
  { x: 0.53, hf: 0.52, sway: 6, home: true, onset: 2.5, el: <Staghorn color={PALETTE.coral} tip={CORAL_PINK} /> },
  { x: 0.64, hf: 0.46, sway: 10, wide: true, home: true, onset: 4, el: <SeaFan color={PALETTE.coral} /> },
  { x: 0.74, hf: 0.38, home: true, onset: 3.5, el: <TubeCoral color={CORAL_PINK} mouth="#C9665A" /> },
  { x: 0.84, hf: 0.26, wide: true, home: true, onset: 7, el: <BrainCoral color="#E9A7B8" groove="#C77B8E" /> },
  { x: 0.93, hf: 0.46, sway: 8, home: true, onset: 3, el: <Staghorn color={RESILIENCE.High.base} tip="#8FE3D3" /> },
];
const MAX_CORAL_PX = 380; // a coral's height is hf * min(band height, this)
const WIDE_BAND = 900;
const coralsFor = (w: number) => CORALS.filter((c) => !c.wide || w >= WIDE_BAND);
const homesFor = (corals: Coral[]) => corals.flatMap((c, i) => (c.home ? [i] : []));
/** How bleached a coral is at this heat: 0 healthy, 1 white. Branching corals go first, as on real reefs. */
export const bleachOf = (c: Coral, heat: number) =>
  c.onset == null ? 0 : Math.min(1, Math.max(0, (heat - c.onset) / 2.5));

// Mostly reef teal, with a few coral and sand fish for life.
const COLORS = [
  RESILIENCE.High.base,
  PALETTE.reef,
  PALETTE.ocean,
  RESILIENCE.High.base,
  PALETTE.coral,
  PALETTE.reef,
  RESILIENCE.Medium.base,
];

const VIEW = 54; // how far a fish sees its neighbours, px
const SPACE = 24; // personal space, px
const FLEE = 120; // radius of fear around the pointer, px
const CURIOUS = 230; // fish this close to a still pointer come to look, px
const STILL_MS = 900; // a pointer this long without moving counts as still

interface Pointer {
  x: number;
  y: number;
  still: boolean;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  life: number;
}
const MOVE_EVERY = 480; // frames between the school moving to another coral (~8 s)

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// A deterministic generator, so the reef starts the same way for every visitor.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const coralHeight = (c: Coral, h: number) => c.hf * Math.min(h, MAX_CORAL_PX);

/** The point above a coral's crown the fish circle. */
function homePoint(corals: Coral[], i: number, w: number, h: number) {
  const c = corals[i] ?? corals[0];
  return { x: c.x * w, y: h - coralHeight(c, h) * 0.82 };
}

function spawn(w: number, h: number, corals: Coral[]): Fish[] {
  const rand = seeded(7);
  const homes = homesFor(corals);
  // More fish on wider bands, so a full-width reef never looks empty.
  const count = Math.round(Math.min(72, Math.max(36, w / 22)));
  const fish = Array.from({ length: count }, (_, i) => {
    const home = homes[i % homes.length];
    const p = homePoint(corals, home, w, h);
    const angle = rand() * Math.PI * 2;
    const depth = rand();
    return {
      x: p.x + Math.cos(angle) * 30,
      y: p.y + Math.sin(angle) * 20,
      heading: i % 2 ? 0 : Math.PI,
      speed: 0.6,
      facing: i % 2 ? 1 : -1,
      cooldown: 0,
      size: 3.6 + depth * 4.2,
      depth,
      color: COLORS[i % COLORS.length],
      phase: rand() * Math.PI * 2,
      home,
      follower: rand() < 0.6,
      orbit: angle,
      radius: 26 + rand() * 38,
      roam: i % 4 === 0,
    };
  });
  // Far fish first, so near ones swim in front of them.
  return fish.sort((a, b) => a.depth - b.depth);
}

/** Shortest signed angle from a to b. */
const angleTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

function step(
  fish: Fish[],
  w: number,
  h: number,
  corals: Coral[],
  pointer: Pointer | null,
  t: number,
  rand: () => number,
  heat: number,
) {
  // Fish only live on corals that are still healthy; as corals bleach, their fish move on.
  const healthy = homesFor(corals).filter((i) => bleachOf(corals[i], heat) < 0.5);
  const homeless = healthy.length === 0;
  // Every few seconds the followers move together to another healthy coral.
  if (!homeless && t > 0 && t % MOVE_EVERY === 0) {
    const next = healthy[Math.floor(rand() * healthy.length)];
    for (const f of fish) if (f.follower) f.home = next;
  }

  for (const f of fish) {
    if (!homeless && !healthy.includes(f.home)) {
      // The nearest healthy coral becomes home.
      const fx = f.x / w;
      f.home = healthy.reduce((best, i) =>
        Math.abs(corals[i].x - fx) < Math.abs(corals[best].x - fx) ? i : best,
      );
    }
    // Desired direction: a sum of gentle urges.
    f.orbit += 0.006 + f.depth * 0.004;
    const p = homePoint(corals, f.home, w, h);
    // With no healthy coral left the whole school drifts restlessly through open water.
    const roam = f.roam || homeless;
    const rx = roam ? f.radius + Math.min(w * (homeless ? 0.3 : 0.12), homeless ? 420 : 160) : f.radius;
    const cx = homeless ? w / 2 : p.x;
    const tx = cx + Math.cos(f.orbit) * rx;
    const ty = roam
      ? p.y - h * 0.3 + Math.sin(f.orbit * 0.7) * h * 0.22
      : p.y + Math.sin(f.orbit) * f.radius * 0.35;
    let dx = (tx - f.x) * 0.02;
    let dy = (ty - f.y) * 0.02;
    const homeDist = Math.hypot(tx - f.x, ty - f.y);

    // Swim with neighbours: match their heading, keep a little space.
    let ax = 0, ay = 0, n = 0;
    for (const o of fish) {
      if (o === f) continue;
      const ox = o.x - f.x;
      const oy = o.y - f.y;
      const d = Math.hypot(ox, oy);
      if (d > VIEW || d < 0.01) continue;
      n++;
      ax += Math.cos(o.heading);
      ay += Math.sin(o.heading);
      if (d < SPACE) {
        const push = (SPACE - d) / SPACE;
        dx -= (ox / d) * push * 2.2;
        dy -= (oy / d) * push * 2.2;
      }
    }
    if (n) {
      dx += (ax / n) * 0.5;
      dy += (ay / n) * 0.5;
    }

    // A moving pointer scares fish away; one held still makes nearby fish curious.
    let fear = 0;
    if (pointer) {
      const px = f.x - pointer.x;
      const py = f.y - pointer.y;
      const d = Math.hypot(px, py);
      if (!pointer.still && d < FLEE && d > 0.01) {
        fear = (FLEE - d) / FLEE;
        dx += (px / d) * fear * 6;
        dy += (py / d) * fear * 6;
      } else if (pointer.still && d < CURIOUS && d > 0.01) {
        // Curiosity beats the pull of home: come within a fish-length or two, then hover there.
        dx *= 0.25;
        dy *= 0.25;
        const pull = d > 44 ? 0.8 + (1 - d / CURIOUS) * 2.4 : -1;
        dx -= (px / d) * pull;
        dy -= (py / d) * pull;
      }
    }

    // Walls: steer away well before the edge.
    const m = Math.min(56, w * 0.1, h * 0.18);
    if (f.x < m) dx += (1 - f.x / m) * 3;
    if (f.x > w - m) dx -= (1 - (w - f.x) / m) * 3;
    if (f.y < m) dy += (1 - f.y / m) * 3;
    if (f.y > h - m * 1.4) dy -= 2.5;

    // Turn toward the desired direction at a limited rate: calm fish arc, frightened ones dart.
    let want = Math.atan2(dy, dx);
    // Fish swim nearly level: keep the heading within ~35° of horizontal unless fleeing.
    if (fear < 0.2) {
      const level = Math.cos(want) >= 0 ? 0 : Math.PI;
      const tilt = angleTo(level, want);
      const max = 0.6;
      if (Math.abs(tilt) > max) want = level + Math.sign(tilt) * max;
    }
    // A calm fish reverses by turning sideways (mirroring its heading), never by pointing straight up.
    if (f.cooldown > 0) f.cooldown--;
    if (fear < 0.2 && f.cooldown === 0 && Math.cos(want) * Math.cos(f.heading) < -0.25) {
      f.heading = Math.PI - f.heading;
      f.cooldown = 90;
    }
    const maxTurn = 0.035 + fear * 0.2;
    const turn = angleTo(f.heading, want);
    f.heading += Math.max(-maxTurn, Math.min(maxTurn, turn));
    // Ease back toward level swimming once the fright has passed.
    if (fear < 0.2) {
      const level = Math.cos(f.heading) >= 0 ? 0 : Math.PI;
      const tilt = angleTo(level, f.heading);
      if (Math.abs(tilt) > 0.55) f.heading -= Math.sign(tilt) * (Math.abs(tilt) - 0.55) * 0.12;
    }
    f.facing += ((Math.cos(f.heading) >= 0 ? 1 : -1) - f.facing) * 0.14;

    // Ease the speed: drift slowly when home, cruise between corals, dart when scared.
    const cruise = 0.45 + f.depth * 0.35;
    const travel = Math.min(1, homeDist / 120) * (0.9 + f.depth * 0.5);
    const wantSpeed = cruise + travel + fear * 3.2;
    f.speed += (wantSpeed - f.speed) * (fear > 0 ? 0.15 : 0.03);

    f.x = Math.min(w - 14, Math.max(14, f.x + Math.cos(f.heading) * f.speed));
    f.y = Math.min(h - 10, Math.max(10, f.y + Math.sin(f.heading) * f.speed));
    // Tail beat follows speed: slow sweeps when idling, quick flicks when darting.
    f.phase += 0.09 + f.speed * 0.16;
  }
}

function stepBubbles(bubbles: Bubble[]) {
  for (const b of bubbles) {
    b.vy = Math.min(b.vy + 0.02, 2.2);
    b.y -= b.vy;
    b.phase += 0.12;
    b.x += Math.sin(b.phase) * 0.45;
    b.life -= 0.008;
  }
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].life <= 0 || bubbles[i].y < -10) bubbles.splice(i, 1);
}

function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: Bubble[]) {
  for (const b of bubbles) {
    ctx.globalAlpha = Math.min(1, b.life * 1.6);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
    // A thin reef-teal rim keeps bubbles visible against the pale water.
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(11,114,133,0.45)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw(ctx: CanvasRenderingContext2D, fish: Fish[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  for (const f of fish) {
    const s = f.size;
    // The body bends a little and the tail swings more: a wave travelling to the tail.
    const bend = Math.sin(f.phase) * 0.18;
    const tail = Math.sin(f.phase - 0.9) * 0.55;
    ctx.save();
    ctx.globalAlpha = 0.55 + f.depth * 0.45;
    ctx.translate(f.x, f.y);
    // Mirror for left-facing fish, then pitch the nose up or down; |facing| < 1 mid-turn narrows the fish.
    ctx.scale(f.facing, 1);
    ctx.rotate(Math.atan2(Math.sin(f.heading), Math.abs(Math.cos(f.heading))));
    ctx.fillStyle = f.color;
    // Body: head at +x, its rear half curving with `bend`.
    ctx.beginPath();
    ctx.moveTo(s * 1.5, 0);
    ctx.bezierCurveTo(s * 1.1, -s * 0.72, -s * 0.2, -s * 0.66, -s * 0.95, bend * s * 2.2 - s * 0.1);
    ctx.lineTo(-s * 0.95, bend * s * 2.2 + s * 0.1);
    ctx.bezierCurveTo(-s * 0.2, s * 0.66, s * 1.1, s * 0.72, s * 1.5, 0);
    ctx.fill();
    // Tail fin, hinged at the end of the bent body.
    ctx.translate(-s * 0.9, bend * s * 2.2);
    ctx.rotate(tail);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.55, -s * 0.2, -s * 0.95, -s * 0.7);
    ctx.quadraticCurveTo(-s * 0.7, 0, -s * 0.95, s * 0.7);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.2, 0, 0);
    ctx.fill();
    ctx.restore();
  }
}

export default function FishShoal({ className, heat = 0 }: { className?: string; heat?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wide, setWide] = useState(false);
  const corals = coralsFor(wide ? WIDE_BAND : 0);
  const heatRef = useRef(heat);
  heatRef.current = heat;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    let w = 0, h = 0;
    let fish: Fish[] = [];
    const bubbles: Bubble[] = [];
    const render = () => {
      draw(ctx, fish, w, h);
      drawBubbles(ctx, bubbles);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = wrap.getBoundingClientRect();
      const first = w === 0;
      w = r.width;
      h = r.height;
      setWide(w >= WIDE_BAND);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const list = coralsFor(w);
      if (first) fish = spawn(w, h, list);
      // Fish whose coral disappeared on a narrower band move to one that is still there.
      const homes = homesFor(list);
      for (const f of fish) if (!homes.includes(f.home)) f.home = homes[f.home % homes.length];
      render();
    };
    resize();

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rand = seeded(11);
    // The pointer is tracked page-wide, so text laid over the band does not hide it from the fish.
    let pointer: (Pointer & { moved: number }) | null = null;
    const local = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      return x >= 0 && y >= 0 && x <= r.width && y <= r.height ? { x, y } : null;
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (!p) {
        pointer = null;
        return;
      }
      const moved = !pointer || Math.hypot(p.x - pointer.x, p.y - pointer.y) > 2;
      pointer = { ...p, still: false, moved: moved ? performance.now() : pointer!.moved };
    };
    // A tap or click on open water releases a burst of bubbles (not on controls or links).
    const onDown = (e: PointerEvent) => {
      onMove(e);
      const p = local(e);
      const target = e.target as Element | null;
      if (!p || reduce || target?.closest("button, a, input, label, [data-no-bubbles]")) return;
      for (let i = 0; i < 16; i++) {
        bubbles.push({
          x: p.x + (rand() - 0.5) * 30,
          y: p.y + (rand() - 0.5) * 14,
          r: 3 + rand() * 8,
          vy: 0.4 + rand() * 0.8,
          phase: rand() * Math.PI * 2,
          life: 1,
        });
      }
    };
    const clear = () => {
      pointer = null;
    };

    let frame = 0;
    let tick = 0;
    let visible = true;
    const loop = () => {
      if (pointer) pointer.still = performance.now() - pointer.moved > STILL_MS;
      step(fish, w, h, coralsFor(w), pointer, tick++, rand, heatRef.current);
      stepBubbles(bubbles);
      render();
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!frame && !reduce && visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      // Pauses the swaying corals and the turtle too (see [data-paused] in index.css).
      wrap.toggleAttribute("data-paused", !visible);
      if (visible) start();
      else stop();
    });
    io.observe(wrap);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", clear);
    start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", clear);
    };
  }, []);

  // Warmer water tints the band as heat builds.
  const warmth = Math.min(1, heat / 12);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={cn(
        // Fade in at the top and out at the bottom, so a full-width band has no hard edges.
        "pointer-events-none overflow-hidden bg-gradient-to-b from-transparent via-[#E6F3F8]/60 to-[#D6EBF2]/80 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]",
        className,
      )}
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE2C8]/70 to-[#FFC9A8]/80 transition-opacity duration-700"
        style={{ opacity: warmth * 0.85 }}
      />
      {/* A sea turtle crosses now and then, slower than everything else. */}
      <div className="swim absolute left-0 top-[16%]" style={{ "--dur": "58s", "--delay": "-12s" } as Vars}>
        <div className="dolphin-stroke" style={{ animationDuration: "6s" }}>
          <Turtle />
        </div>
      </div>
      {corals.map((c, i) => {
        // Bleaching: the coral loses its colour toward white as heat passes its tolerance.
        const b = bleachOf(c, heat);
        return (
          <svg
            key={i}
            viewBox="0 0 120 160"
            className="absolute bottom-[4%] -translate-x-1/2 overflow-visible transition-[filter] duration-700"
            style={{
              left: `${c.x * 100}%`,
              height: `min(${c.hf * 100}%, ${c.hf * MAX_CORAL_PX}px)`,
              aspectRatio: "120 / 160",
              filter: b > 0 ? `saturate(${1 - b * 0.92}) brightness(${1 + b * 0.75})` : undefined,
            }}
          >
            <g
              className={c.sway ? "sway" : undefined}
              style={c.sway ? ({ "--dur": `${c.sway}s`, "--delay": `-${i * 1.3}s` } as Vars) : undefined}
            >
              {c.el}
            </g>
          </svg>
        );
      })}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

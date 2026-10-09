// App-promo motion for the screen recordings: a camera that zooms into the part of the UI being
// described, floating callout cards, and a 3D "product hero" float. All coordinates are in the
// recording's own 1920x1080 pixels; times are seconds from the start of the scene.
import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, display, sans } from "./theme";

export type Focus = { at: number; x: number; y: number; s: number };
export type Callout = { at: number; until: number; title: string; sub?: string; side: "left" | "right"; top: number; color?: string };

const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Camera over the recording: eases between focus keyframes, never showing past the edges. */
export const Camera: React.FC<{ keys?: Focus[]; children: React.ReactNode }> = ({ keys, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = keys?.length ? keys : [{ at: 0, x: 960, y: 540, s: 1 }];
  const t = f / fps;
  let x = k[0].x, y = k[0].y, s = k[0].s;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (t >= a.at && t <= b.at) {
      const p = interpolate(t, [a.at, b.at], [0, 1], { easing: inOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      x = a.x + (b.x - a.x) * p; y = a.y + (b.y - a.y) * p; s = a.s + (b.s - a.s) * p;
    } else if (t > b.at) { x = b.x; y = b.y; s = b.s; }
  }
  const tx = Math.min(0, Math.max(1920 - 1920 * s, 960 - x * s));
  const ty = Math.min(0, Math.max(1080 - 1080 * s, 540 - y * s));
  return (
    <div style={{ width: 1920, height: 1080, overflow: "hidden", position: "relative" }}>
      <div style={{ width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>{children}</div>
    </div>
  );
};

/** A stat card that springs out beside the browser window. */
export const CalloutCard: React.FC<{ c: Callout }> = ({ c }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: f - c.at * fps, fps, config: { damping: 14, stiffness: 160, mass: 0.7 } });
  const out = interpolate(f, [c.until * fps - 10, c.until * fps], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const o = Math.min(inS, out);
  if (o <= 0.001) return null;
  const bob = Math.sin((f - c.at * fps) / 22) * 5;
  const dir = c.side === "left" ? -1 : 1;
  const accent = c.color ?? C.high;
  return (
    <div style={{
      position: "absolute", top: c.top + bob, [c.side]: 40, zIndex: 20, opacity: o,
      transform: `translateX(${(1 - inS) * dir * 60}px) scale(${0.85 + 0.15 * inS}) rotate(${dir * (1 - inS) * 6}deg)`,
      transformOrigin: c.side === "left" ? "left center" : "right center",
      minWidth: 300, maxWidth: 380, padding: "20px 24px", borderRadius: 20, background: "rgba(255,255,255,0.97)",
      boxShadow: "0 24px 60px rgba(3,18,31,0.45)", borderLeft: `6px solid ${accent}`, fontFamily: sans,
    }}>
      <div style={{ fontFamily: display, fontSize: 38, fontWeight: 600, color: C.ink, lineHeight: 1.05, letterSpacing: -0.5 }}>{c.title}</div>
      {c.sub && <div style={{ fontSize: 21, color: C.slate, marginTop: 8, lineHeight: 1.3 }}>{c.sub}</div>}
    </div>
  );
};

/** 3D entrance for every demo clip; the hero clip keeps floating in perspective. */
export const Stage: React.FC<{ showcase?: boolean; children: React.ReactNode }> = ({ showcase, children }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
  let rx = (1 - s) * 16, ry = 0, scale = 0.9 + 0.1 * s, ty = (1 - s) * 80;
  if (showcase) {
    const settle = interpolate(f, [durationInFrames * 0.55, durationInFrames - 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
    rx = (1 - settle) * (8 + Math.sin(f / 40) * 1.5) + (1 - s) * 16;
    ry = (1 - settle) * (-16 + Math.sin(f / 55) * 2);
    scale = (0.86 + 0.14 * settle) * (0.9 + 0.1 * s);
  }
  return (
    <div style={{ perspective: 2200, perspectiveOrigin: "50% 40%" }}>
      <div style={{ transform: `translateY(${ty}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`, transformStyle: "preserve-3d", opacity: Math.min(1, s * 1.4) }}>
        {children}
      </div>
    </div>
  );
};

/** Floating stat chips orbiting the hero shot. */
export const HeroChips: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chips = [
    { t: "3,780 reefs", s: "scored from live NOAA heat", x: 60, y: 250, c: C.high, at: 0.8 },
    { t: "851 missed", s: "at risk, no NOAA alert", x: 1500, y: 200, c: C.coral, at: 1.4 },
    { t: "Every estimate explained", s: "straight from the model", x: 1430, y: 760, c: C.surf, at: 2.0 },
  ];
  const fadeOut = interpolate(f, [4.6 * fps, 5.4 * fps], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      {chips.map((c, i) => {
        const s = spring({ frame: f - c.at * fps, fps, config: { damping: 13, stiffness: 150 } });
        return (
          <div key={c.t} style={{
            position: "absolute", left: c.x, top: c.y + Math.sin((f + i * 30) / 25) * 10, zIndex: 20,
            opacity: Math.min(s, fadeOut), transform: `scale(${0.7 + 0.3 * s})`, padding: "18px 24px", borderRadius: 18,
            background: "rgba(255,255,255,0.96)", boxShadow: "0 24px 60px rgba(3,18,31,0.45)", borderLeft: `6px solid ${c.c}`, fontFamily: sans,
          }}>
            <div style={{ fontFamily: display, fontSize: 34, fontWeight: 600, color: C.ink }}>{c.t}</div>
            <div style={{ fontSize: 20, color: C.slate, marginTop: 4 }}>{c.s}</div>
          </div>
        );
      })}
    </>
  );
};

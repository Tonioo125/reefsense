import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, display, sans } from "./theme";
import type { Line } from "./timeline";

export const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Deep-water gradient with slow drifting light, for the story scenes. */
export const Ocean: React.FC<{ light?: boolean; children?: React.ReactNode }> = ({ light, children }) => {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 90) * 40;
  const bg = light
    ? `radial-gradient(1400px 900px at ${50 + drift / 20}% 0%, ${C.white} 0%, ${C.foam} 45%, ${C.shelf} 100%)`
    : `radial-gradient(1500px 1000px at ${50 + drift / 20}% -10%, #0E5E8C 0%, #073554 38%, ${C.abyss} 100%)`;
  return (
    <AbsoluteFill style={{ background: bg, fontFamily: sans, color: light ? C.ink : C.white }}>
      {!light && (
        <AbsoluteFill style={{ opacity: 0.18, mixBlendMode: "screen" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              position: "absolute", top: -200, left: 200 + i * 340 + drift * (i % 2 ? 1 : -1), width: 120, height: 1500,
              background: `linear-gradient(180deg, ${C.surf}00, ${C.surf}88 30%, ${C.surf}00 80%)`,
              transform: `rotate(${12 + i * 3}deg)`, filter: "blur(30px)",
            }} />
          ))}
        </AbsoluteFill>
      )}
      {children}
    </AbsoluteFill>
  );
};

/** Burned-in caption: the current line, faded in and out. */
export const Captions: React.FC<{ lines: Line[]; total: number; dark?: boolean }> = ({ lines, total, dark = true }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const i = lines.findLastIndex((l) => l.at <= t);
  if (i < 0) return null;
  const start = lines[i].at * fps;
  const end = (i + 1 < lines.length ? lines[i + 1].at * fps : total) - 4;
  const o = Math.min(interpolate(f, [start, start + 8], [0, 1], ease), interpolate(f, [end - 8, end], [1, 0], ease));
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", opacity: o,
      transform: `translateY(${(1 - o) * 8}px)`,
    }}>
      <div style={{
        maxWidth: 1500, padding: "14px 28px", borderRadius: 14, fontFamily: sans, fontSize: 34, lineHeight: 1.3,
        fontWeight: 500, textAlign: "center", letterSpacing: -0.2,
        color: dark ? C.white : C.ink, background: dark ? "rgba(3,18,31,0.72)" : "rgba(255,255,255,0.9)",
        boxShadow: "0 8px 30px rgba(3,18,31,0.25)",
      }}>
        {lines[i].text}
      </div>
    </div>
  );
};

/** A browser window with the address bar, around a screen recording. */
export const BrowserFrame: React.FC<{ url: string; width: number; children: React.ReactNode }> = ({ url, width, children }) => {
  const scale = width / 1920;
  const bar = 52;
  return (
    <div style={{
      width, height: 1080 * scale + bar, borderRadius: 18, overflow: "hidden", background: C.white,
      boxShadow: "0 40px 90px rgba(3,18,31,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
    }}>
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: 18, padding: "0 20px", background: "#EEF2F5", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", gap: 9 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
        </div>
        <div style={{
          flex: 1, maxWidth: 760, margin: "0 auto", height: 34, borderRadius: 17, background: C.white,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: sans, fontSize: 18, color: C.ink,
          border: `1px solid ${C.line}`,
        }}>
          <svg width="14" height="16" viewBox="0 0 14 16"><rect x="1" y="7" width="12" height="9" rx="2" fill={C.slate} /><path d="M4 7V5a3 3 0 0 1 6 0v2" stroke={C.slate} strokeWidth="2" fill="none" /></svg>
          <span><span style={{ color: C.slate }}>https://</span>{url}</span>
        </div>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
};

/** Section label shown at the top-left of a demo clip. */
export const LowerThird: React.FC<{ text: string; index: number }> = ({ text, index }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 6, fps, config: { damping: 200 } });
  return (
    <div style={{
      position: "absolute", top: 38, left: 64, display: "flex", alignItems: "center", gap: 14,
      opacity: s, transform: `translateX(${(1 - s) * -30}px)`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 20, background: C.high, color: C.white, fontFamily: sans,
        fontWeight: 700, fontSize: 19, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{index}</div>
      <div style={{ fontFamily: display, fontSize: 38, fontWeight: 500, color: C.white, letterSpacing: -0.5 }}>{text}</div>
    </div>
  );
};

export const Logo: React.FC<{ size?: number; dark?: boolean }> = ({ size = 64, dark = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.28 }}>
    <Img src={staticFile("logo-mark.png")} style={{ height: size }} />
    <span style={{ fontFamily: display, fontWeight: 500, fontSize: size * 0.72, color: dark ? C.white : C.ink, letterSpacing: -1 }}>ReefSense</span>
  </div>
);

export const fadeUp = (f: number, start: number, fps: number) => {
  const s = spring({ frame: f - start, fps, config: { damping: 200 } });
  return { opacity: s, transform: `translateY(${(1 - s) * 24}px)` };
};

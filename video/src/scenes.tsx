import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import clipMarks from "../public/clips/clips.json";
import { BrowserFrame, Captions, LowerThird, Logo, Ocean, ease, fadeUp } from "./components";
import { C, display, sans } from "./theme";
import { CalloutCard, Camera, HeroChips, Stage } from "./motion";
import { type Scene, frames } from "./timeline";

export const SITE_LABEL = "www.reefsense.online";
const REPO = "github.com/Tonioo125/reefcast";

const Big: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontFamily: display, fontWeight: 500, fontSize: 92, lineHeight: 1.05, letterSpacing: -2, textAlign: "center", ...style }}>{children}</div>
);

// --- 1. Hook ------------------------------------------------------------------------
export const Hook: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Ocean>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
        <div style={fadeUp(f, 0, fps)}><Logo size={70} /></div>
        <Big style={fadeUp(f, 20, fps)}>Most coral bleaching starts</Big>
        <Big style={{ ...fadeUp(f, 120, fps), fontStyle: "italic", fontWeight: 400, color: C.surf, marginTop: -30 }}>
          before the alarm sounds.
        </Big>
      </AbsoluteFill>
      <Captions lines={scene.lines} total={frames(scene.seconds)} />
    </Ocean>
  );
};

// --- 2. Problem ----------------------------------------------------------------------
const DhwGauge: React.FC<{ f: number }> = ({ f }) => {
  // Accumulated heat rising over 12 weeks; NOAA's Alert Level 1 line at 4 DHW.
  const grow = interpolate(f, [30, 200], [0, 1], ease);
  const W = 1100, Hh = 300, max = 8;
  const pts = Array.from({ length: 49 }, (_, i) => {
    const x = (i / 48) * W;
    const v = Math.min(3.4, 3.4 * Math.pow(i / 48, 1.6)) + Math.sin(i / 3) * 0.08;
    return [x, Hh - (v / max) * Hh] as const;
  }).filter(([x]) => x <= W * grow);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const y4 = Hh - (4 / max) * Hh;
  const flash = interpolate(f, [210, 225], [0, 1], ease);
  return (
    <svg width={W + 220} height={Hh + 60} style={{ overflow: "visible" }}>
      <line x1={0} x2={W} y1={y4} y2={y4} stroke={C.coral} strokeWidth={3} strokeDasharray="12 10" />
      <text x={W + 18} y={y4 + 8} fill={C.coral} fontFamily={sans} fontSize={26} fontWeight={600}>NOAA alert: 4 DHW</text>
      <path d={d} stroke={C.surf} strokeWidth={6} fill="none" strokeLinecap="round" />
      {pts.length > 0 && (
        <g opacity={flash}>
          <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={14} fill={C.white} />
          <text x={pts[pts.length - 1][0] - 60} y={pts[pts.length - 1][1] - 32} fill={C.white} fontFamily={sans} fontSize={28} fontWeight={600}>bleaching</text>
        </g>
      )}
      <text x={0} y={Hh + 46} fill={C.foam} opacity={0.7} fontFamily={sans} fontSize={24}>12 weeks of accumulated heat (Degree Heating Weeks)</text>
    </svg>
  );
};

export const Problem: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The picture changes with the narration: "1 in 4" on line 3, Indonesia on line 4.
  const beat2 = scene.lines[2].at * fps, beat3 = scene.lines[3].at * fps;
  const p1 = interpolate(f, [beat2 - 15, beat2], [1, 0], ease);
  const p2 = Math.min(interpolate(f, [beat2, beat2 + 15], [0, 1], ease), interpolate(f, [beat3 - 15, beat3], [1, 0], ease));
  const p3 = interpolate(f, [beat3, beat3 + 15], [0, 1], ease);
  const count = Math.round(interpolate(f, [beat2 + 10, beat2 + 70], [0, 23186], { ...ease, easing: (t) => 1 - Math.pow(1 - t, 3) }));
  return (
    <Ocean>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: p1 }}>
        <div style={{ ...fadeUp(f, 0, fps), fontFamily: display, fontSize: 60, marginBottom: 60 }}>Heat stress builds up over weeks</div>
        <DhwGauge f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: p2, gap: 26 }}>
        <div style={{ fontFamily: sans, fontSize: 40, color: C.foam }}>In {count.toLocaleString("en-US")} dive surveys</div>
        <div style={{ fontFamily: display, fontSize: 230, lineHeight: 1, color: C.surf, letterSpacing: -6 }}>1 in 4</div>
        <div style={{ fontFamily: sans, fontSize: 40, color: C.foam, maxWidth: 1200, textAlign: "center", lineHeight: 1.35 }}>
          bleaching events reached the heat at which NOAA's alerts begin.
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: p3, gap: 40 }}>
        <Big style={{ fontSize: 76 }}>Indonesia, the heart of the <span style={{ fontStyle: "italic", color: C.surf }}>Coral Triangle</span></Big>
        <div style={{ display: "flex", gap: 40 }}>
          {["Alerts that come too late", "Small restoration budgets", "No way to rank sites"].map((t, i) => (
            <div key={t} style={{
              ...fadeUp(f, beat3 + 15 + i * 12, fps), padding: "22px 34px", borderRadius: 18, fontSize: 32, fontWeight: 500,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
            }}>{t}</div>
          ))}
        </div>
      </AbsoluteFill>
      <Captions lines={scene.lines} total={frames(scene.seconds)} />
    </Ocean>
  );
};

// --- 3. Solution ---------------------------------------------------------------------
const CARDS = [
  { t: "Predict", d: "Bleaching risk for 3,780 reefs from live satellite heat stress", c: C.high },
  { t: "Explain", d: "Every estimate shows what pushed it up or down", c: C.surf },
  { t: "Prioritise", d: "A transparent ranking of where restoration will last", c: C.medium },
];
export const Solution: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Ocean>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70 }}>
        <div style={fadeUp(f, 0, fps)}><Logo size={84} /></div>
        <div style={{ display: "flex", gap: 44 }}>
          {CARDS.map((c, i) => (
            <div key={c.t} style={{
              ...fadeUp(f, 20 + i * 25, fps), width: 440, padding: "40px 38px", borderRadius: 26,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)",
            }}>
              <div style={{ width: 54, height: 6, borderRadius: 3, background: c.c, marginBottom: 26 }} />
              <div style={{ fontFamily: display, fontSize: 54, fontWeight: 500, marginBottom: 14 }}>{c.t}</div>
              <div style={{ fontSize: 29, lineHeight: 1.35, color: C.foam }}>{c.d}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
      <Captions lines={scene.lines} total={frames(scene.seconds)} />
    </Ocean>
  );
};

// --- 4. Demo clips -------------------------------------------------------------------
export const Clip: React.FC<{ scene: Scene; index: number }> = ({ scene, index }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const mark = clipMarks[scene.clip as keyof typeof clipMarks];
  const zoom = interpolate(f, [0, durationInFrames], [1, 1.02]);
  const width = 1560;
  return (
    <Ocean>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 108 }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "50% 30%" }}>
          <Stage showcase={scene.showcase}>
            <BrowserFrame url={SITE_LABEL} width={width}>
              <Camera keys={scene.focus}>
                <OffthreadVideo
                  src={staticFile(`clips/${scene.clip}.mp4`)}
                  trimBefore={Math.round((mark.startMs / 1000) * fps)}
                  muted
                  style={{ width: 1920, height: 1080 }}
                />
              </Camera>
            </BrowserFrame>
          </Stage>
        </div>
      </AbsoluteFill>
      {scene.showcase && <HeroChips />}
      {scene.callouts?.map((c) => <CalloutCard key={c.title} c={c} />)}
      <LowerThird text={scene.label ?? ""} index={index} />
      <Captions lines={scene.lines} total={frames(scene.seconds)} />
    </Ocean>
  );
};

// --- 5. How it works -----------------------------------------------------------------
const Node: React.FC<{ x: number; y: number; w: number; title: string; sub: string; color: string; at: number }> = ({ x, y, w, title, sub, color, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{
      ...fadeUp(f, at, fps), position: "absolute", left: x, top: y, width: w, padding: "24px 28px", borderRadius: 20,
      background: "rgba(255,255,255,0.08)", border: `2px solid ${color}`,
    }}>
      <div style={{ fontFamily: display, fontSize: 36, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 23, color: C.foam, marginTop: 8, lineHeight: 1.3 }}>{sub}</div>
    </div>
  );
};

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; at: number }> = ({ x1, y1, x2, y2, at }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 20], [0, 1], ease);
  const x = x1 + (x2 - x1) * p, y = y1 + (y2 - y1) * p;
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={1920} height={1080}>
      <line x1={x1} y1={y1} x2={x} y2={y} stroke={C.surf} strokeWidth={4} opacity={0.8} />
      {p > 0.98 && <circle cx={x2} cy={y2} r={7} fill={C.surf} />}
    </svg>
  );
};

export const How: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = 2.2 * fps;
  return (
    <Ocean>
      <div style={{ ...fadeUp(f, 0, fps), position: "absolute", top: 70, width: "100%", textAlign: "center", fontFamily: display, fontSize: 60 }}>How it works</div>
      <Node x={120} y={190} w={520} title="NOAA Coral Reef Watch" sub="Daily 5 km satellite heat stress, last 12 weeks" color={C.coral} at={10} />
      <Node x={120} y={425} w={520} title="Bleaching surveys" sub="23,186 labelled dive surveys, Global Coral-Bleaching Database" color={C.medium} at={25} />
      <Node x={120} y={660} w={520} title="Each reef's conditions" sub="Depth, turbidity, exposure, past heat and more" color={C.high} at={40} />
      <Arrow x1={640} y1={260} x2={800} y2={470} at={60} />
      <Arrow x1={640} y1={495} x2={800} y2={490} at={65} />
      <Arrow x1={640} y1={730} x2={800} y2={510} at={70} />
      <Node x={800} y={400} w={430} title="LightGBM model" sub="Predicts bleaching of 10% or more of colonies" color={C.surf} at={s} />
      <Arrow x1={1230} y1={470} x2={1380} y2={350} at={s + 30} />
      <Arrow x1={1230} y1={520} x2={1380} y2={640} at={s + 40} />
      <Node x={1380} y={250} w={430} title="Risk + reasons" sub="Per-feature contributions for every reef" color={C.surf} at={s + 45} />
      <Node x={1380} y={560} w={430} title="FastAPI + web map" sub="Live at www.reefsense.online" color={C.surf} at={s + 60} />
      <Captions lines={scene.lines} total={frames(scene.seconds)} />
    </Ocean>
  );
};

// --- 6. Results ----------------------------------------------------------------------
// The stress-test table from the live Insights section (data/processed/model_validation.json).
const ROWS = [
  { t: "Later years (2013–2020), unseen", m: 82, h: 78 },
  { t: "The 2016 global bleaching event", m: 77, h: 73 },
  { t: "Indonesia, never seen in training", m: 74, h: 68 },
  { t: "Japan, never seen in training", m: 76, h: 77 },
];
export const Results: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bar = (v: number, at: number) => interpolate(spring({ frame: f - at, fps, config: { damping: 200 } }), [0, 1], [0, ((v - 50) / 50) * 760]);
  return (
    <Ocean>
      <div style={{ ...fadeUp(f, 0, fps), position: "absolute", top: 64, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: display, fontSize: 58 }}>Tested on data it never saw</div>
        <div style={{ fontSize: 27, color: C.foam, marginTop: 10 }}>How often the bleached survey of a pair is ranked higher · 50% is a coin toss</div>
      </div>
      <div style={{ position: "absolute", top: 260, left: 170, right: 170 }}>
        <div style={{ display: "flex", gap: 30, marginBottom: 26, marginLeft: 560, fontSize: 25 }}>
          <span><span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 4, background: C.high, marginRight: 10 }} />ReefSense model</span>
          <span><span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 4, background: "#7C93A6", marginRight: 10 }} />Heat alone</span>
        </div>
        {ROWS.map((r, i) => {
          const at = 20 + i * 22;
          const japan = r.m < r.h;
          return (
            <div key={r.t} style={{ ...fadeUp(f, at, fps), display: "flex", alignItems: "center", marginBottom: 34 }}>
              <div style={{ width: 560, fontSize: 31, fontWeight: 500, paddingRight: 30 }}>{r.t}</div>
              <div>
                {[{ v: r.m, c: C.high }, { v: r.h, c: "#7C93A6" }].map((b, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                    <div style={{ height: 26, width: bar(b.v, at + 8 + j * 6), borderRadius: 6, background: b.c }} />
                    <div style={{ fontSize: 27, fontWeight: j === 0 ? 700 : 500, opacity: interpolate(f, [at + 25, at + 35], [0, 1], ease) }}>{b.v}%</div>
                  </div>
                ))}
              </div>
              <div style={{
                marginLeft: "auto", fontSize: 25, fontWeight: 600, color: japan ? C.medium : C.surf,
                opacity: interpolate(f, [at + 35, at + 45], [0, 1], ease),
              }}>{japan ? "Heat alone does as well" : "Model better"}</div>
            </div>
          );
        })}
      </div>
      <Captions lines={scene.lines} total={frames(scene.seconds)} />
    </Ocean>
  );
};

// --- 7. Close ------------------------------------------------------------------------
export const Close: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = (scene.lines[1].at - 0.4) * fps; // the logo arrives just before "ReefSense. See the risk..."
  return (
    <Ocean>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, opacity: interpolate(f, [end - 12, end], [1, 0], ease) }}>
        <div style={{ ...fadeUp(f, 0, fps), fontFamily: display, fontSize: 58 }}>Built for the people who protect reefs</div>
        <div style={{ display: "flex", gap: 36 }}>
          {["Restoration teams choosing sites", "Marine-park managers", "Divers and local communities"].map((t, i) => (
            <div key={t} style={{ ...fadeUp(f, 15 + i * 12, fps), padding: "22px 34px", borderRadius: 18, fontSize: 31, fontWeight: 500, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" }}>{t}</div>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, opacity: interpolate(f, [end, end + 15], [0, 1], ease) }}>
        <Logo size={96} />
        <Big style={{ fontSize: 70, fontStyle: "italic", fontWeight: 400, color: C.surf }}>See the risk before the alarm.</Big>
        <div style={{ fontSize: 36, fontWeight: 600, marginTop: 10 }}>{SITE_LABEL}</div>
        <div style={{ fontSize: 27, color: C.foam }}>{REPO} · ForgeHacks 2026 · AI + Climate</div>
        <div style={{ fontSize: 19, color: C.foam, opacity: 0.6, marginTop: 30 }}>
          Data: NOAA Coral Reef Watch · Global Coral-Bleaching Database (van Woesik &amp; Kratochwill 2022, CC BY 4.0) · Reef extent: UNEP-WCMC · Basemap © Esri
        </div>
      </AbsoluteFill>
      <Captions lines={scene.lines} total={frames(scene.seconds)} />
    </Ocean>
  );
};

// Every scene's length and every caption's timing, in one place. Captions are also the narration:
// scripts/voiceover.ts synthesises one audio file per line and Video.tsx plays it at the line's `at`
// (VOICEOVER.md is generated from here too). Times are seconds from the start of the scene. All
// numbers come from the live site and the repo (DEMO.md "Numbers you can quote").
//
// The screen recordings are paced by their narration and log "beats" (capture/record.mjs): l1, l2…
// when each line starts, plus named actions (a click, a scroll) and where the element was. The clip
// scenes below put their captions, camera moves and callouts on those beats, so they stay in sync
// with the recording; the numbers given to beatsOf() are only used until a shot has been recorded.
import clipMarks from "../public/clips/clips.json";
import { FPS, C } from "./palette";
import type { Callout, Focus } from "./motion";

/** A caption, which is also a line of narration. `say` overrides how the voice reads `text`. */
export type Line = { at: number; text: string; say?: string };
export type Scene = {
  id: string;
  kind: "hook" | "problem" | "solution" | "clip" | "how" | "results" | "close";
  /** Seconds. For clips: the recorded action length (clips.json), so nothing is cut. */
  seconds: number;
  /** Lower-third label for clips. */
  label?: string;
  clip?: string;
  lines: Line[];
  /** Camera keyframes over the recording (see motion.tsx). */
  focus?: Focus[];
  callouts?: Callout[];
  /** 3D product-hero float (first clip only), with its stat chips leaving at `chipsOut` seconds. */
  showcase?: boolean;
  chipsOut?: number;
};

export type Beat = { t: number; x?: number; y?: number };
type Mark = { startMs: number; endMs: number; beats?: Record<string, Beat> };
const MARKS: Record<string, Mark> = clipMarks;

const FULL = (at: number): Focus => ({ at, x: 960, y: 540, s: 1 });
const clip = (name: string) => (MARKS[name].endMs - MARKS[name].startMs) / 1000;

/** Beat times of a recorded shot (`defaults` until it has been recorded). */
function beatsOf<K extends string>(name: string, defaults: Record<K, number>): Record<K, number> {
  const got = MARKS[name]?.beats ?? {};
  return Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, got[k]?.t ?? v])) as Record<K, number>;
}
/** Where a beat's element was on screen (in the recording's own pixels). */
const spot = (name: string, key: string, x: number, y: number) => ({
  x: MARKS[name]?.beats?.[key]?.x ?? x,
  y: MARKS[name]?.beats?.[key]?.y ?? y,
});

const HERO = beatsOf("01-hero", { l1: 0.3, explore: 5.15 });
const GAP = beatsOf("02-noaa-gap", { l1: 0.3, highlight: 2.05, l2: 4.6, l3: 11.3, crystal: 12.1 });
const REEF = beatsOf("03-reef", { l1: 0.1, plain: 2.85, l2: 4.3, expert: 9.5, l3: 10.9, l4: 16.0, reasons: 17.7, l5: 20.0 });
const DASH = beatsOf("04-dashboard", {
  l1: 0.4, tools: 0.4, legend: 3.1, l2: 6.2, support: 7.0, orgs: 7.8, disclaimer: 9.6,
  l3: 13.5, surveys: 13.5, news: 15.7, l4: 17.9, imagery: 17.9,
});
const RESTORE = beatsOf("05-restore", { l1: 0.3, l2: 5.0, drag: 5.0, l3: 9.8 });
const HEAT = beatsOf("06-heat", { l1: 0.3, hot: 2.6, hotEnd: 6.7, l2: 7.2, l3: 12.1, cool: 12.1 });
const SKILL = beatsOf("07-skill", { l1: 0.3, table: 2.6, l2: 8.4, japan: 9.6 });
const ACT = beatsOf("08-act", { l1: 0.3 });

// Dashboard camera targets. The panel is the right-hand 420 px; keeping y >= 470 keeps the floating
// navbar out of the zoomed view.
const dashSpot = (key: string, x: number, y: number) => spot("04-dashboard", key, x, y);
const panelY = (key: string, y: number) => Math.max(470, dashSpot(key, 1690, y).y);
const tools = dashSpot("tools", 263, 142), legend = dashSpot("legend", 184, 819);

export const SCENES: Scene[] = [
  {
    id: "hook", kind: "hook", seconds: 9,
    lines: [
      { at: 0.4, text: "Coral reefs bleach when the ocean stays too hot for too long." },
      { at: 4.6, text: "And most bleaching starts before the alarm sounds." },
    ],
  },
  {
    // Problem.tsx changes picture at lines 3 and 4.
    id: "problem", kind: "problem", seconds: 25.5,
    lines: [
      { at: 0.3, text: "Scientists track heat stress in Degree Heating Weeks: how hot the water has been, and for how long." },
      { at: 5.7, text: "NOAA's alerts start escalating at 4 Degree Heating Weeks." },
      { at: 9.3, text: "But in 23,186 dive surveys, that level was reached in only about 1 in 4 bleaching events." },
      { at: 17.3, text: "In Indonesia, at the heart of the Coral Triangle, restoration teams have small budgets and need to know where their work will last." },
    ],
  },
  {
    id: "solution", kind: "solution", seconds: 12,
    lines: [
      { at: 0.3, text: "ReefSense uses AI to estimate bleaching risk for 3,780 reefs, explains every estimate," },
      { at: 7.5, text: "and ranks where restoration effort is most likely to last." },
    ],
  },
  {
    id: "hero", kind: "clip", clip: "01-hero", seconds: clip("01-hero"), label: "Live at reefsense.online",
    showcase: true, chipsOut: HERO.explore - 0.75,
    lines: [{ at: HERO.l1, text: "This is the live site. One click takes you to the map." }],
  },
  {
    id: "gap", kind: "clip", clip: "02-noaa-gap", seconds: clip("02-noaa-gap"), label: "The NOAA gap",
    focus: [
      FULL(0), FULL(GAP.highlight - 0.85),
      { at: GAP.highlight + 0.35, x: 560, y: 260, s: 1.75 }, { at: GAP.l2 + 0.7, x: 560, y: 260, s: 1.75 },
      { at: GAP.l2 + 2.1, x: 760, y: 520, s: 1.05 }, FULL(GAP.crystal - 0.4),
      { at: GAP.crystal + 1.2, x: 1700, y: 430, s: 1.55 },
    ],
    callouts: [
      { at: GAP.highlight + 0.95, until: GAP.l2 + 4.0, title: "851 reefs", sub: "at elevated risk, but NOAA's alerts stayed silent for 12 weeks", side: "left", top: 420, color: C.coral },
      { at: GAP.crystal + 2.0, until: clip("02-noaa-gap"), title: "Crystal Bay · 86%", sub: "case study: Nusa Penida, Bali", side: "left", top: 560, color: C.high },
    ],
    lines: [
      { at: GAP.l1, text: "Every reef is scored from the last 12 weeks of NOAA satellite heat stress." },
      { at: GAP.l2, text: "851 reefs are at elevated risk right now, yet NOAA's alerts stayed silent for 12 weeks." },
      { at: GAP.l3, text: "Our case study: Crystal Bay, Nusa Penida, in Bali." },
    ],
  },
  {
    id: "reef", kind: "clip", clip: "03-reef", seconds: clip("03-reef"), label: "Explainable AI",
    focus: [
      FULL(0), { at: 1.6, x: 1690, y: 470, s: 1.6 }, { at: REEF.expert + 0.2, x: 1690, y: 470, s: 1.6 },
      { at: REEF.expert + 1.7, x: 1690, y: 620, s: 1.45 },
    ],
    callouts: [
      { at: REEF.l2 + 0.35, until: REEF.expert, title: "Plain language", sub: "every estimate explains itself", side: "left", top: 380, color: C.surf },
      { at: REEF.l4 + 0.4, until: REEF.l5, title: "The model's reasons", sub: "what raised this estimate, and what lowered it", side: "left", top: 440, color: C.high },
      { at: REEF.l5 + 0.3, until: clip("03-reef"), title: "Not a chatbot", sub: "contributions come straight from the trained LightGBM model", side: "left", top: 600, color: C.medium },
    ],
    lines: [
      { at: REEF.l1, text: "An 86% chance Crystal Bay avoids significant bleaching." },
      { at: REEF.l2, text: "Plain language: every estimate explains itself, for scientists and for everyone else." },
      { at: REEF.l3, text: "The expert view adds the satellite heat record and a what-if heat scenario..." },
      { at: REEF.l4, text: "...and the model's reasons: what pushed this estimate up, and what pulled it down." },
      { at: REEF.l5, text: "These come straight from the trained model, not from a chatbot." },
    ],
  },
  {
    // A tour of the rest of the reef dashboard: map tools, the donation links, field record and news,
    // and the reef imagery (satellite view + community photos).
    id: "dashboard", kind: "clip", clip: "04-dashboard", seconds: clip("04-dashboard"), label: "Inside the dashboard",
    focus: [
      FULL(0),
      { at: DASH.tools + 0.6, ...tools, s: 1.45 },
      { at: DASH.legend - 0.2, ...tools, s: 1.45 },
      { at: DASH.legend + 0.9, ...legend, s: 1.45 },
      { at: DASH.support - 0.5, ...legend, s: 1.45 },
      { at: DASH.support + 0.9, x: 1690, y: panelY("orgs", 455), s: 1.6 },
      { at: DASH.disclaimer, x: 1690, y: panelY("orgs", 455), s: 1.6 },
      { at: DASH.disclaimer + 1.0, x: 1690, y: panelY("disclaimer", 570), s: 1.6 },
      { at: DASH.surveys + 0.2, x: 1690, y: panelY("disclaimer", 570), s: 1.6 },
      { at: DASH.surveys + 1.6, x: 1690, y: panelY("surveys", 480), s: 1.6 },
      { at: DASH.news, x: 1690, y: panelY("surveys", 480), s: 1.6 },
      { at: DASH.news + 1.0, x: 1690, y: panelY("news", 577), s: 1.6 },
      { at: DASH.imagery + 0.1, x: 1690, y: panelY("news", 577), s: 1.6 },
      { at: DASH.imagery + 1.5, x: 1690, y: panelY("imagery", 620), s: 1.5 },
    ],
    callouts: [
      { at: DASH.tools + 1.0, until: DASH.l2, title: "Map + report", sub: "filter by resilience, or colour reefs by coral cover", side: "right", top: 380, color: C.surf },
      { at: DASH.support + 1.2, until: DASH.l3, title: "Support reef conservation", sub: "local groups like the Coral Triangle Center, Nusa Penida · ReefSense never handles donations", side: "left", top: 380, color: C.coral },
      { at: DASH.surveys + 1.5, until: DASH.l4, title: "Field record + news", sub: "past bleaching surveys nearby, coral stories from the region", side: "left", top: 440, color: C.medium },
      { at: DASH.imagery + 1.4, until: clip("04-dashboard"), title: "Reef imagery", sub: "satellite view and openly licensed iNaturalist photos", side: "left", top: 500, color: C.high },
    ],
    lines: [
      { at: DASH.l1, text: "The dashboard: every reef on the map, its report alongside. Filter it, or colour it by coral cover." },
      { at: DASH.l2, text: "Support reef conservation lists hand-picked local groups and their own donation pages. ReefSense never handles the money." },
      { at: DASH.l3, text: "Further down: past bleaching surveys nearby, and coral news from the region." },
      { at: DASH.l4, text: "And reef imagery: a satellite view, plus openly licensed community photos from iNaturalist." },
    ],
  },
  {
    id: "restore", kind: "clip", clip: "05-restore", seconds: clip("05-restore"), label: "Where to restore first",
    focus: [
      FULL(0), FULL(RESTORE.drag - 1.4), { at: RESTORE.drag - 0.1, x: 600, y: 640, s: 1.6 },
      { at: RESTORE.l3 - 0.5, x: 600, y: 640, s: 1.6 }, { at: RESTORE.l3 + 0.9, x: 1160, y: 680, s: 1.3 },
    ],
    callouts: [
      { at: RESTORE.l2 + 0.4, until: RESTORE.l3, title: "Your weights", sub: "more weight on healthy coral cover", side: "right", top: 300, color: C.medium },
      { at: RESTORE.l3 + 0.3, until: clip("05-restore"), title: "Ranking updates live", sub: "reefs without a dive survey are left out, not guessed", side: "left", top: 520, color: C.high },
    ],
    lines: [
      { at: RESTORE.l1, text: "Restoration takes years, so this ranks reefs where effort is most likely to last." },
      { at: RESTORE.l2, text: "Give more weight to healthy coral cover, and the ranking updates. The weights are yours." },
      { at: RESTORE.l3, text: "Reefs without a dive survey are left out, not guessed." },
    ],
  },
  {
    id: "heat", kind: "clip", clip: "06-heat", seconds: clip("06-heat"), label: "What if the water gets hotter?",
    focus: [
      FULL(0), FULL(HEAT.hot - 1.2), { at: HEAT.hot, x: 600, y: 460, s: 1.75 }, { at: HEAT.hotEnd + 0.3, x: 600, y: 460, s: 1.75 },
      { at: HEAT.hotEnd + 1.7, x: 960, y: 600, s: 1.05 }, { at: HEAT.cool + 0.8, x: 960, y: 600, s: 1.05 }, FULL(HEAT.cool + 2.4),
    ],
    callouts: [
      { at: HEAT.l2 + 0.2, until: HEAT.cool + 0.5, title: "8 DHW", sub: "branching corals bleach first, and the fish leave", side: "right", top: 380, color: C.coral },
      { at: HEAT.cool + 2.4, until: clip("06-heat"), title: "Cooled back down", sub: "an illustration of how bleaching spreads", side: "right", top: 480, color: C.high },
    ],
    lines: [
      { at: HEAT.l1, text: "What does more heat do to a reef?" },
      { at: HEAT.l2, text: "At 8 Degree Heating Weeks, branching corals bleach first and the fish leave." },
      { at: HEAT.l3, text: "Cool it back down, and the reef recovers in the illustration. It is a picture of how bleaching spreads, not a forecast." },
    ],
  },
  {
    id: "skill", kind: "clip", clip: "07-skill", seconds: clip("07-skill"), label: "Tested on data it never saw",
    focus: [FULL(0), FULL(SKILL.table - 0.4), { at: SKILL.table + 1.0, x: 760, y: 560, s: 1.25 }, { at: SKILL.japan + 3, x: 760, y: 620, s: 1.3 }],
    callouts: [
      { at: SKILL.table + 1.2, until: SKILL.l2, title: "75% vs 68%", sub: "model vs ocean heat alone", side: "right", top: 340, color: C.high },
      { at: SKILL.l2 + 0.2, until: clip("07-skill"), title: "Honest about Japan", sub: "there, heat alone does as well", side: "right", top: 500, color: C.medium },
    ],
    lines: [
      { at: SKILL.l1, text: "Shown two surveys where only one bleached, the model picks the bleached survey 75% of the time. Heat alone: 68%." },
      { at: SKILL.l2, text: "In Japan, heat alone does as well, and we show that too." },
    ],
  },
  {
    id: "act", kind: "clip", clip: "08-act", seconds: clip("08-act"), label: "What you can do",
    lines: [{ at: ACT.l1, text: "And anyone can act: report what you see, back protected reefs, share a reef." }],
  },
  {
    id: "how", kind: "how", seconds: 16,
    lines: [
      { at: 0.3, text: "Under the hood: live NOAA heat stress, 23,186 labelled dive surveys and each reef's own conditions..." },
      { at: 8.1, text: "...feed a LightGBM model. Its per-feature contributions are the explanations you just saw." },
    ],
  },
  {
    id: "results", kind: "results", seconds: 14,
    lines: [
      { at: 0.3, text: "We tested it the hard way: on later years, the 2016 global bleaching event, and an Indonesia it never saw." },
      { at: 8, text: "It beats heat alone in each, except Japan. We report that too." },
    ],
  },
  {
    // Close.tsx swaps to the logo just before line 2.
    id: "close", kind: "close", seconds: 11.5,
    lines: [
      { at: 0.3, text: "Built for restoration teams choosing sites, and marine-park managers deciding where to look first." },
      { at: 6.3, text: "ReefSense. See the risk before the alarm." },
    ],
  },
];

export const TRANSITION = 15; // frames

export const frames = (s: number) => Math.round(s * FPS);
export const sceneFrames = (s: Scene) => frames(s.seconds);
export const TOTAL = SCENES.reduce((n, s) => n + sceneFrames(s), 0) - TRANSITION * (SCENES.length - 1);
/** First frame of each scene in the finished video (scenes overlap by TRANSITION). */
export const SCENE_START: Record<string, number> = Object.fromEntries(
  SCENES.map((s, i) => [s.id, SCENES.slice(0, i).reduce((n, p) => n + sceneFrames(p), 0) - TRANSITION * i]),
);

// Every scene's length and every caption's timing, in one place. Captions are also the narration:
// scripts/voiceover.ts synthesises one audio file per line and Video.tsx plays it at the line's `at`
// (VOICEOVER.md is generated from here too). Times are seconds from the start of the scene. All
// numbers come from the live site and the repo (DEMO.md "Numbers you can quote").
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
  /** 3D product-hero float (first clip only). */
  showcase?: boolean;
};

/** A moment logged by capture/record.mjs: seconds into the shot, and where the element was on screen. */
export type Beat = { t: number; x?: number; y?: number };
type Mark = { startMs: number; endMs: number; beats?: Record<string, Beat> };
const MARKS: Record<string, Mark> = clipMarks;

const FULL = (at: number): Focus => ({ at, x: 960, y: 540, s: 1 });

const clip = (name: string) => (MARKS[name].endMs - MARKS[name].startMs) / 1000;

// The dashboard shot paces itself to its narration (record.mjs waits for each line to finish), so its
// lines and camera follow the beats it logged. These defaults are only used before it is recorded.
const DASH_DEFAULT: Record<string, Beat> = {
  tools: { t: 0.6, x: 330, y: 142 }, legend: { t: 3.6, x: 130, y: 880 },
  support: { t: 6.4, x: 1600, y: 300 }, orgs: { t: 7.3, x: 1690, y: 430 },
  disclaimer: { t: 9.9, x: 1690, y: 560 }, surveys: { t: 13.7, x: 1690, y: 500 },
  news: { t: 15.9, x: 1690, y: 600 }, imagery: { t: 18.1, x: 1690, y: 560 },
};
const D = { ...DASH_DEFAULT, ...MARKS["04-dashboard"]?.beats };
const dashY = (b: Beat, fallback: number) => Math.round(b.y ?? fallback);

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
    showcase: true,
    lines: [{ at: 0.3, text: "This is the live site. One click takes you to the map." }],
  },
  {
    id: "gap", kind: "clip", clip: "02-noaa-gap", seconds: clip("02-noaa-gap"), label: "The NOAA gap",
    focus: [FULL(0), FULL(1.2), { at: 2.4, x: 560, y: 260, s: 1.75 }, { at: 6.2, x: 560, y: 260, s: 1.75 }, { at: 7.6, x: 760, y: 520, s: 1.05 }, FULL(12.6), { at: 14.2, x: 1700, y: 430, s: 1.55 }],
    callouts: [
      { at: 3.0, until: 9.5, title: "851 reefs", sub: "at elevated risk, but NOAA's alerts stayed silent for 12 weeks", side: "left", top: 420, color: C.coral },
      { at: 15.2, until: 21.5, title: "Crystal Bay · 86%", sub: "case study: Nusa Penida, Bali", side: "left", top: 560, color: C.high },
    ],
    lines: [
      { at: 0.3, text: "Every reef is scored from the last 12 weeks of NOAA satellite heat stress." },
      { at: 5.5, text: "851 reefs are at elevated risk right now, yet NOAA's alerts stayed silent for 12 weeks." },
      { at: 13.5, text: "Our case study: Crystal Bay, Nusa Penida, in Bali." },
    ],
  },
  {
    id: "reef", kind: "clip", clip: "03-reef", seconds: clip("03-reef"), label: "Explainable AI",
    focus: [FULL(0), { at: 1.6, x: 1690, y: 470, s: 1.6 }, { at: 9.5, x: 1690, y: 470, s: 1.6 }, { at: 11, x: 1690, y: 620, s: 1.45 }, { at: 30, x: 1690, y: 620, s: 1.45 }],
    callouts: [
      { at: 4.6, until: 10, title: "Plain language", sub: "every estimate explains itself", side: "left", top: 380, color: C.surf },
      { at: 19.4, until: 26.4, title: "The model's reasons", sub: "what raised this estimate, and what lowered it", side: "left", top: 440, color: C.high },
      { at: 26.8, until: 33.5, title: "Not a chatbot", sub: "contributions come straight from the trained LightGBM model", side: "left", top: 600, color: C.medium },
    ],
    lines: [
      { at: 0.1, text: "An 86% chance Crystal Bay avoids significant bleaching." },
      { at: 4.35, text: "Plain language: every estimate explains itself, for scientists and for everyone else." },
      { at: 10, text: "The expert view adds the satellite heat record and a what-if heat scenario..." },
      { at: 19, text: "...and the model's reasons: what pushed this estimate up, and what pulled it down." },
      { at: 26.5, text: "These come straight from the trained model, not from a chatbot." },
    ],
  },
  {
    // A tour of the rest of the reef dashboard: map tools, the donation links, field record and news,
    // and the reef imagery (satellite view + community photos).
    id: "dashboard", kind: "clip", clip: "04-dashboard", seconds: clip("04-dashboard"), label: "Inside the dashboard",
    focus: [
      FULL(0),
      { at: D.tools.t + 0.2, x: D.tools.x ?? 330, y: dashY(D.tools, 142), s: 1.45 },
      { at: D.legend.t - 0.3, x: D.tools.x ?? 330, y: dashY(D.tools, 142), s: 1.45 },
      { at: D.legend.t + 0.9, x: D.legend.x ?? 130, y: dashY(D.legend, 880), s: 1.45 },
      { at: D.support.t - 0.1, x: D.legend.x ?? 130, y: dashY(D.legend, 880), s: 1.45 },
      { at: D.support.t + 1.3, x: 1690, y: dashY(D.orgs, 430), s: 1.6 },
      { at: D.disclaimer.t, x: 1690, y: dashY(D.orgs, 430), s: 1.6 },
      { at: D.disclaimer.t + 1.0, x: 1690, y: dashY(D.disclaimer, 560), s: 1.6 },
      { at: D.surveys.t + 0.2, x: 1690, y: dashY(D.disclaimer, 560), s: 1.6 },
      { at: D.surveys.t + 1.8, x: 1690, y: dashY(D.surveys, 500), s: 1.6 },
      { at: D.news.t, x: 1690, y: dashY(D.surveys, 500), s: 1.6 },
      { at: D.news.t + 1.0, x: 1690, y: dashY(D.news, 600), s: 1.6 },
      { at: D.imagery.t + 0.1, x: 1690, y: dashY(D.news, 600), s: 1.6 },
      { at: D.imagery.t + 1.5, x: 1690, y: dashY(D.imagery, 560), s: 1.5 },
    ],
    callouts: [
      { at: D.tools.t + 0.8, until: D.support.t, title: "Map + report", sub: "filter by resilience, or colour reefs by coral cover", side: "right", top: 380, color: C.surf },
      { at: D.support.t + 1.2, until: D.surveys.t, title: "Support reef conservation", sub: "local groups like the Coral Triangle Center, Nusa Penida · ReefSense never handles donations", side: "left", top: 380, color: C.coral },
      { at: D.surveys.t + 1.6, until: D.imagery.t, title: "Field record + news", sub: "past bleaching surveys nearby, coral stories from the region", side: "left", top: 440, color: C.medium },
      { at: D.imagery.t + 1.4, until: clip("04-dashboard"), title: "Reef imagery", sub: "satellite view and openly licensed iNaturalist photos", side: "left", top: 500, color: C.high },
    ],
    lines: [
      { at: D.tools.t, text: "The dashboard: every reef on the map, its report alongside. Filter it, or colour it by coral cover." },
      { at: D.support.t, text: "Support reef conservation lists hand-picked local groups and their own donation pages. ReefSense never handles the money." },
      { at: D.surveys.t, text: "Further down: past bleaching surveys nearby, and coral news from the region." },
      { at: D.imagery.t, text: "And reef imagery: a satellite view, plus openly licensed community photos from iNaturalist." },
    ],
  },
  {
    id: "restore", kind: "clip", clip: "05-restore", seconds: clip("05-restore"), label: "Where to restore first",
    focus: [FULL(0), FULL(2.6), { at: 4.0, x: 600, y: 640, s: 1.6 }, { at: 10.2, x: 600, y: 640, s: 1.6 }, { at: 11.6, x: 1160, y: 680, s: 1.3 }, { at: 16, x: 1160, y: 680, s: 1.3 }],
    callouts: [
      { at: 5.4, until: 10.6, title: "Your weights", sub: "more weight on healthy coral cover", side: "right", top: 300, color: C.medium },
      { at: 11.8, until: 16, title: "Ranking updates live", sub: "reefs without a dive survey are left out, not guessed", side: "left", top: 520, color: C.high },
    ],
    lines: [
      { at: 0.3, text: "Restoration takes years, so this ranks reefs where effort is most likely to last." },
      { at: 6, text: "Give more weight to healthy coral cover, and the ranking updates. The weights are yours." },
      { at: 11.5, text: "Reefs without a dive survey are left out, not guessed." },
    ],
  },
  {
    id: "heat", kind: "clip", clip: "06-heat", seconds: clip("06-heat"), label: "What if the water gets hotter?",
    focus: [FULL(0), FULL(3.4), { at: 4.6, x: 600, y: 460, s: 1.75 }, { at: 8.8, x: 600, y: 460, s: 1.75 }, { at: 10.2, x: 960, y: 600, s: 1.05 }, { at: 13, x: 960, y: 600, s: 1.05 }, FULL(15)],
    callouts: [
      { at: 10.2, until: 14.2, title: "8 DHW", sub: "branching corals bleach first, and the fish leave", side: "right", top: 380, color: C.coral },
      { at: 15.6, until: 23.5, title: "Cooled back down", sub: "an illustration of how bleaching spreads", side: "right", top: 480, color: C.high },
    ],
    lines: [
      { at: 0.3, text: "What does more heat do to a reef?" },
      { at: 9.6, text: "At 8 Degree Heating Weeks, branching corals bleach first and the fish leave." },
      { at: 14, text: "Cool it back down, and the reef recovers in the illustration. It is a picture of how bleaching spreads, not a forecast." },
    ],
  },
  {
    id: "skill", kind: "clip", clip: "07-skill", seconds: clip("07-skill"), label: "Tested on data it never saw",
    focus: [FULL(0), FULL(2.2), { at: 3.6, x: 760, y: 560, s: 1.25 }, { at: 12.5, x: 760, y: 620, s: 1.3 }],
    callouts: [
      { at: 3.8, until: 8.2, title: "75% vs 68%", sub: "model vs ocean heat alone", side: "right", top: 340, color: C.high },
      { at: 8.4, until: 12.5, title: "Honest about Japan", sub: "there, heat alone does as well", side: "right", top: 500, color: C.medium },
    ],
    lines: [
      { at: 0.3, text: "Shown two surveys where only one bleached, the model picks the bleached survey 75% of the time. Heat alone: 68%." },
      { at: 8.3, text: "In Japan, heat alone does as well, and we show that too." },
    ],
  },
  {
    id: "act", kind: "clip", clip: "08-act", seconds: clip("08-act"), label: "What you can do",
    lines: [{ at: 0.3, text: "And anyone can act: report what you see, back protected reefs, share a reef." }],
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

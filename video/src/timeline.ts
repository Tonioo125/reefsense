// Every scene's length and every caption's timing, in one place, so the video can be re-timed to a
// recorded voiceover. Captions are also the narration script (VOICEOVER.md is generated from them).
// Times are seconds from the start of the scene. All numbers come from the live site and the repo
// (DEMO.md "Numbers you can quote").
import clipMarks from "../public/clips/clips.json";
import { FPS, C } from "./theme";
import type { Callout, Focus } from "./motion";

export type Line = { at: number; text: string };
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

const FULL = (at: number): Focus => ({ at, x: 960, y: 540, s: 1 });

const clip = (name: keyof typeof clipMarks) => (clipMarks[name].endMs - clipMarks[name].startMs) / 1000;

export const SCENES: Scene[] = [
  {
    id: "hook", kind: "hook", seconds: 9,
    lines: [
      { at: 0.4, text: "Coral reefs bleach when the ocean stays too hot for too long." },
      { at: 4.6, text: "And most bleaching starts before the alarm sounds." },
    ],
  },
  {
    id: "problem", kind: "problem", seconds: 25,
    lines: [
      { at: 0.3, text: "Scientists track heat stress in Degree Heating Weeks: how hot the water has been, and for how long." },
      { at: 7.5, text: "NOAA's alerts start escalating at 4 Degree Heating Weeks." },
      { at: 12, text: "But in 23,186 dive surveys, that level was reached in only about 1 in 4 bleaching events." },
      { at: 18.5, text: "In Indonesia, at the heart of the Coral Triangle, restoration teams have small budgets and need to know where their work will last." },
    ],
  },
  {
    id: "solution", kind: "solution", seconds: 12,
    lines: [
      { at: 0.3, text: "ReefSense uses AI to estimate bleaching risk for 3,780 reefs, explains every estimate," },
      { at: 6.2, text: "and ranks where restoration effort is most likely to last." },
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
      { at: 0.3, text: "An 86% chance Crystal Bay avoids significant bleaching under recent heat." },
      { at: 4.2, text: "Plain language: every estimate explains itself, for scientists and for everyone else." },
      { at: 10, text: "The expert view adds the satellite heat record and a what-if heat scenario..." },
      { at: 19, text: "...and the model's reasons: what pushed this estimate up, and what pulled it down." },
      { at: 26.5, text: "These come straight from the trained model, not from a chatbot." },
    ],
  },
  {
    id: "restore", kind: "clip", clip: "04-restore", seconds: clip("04-restore"), label: "Where to restore first",
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
    id: "heat", kind: "clip", clip: "05-heat", seconds: clip("05-heat"), label: "What if the water gets hotter?",
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
    id: "skill", kind: "clip", clip: "06-skill", seconds: clip("06-skill"), label: "Tested on data it never saw",
    focus: [FULL(0), FULL(2.2), { at: 3.6, x: 760, y: 560, s: 1.25 }, { at: 12.5, x: 760, y: 620, s: 1.3 }],
    callouts: [
      { at: 3.8, until: 7.4, title: "75% vs 68%", sub: "model vs ocean heat alone", side: "right", top: 340, color: C.high },
      { at: 7.6, until: 12.5, title: "Honest about Japan", sub: "there, heat alone does as well", side: "right", top: 500, color: C.medium },
    ],
    lines: [
      { at: 0.3, text: "Shown two surveys where only one bleached, the model picks the bleached one 75% of the time. Heat alone: 68%." },
      { at: 6.8, text: "In Japan, heat alone does as well, and we show that too." },
    ],
  },
  {
    id: "act", kind: "clip", clip: "07-act", seconds: clip("07-act"), label: "What you can do",
    lines: [{ at: 0.3, text: "And anyone can act: report what you see, back protected reefs, share a reef." }],
  },
  {
    id: "how", kind: "how", seconds: 16,
    lines: [
      { at: 0.3, text: "Under the hood: live NOAA heat stress, 23,186 labelled dive surveys and each reef's own conditions..." },
      { at: 7.5, text: "...feed a LightGBM model. Its per-feature contributions are the explanations you just saw." },
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
    id: "close", kind: "close", seconds: 11,
    lines: [
      { at: 0.3, text: "Built for restoration teams choosing sites, and marine-park managers deciding where to look first." },
      { at: 6, text: "ReefSense. See the risk before the alarm." },
    ],
  },
];

export const TRANSITION = 15; // frames

export const frames = (s: number) => Math.round(s * FPS);
export const sceneFrames = (s: Scene) => frames(s.seconds) + (s.kind === "clip" ? 0 : 0);
export const TOTAL = SCENES.reduce((n, s) => n + sceneFrames(s), 0) - TRANSITION * (SCENES.length - 1);

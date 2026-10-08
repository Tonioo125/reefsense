/**
 * ReefSense colour palette: the single source of truth for every hex value.
 * Used by tailwind.config.js (Tailwind tokens), src/lib/reef.ts (map, legend, charts) and
 * components that need hex in SVG/canvas attributes. src/index.css mirrors these as RGB
 * CSS variables; src/lib/palette.test.ts keeps the two in sync.
 *
 * Light world around a deep-water hero: the page is daylight on the surface, the hero is the
 * reef below it.
 *  - ground: the page. white: cards and panels. shelf: muted fills. line: hairline borders.
 *  - ink: primary text, the deep navy of the hero. slate: secondary text at 14px and up;
 *    slateStrong: small text (>= 4.5:1 on white and shelf).
 *  - ocean: filled actions (white text). reef: text-safe accent for links and italic accents.
 *  - coral: heat and risk fills; coralText for coral words.
 *  - abyss, foam, surf: the hero's own colours, used on the photo only.
 * Import-free on purpose: tailwind.config.js loads this file directly.
 */
export const PALETTE = {
  ground: "#F3F8FB",
  white: "#FFFFFF",
  shelf: "#E7F0F6",
  line: "#D3E2EC",
  current: "#9DBBD0",
  ink: "#0A2540",
  slate: "#4A6378",
  slateStrong: "#3B5468",
  ocean: "#0E5E8C",
  oceanStrong: "#0A4A70",
  reef: "#0B7285",
  coral: "#E8603F",
  coralSoft: "#FDECE6",
  coralText: "#B2432A",
  abyss: "#03121F",
  foam: "#EAF5FB",
  surf: "#5CDBE8",
} as const;

/** Reef teal (high), sand (medium), coral (low): the data scale shares the page's world. */
export const RESILIENCE = {
  High: { base: "#1E9E8F", soft: "#DDF1EE", text: "#14655C" },
  Medium: { base: "#E3B55B", soft: "#FAF1DE", text: "#6B4E12" },
  Low: { base: "#E2593B", soft: "#FCE6DF", text: "#9A3A22" },
} as const;

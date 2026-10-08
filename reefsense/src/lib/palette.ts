/**
 * ReefSense colour palette: the single source of truth for every hex value.
 * Used by tailwind.config.js (Tailwind tokens), src/lib/reef.ts (map, legend, charts) and
 * components that need hex in SVG/canvas attributes. src/index.css mirrors these as RGB
 * CSS variables; src/lib/palette.test.ts keeps the two in sync.
 *
 * Derived shades (not in the brand spec; added for WCAG AA text contrast):
 *  - tealStrong #007A7A: Bright Teal darkened, 5.2:1 on white. Small teal text, links,
 *    hover/pressed states, filled controls with labels under 14px.
 *  - seaGrayStrong #4E727A: Sea Gray darkened, 5.0:1 on Ice Ocean. Muted text under 14px.
 *  - border #D1EFEF: Bright Teal at 18% on white. Thin aqua-tinted borders.
 *  - RESILIENCE soft/text: 16–18% tints and 35% darkened shades of the resilience colours
 *    (Medium uses Deep Teal text) for pills and signed values.
 * Import-free on purpose: tailwind.config.js loads this file directly.
 */
export const PALETTE = {
  iceOcean: "#F5FCFC",
  softAqua: "#E6F8F8",
  brightTeal: "#00A6A6",
  tealStrong: "#007A7A",
  oceanBlue: "#2196C8",
  aqua: "#4DD9D9",
  skyBlue: "#7DDFF2",
  deepTeal: "#164E5A",
  seaGray: "#668B93",
  seaGrayStrong: "#4E727A",
  coral: "#FF8066",
  coralSoft: "#FFE5DE",
  border: "#D1EFEF",
  white: "#FFFFFF",
} as const;

export const RESILIENCE = {
  High: { base: "#2E9B72", soft: "#DEEFE8", text: "#1E654A" },
  Medium: { base: "#E0B84C", soft: "#F9F2DF", text: "#164E5A" },
  Low: { base: "#D95C5C", soft: "#F9E5E5", text: "#8D3C3C" },
} as const;

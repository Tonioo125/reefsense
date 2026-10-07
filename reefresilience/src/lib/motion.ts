/**
 * Pure motion helpers shared by the scroll-reveal, count-up and parallax hooks.
 * No React here, so the maths is unit-testable in the node test environment.
 */

/** The ease-out curve used across the site's transitions. */
export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const easeOutCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;

/** The value shown at `progress` (0..1) of a count from `from` to `to`. */
export const countUpValue = (from: number, to: number, progress: number) =>
  from + (to - from) * easeOutCubic(progress);

/** Vertical drift for a parallax layer, clamped so it never strays far. */
export const parallaxOffset = (scrollY: number, factor: number, max = 160) =>
  Math.min(max, Math.max(-max, scrollY * factor));

/** True where requestAnimationFrame exists (browsers, not SSR or node tests). */
export const canAnimate = () =>
  typeof window !== "undefined" && typeof window.requestAnimationFrame === "function";

/** True where IntersectionObserver exists. */
export const canObserve = () =>
  typeof window !== "undefined" && "IntersectionObserver" in window;

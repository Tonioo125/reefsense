import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { canAnimate, parallaxOffset } from "@/lib/motion";

/** Whether the page has scrolled past `threshold` px. Passive, rAF-throttled. */
export function useScrolledPast(threshold: number): boolean {
  const [past, setPast] = useState(
    () => typeof window !== "undefined" && window.scrollY > threshold,
  );

  useEffect(() => {
    if (!canAnimate()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setPast(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return past;
}

type ParallaxLayer = readonly [RefObject<SVGElement | HTMLElement>, number];

/**
 * Drifts each layer vertically by `scrollY * factor` while the top of the page
 * is in view. Writes transforms directly (no re-render) and does nothing under
 * reduced motion.
 */
export function useParallax(layers: ReadonlyArray<ParallaxLayer>): void {
  const reduce = usePrefersReducedMotion();
  const layersRef = useRef(layers);
  layersRef.current = layers;

  useEffect(() => {
    if (reduce || !canAnimate()) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const y = window.scrollY;
      if (y > window.innerHeight * 1.5) return;
      for (const [ref, factor] of layersRef.current) {
        if (ref.current) {
          ref.current.style.transform = `translate3d(0, ${parallaxOffset(y, factor)}px, 0)`;
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      for (const [ref] of layersRef.current) {
        if (ref.current) ref.current.style.transform = "";
      }
    };
  }, [reduce]);
}

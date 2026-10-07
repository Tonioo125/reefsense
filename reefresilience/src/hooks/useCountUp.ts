import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { canAnimate, countUpValue } from "@/lib/motion";

interface CountUpOptions {
  duration?: number;
  enabled?: boolean;
}

/**
 * Animates a number from its last shown value (0 at first) to `target` with an
 * ease-out curve. Returns `target` directly under reduced motion or where
 * requestAnimationFrame is unavailable.
 */
export function useCountUp(
  target: number,
  { duration = 900, enabled = true }: CountUpOptions = {},
): number {
  const reduce = usePrefersReducedMotion();
  const shown = useRef(0);
  const [value, setValue] = useState(0);
  const instant = reduce || !canAnimate();

  useEffect(() => {
    if (instant || !enabled) return;
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const v = countUpValue(from, target, progress);
      shown.current = v;
      setValue(v);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, duration, instant]);

  return instant ? target : value;
}

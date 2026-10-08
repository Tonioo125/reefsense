import { useCallback, useEffect, useRef, useState } from "react";
import type { RefCallback } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { canObserve } from "@/lib/motion";

interface InViewOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Reports once an element has entered the viewport. It latches to `true` and
 * stops observing, so revealed content is never hidden again. Without
 * IntersectionObserver, or under reduced motion, it is `true` from the start.
 */
export function useInView<T extends Element>({
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.1,
}: InViewOptions = {}): [RefCallback<T>, boolean] {
  const [inView, setInView] = useState(() => !canObserve());
  const observer = useRef<IntersectionObserver | null>(null);
  const reduce = usePrefersReducedMotion();

  const ref = useCallback<RefCallback<T>>(
    (el) => {
      observer.current?.disconnect();
      observer.current = null;
      if (!el || !canObserve()) return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setInView(true);
            io.disconnect();
          }
        },
        { rootMargin, threshold },
      );
      io.observe(el);
      observer.current = io;
    },
    [rootMargin, threshold],
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  return [ref, inView || reduce];
}

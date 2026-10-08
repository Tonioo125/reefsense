import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** Plain-language definitions for the domain terms the interface cannot avoid. */
export const GLOSSARY = {
  dhw: {
    title: "Degree Heating Weeks (DHW)",
    body: "How much unusually hot water a reef has sat in over the past 12 weeks. 1 DHW is one week at 1 °C above the usual summer maximum. Bleaching becomes likely around 4 DHW and severe around 8.",
  },
  noaa: {
    title: "NOAA heat alerts",
    body: "NOAA Coral Reef Watch is the US ocean agency's satellite service for reefs. Alert Level 1 (from 4 DHW) means bleaching is likely; Alert Level 2 (from 8 DHW) means severe bleaching is likely.",
  },
  coralCover: {
    title: "Hard coral cover",
    body: "The share of the seabed covered by living hard coral, from the most recent dive survey at or near the reef.",
  },
} as const;

type TermKey = keyof typeof GLOSSARY;

const WIDTH = 272;
const GAP = 8;

/**
 * A word with a dotted underline that explains itself on hover, keyboard focus or tap. The
 * definition is portalled to the page so scroll containers never clip it, and it is placed below
 * the word (above when there is no room), kept inside the viewport.
 */
export default function Term({ term, children }: { term: TermKey; children: ReactNode }) {
  const def = GLOSSARY[term];
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const bh = bubbleRef.current?.offsetHeight ?? 120;
      const left = Math.min(Math.max(12, r.left), window.innerWidth - WIDTH - 12);
      const above = r.bottom + GAP + bh > window.innerHeight - 8 && r.top - GAP - bh > 8;
      setPos({ left, top: above ? r.top - GAP - bh : r.bottom + GAP, above });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // A tap elsewhere, or Escape, closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline cursor-help rounded-sm text-inherit underline decoration-current/40 decoration-dotted underline-offset-[3px] hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </button>
      {open &&
        createPortal(
          <span
            ref={bubbleRef}
            id={id}
            role="tooltip"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: WIDTH }}
            className="pointer-events-none fixed z-[2000] block max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-card p-3 text-left text-xs leading-relaxed text-muted-foreground shadow-float animate-fade-in"
          >
            <span className="block font-semibold text-foreground">{def.title}</span>
            <span className="mt-1 block">{def.body}</span>
          </span>,
          document.body,
        )}
    </>
  );
}

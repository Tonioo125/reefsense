import type { ElementType, HTMLAttributes } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

export type RevealVariant = "fade-up" | "fade-in" | "scale-in";

type RevealProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "li" | "figure" | "section" | "aside" | "p" | "span";
  variant?: RevealVariant;
  /** Delay before the transition starts, in ms. Use it to stagger siblings. */
  delay?: number;
};

/**
 * Fades (and optionally lifts or scales) its content in the first time it
 * scrolls into view. Styles live in index.css under `.reveal`; reduced motion
 * and missing IntersectionObserver both render the final state immediately.
 */
export default function Reveal({
  as,
  variant = "fade-up",
  delay,
  className,
  style,
  ...rest
}: RevealProps) {
  const [ref, inView] = useInView<HTMLElement>();
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      ref={ref}
      className={cn("reveal", `reveal-${variant}`, inView && "is-visible", className)}
      style={{ ...style, transitionDelay: delay ? `${delay}ms` : style?.transitionDelay }}
      {...rest}
    />
  );
}

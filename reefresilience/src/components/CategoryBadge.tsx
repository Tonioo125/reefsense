import { CATEGORY_COLORS } from "@/lib/reef";
import { cn } from "@/lib/utils";
import type { ResilienceCategory } from "@/types/reef";

interface CategoryBadgeProps {
  category: ResilienceCategory;
  className?: string;
}

/** Soft, colour-coded chip for a resilience category. */
export default function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const c = CATEGORY_COLORS[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ background: c.soft, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.base }} />
      {category}
    </span>
  );
}

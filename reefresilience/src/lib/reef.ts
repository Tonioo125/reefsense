import type { QualitativeLevel, ResilienceCategory } from "@/types/reef";

/**
 * Single source of truth for category colour.
 * Concrete hex values (not CSS variables) because Leaflet writes these straight
 * onto SVG presentation attributes, where `var(--x)` would not resolve.
 */
export const CATEGORY_COLORS: Record<
  ResilienceCategory,
  { base: string; soft: string; text: string }
> = {
  High: { base: "#2f8f6b", soft: "#e7f2ec", text: "#1c5c45" },
  Medium: { base: "#d59027", soft: "#f8efdc", text: "#875311" },
  Low: { base: "#cf5340", soft: "#f8e6e1", text: "#8d2c1f" },
};

export const CATEGORY_ORDER: ResilienceCategory[] = ["High", "Medium", "Low"];

export function categoryFromProbability(p: number): ResilienceCategory {
  if (p >= 0.66) return "High";
  if (p >= 0.4) return "Medium";
  return "Low";
}

/** Scientific, non-overclaiming label for a prediction band. */
export function resilienceLabel(category: ResilienceCategory): string {
  switch (category) {
    case "High":
      return "High predicted resilience";
    case "Medium":
      return "Moderate predicted resilience";
    case "Low":
      return "Lower predicted resilience";
  }
}

/** Phrase used in the explanation heading, e.g. "high resilience". */
export function resiliencePhrase(category: ResilienceCategory): string {
  return `${category.toLowerCase()} resilience`;
}

export const formatPercent = (p: number, digits = 0): string =>
  `${(p * 100).toFixed(digits)}%`;

export const formatSigned = (n: number): string =>
  `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}`;

/**
 * Colour for a qualitative stressor level. Note the semantics: for stressors,
 * "Low" is favourable (teal/green) and "High" is unfavourable (terracotta).
 */
export function levelTone(level: QualitativeLevel): { soft: string; text: string } {
  switch (level) {
    case "Low":
      return { soft: "#e7f2ec", text: "#1c5c45" };
    case "Moderate":
      return { soft: "#f8efdc", text: "#875311" };
    case "High":
      return { soft: "#f8e6e1", text: "#8d2c1f" };
  }
}

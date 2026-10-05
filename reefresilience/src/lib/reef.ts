import type {
  EnvironmentalMetrics,
  FeatureContribution,
  QualitativeLevel,
  ResilienceCategory,
} from "@/types/reef";

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

/** Probability thresholds for the predicted-resilience bands. */
export const CATEGORY_THRESHOLDS = { high: 0.66, medium: 0.4 } as const;

export function categoryFromProbability(p: number): ResilienceCategory {
  if (p >= CATEGORY_THRESHOLDS.high) return "High";
  if (p >= CATEGORY_THRESHOLDS.medium) return "Medium";
  return "Low";
}

/** Human-readable probability range for a band, derived from the thresholds. */
export function categoryRangeLabel(category: ResilienceCategory): string {
  const high = Math.round(CATEGORY_THRESHOLDS.high * 100);
  const medium = Math.round(CATEGORY_THRESHOLDS.medium * 100);
  switch (category) {
    case "High":
      return `≥ ${high}%`;
    case "Medium":
      return `${medium}–${high - 1}%`;
    case "Low":
      return `< ${medium}%`;
  }
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

/** Heading for the model explanation, hedged to the predicted band. */
export function explanationHeading(category: ResilienceCategory): string {
  const phrase = { High: "high", Medium: "moderate", Low: "lower" }[category];
  return `Why does the model predict ${phrase} resilience?`;
}

/** Title and body sentence for the per-reef insight. */
export function insightCopy(category: ResilienceCategory): { title: string; body: string } {
  switch (category) {
    case "High":
      return {
        title: "High resilience potential",
        body: "This reef shows environmental characteristics associated with stronger climate resilience in the model.",
      };
    case "Medium":
      return {
        title: "Moderate resilience potential",
        body: "This reef combines favourable and limiting environmental characteristics; the model estimates an intermediate climate resilience likelihood.",
      };
    case "Low":
      return {
        title: "Limited resilience potential",
        body: "This reef shows environmental characteristics the model associates with a lower likelihood of climate resilience.",
      };
  }
}

export function confidenceLabel(p: number): "High" | "Moderate" | "Limited" {
  if (p >= 0.75) return "High";
  if (p >= 0.6) return "Moderate";
  return "Limited";
}

/** Largest positive contributions, strongest first. */
export function topPositiveFactors(
  contributions: FeatureContribution[],
  n = 3,
): FeatureContribution[] {
  return contributions
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, n);
}

/** One-sentence, plain-language summary of a reef's environmental predictors. */
export function environmentalSummary(m: EnvironmentalMetrics): string {
  const depthClass = m.depth < 7 ? "Shallow" : m.depth > 15 ? "Deep" : "Mid-depth";
  const coverClass = m.coralCover >= 50 ? "high" : m.coralCover >= 25 ? "moderate" : "low";
  return (
    `${depthClass} reef (${m.depth.toFixed(1)} m) with ${coverClass} coral cover (${m.coralCover}%), ` +
    `${m.heatStress.toLowerCase()} heat stress and ${m.humanPressure.toLowerCase()} human pressure ` +
    `at a mean SST of ${m.seaSurfaceTemp.toFixed(1)} °C.`
  );
}

/** The environmental predictors shown per reef, in display order. */
export const ENVIRONMENTAL_VARIABLES: {
  key: keyof EnvironmentalMetrics;
  label: string;
  unit?: string;
}[] = [
  { key: "seaSurfaceTemp", label: "Sea surface temperature", unit: "°C" },
  { key: "coralCover", label: "Coral cover", unit: "%" },
  { key: "depth", label: "Depth", unit: "m" },
  { key: "heatStress", label: "Heat stress" },
  { key: "humanPressure", label: "Human pressure" },
];

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

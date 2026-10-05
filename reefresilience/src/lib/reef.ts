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

/** Probability thresholds for the predicted-resilience bands (mirrors backend/main.py). */
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

/**
 * One-sentence, plain-language summary of a reef's environmental predictors.
 * Values missing from the source data are left out rather than guessed.
 */
export function environmentalSummary(m: EnvironmentalMetrics): string {
  const reef =
    m.depth == null
      ? "Reef"
      : `${m.depth < 7 ? "Shallow" : m.depth > 15 ? "Deep" : "Mid-depth"} reef (${m.depth.toFixed(1)} m)`;
  const parts: string[] = [];
  if (m.coralCover != null) {
    const cover = m.coralCover >= 50 ? "high" : m.coralCover >= 25 ? "moderate" : "low";
    parts.push(`${cover} coral cover (${Math.round(m.coralCover)}%)`);
  }
  if (m.heatStress && m.dhwMax12w != null) {
    parts.push(
      `${m.heatStress.toLowerCase()} accumulated heat stress (${m.dhwMax12w.toFixed(1)} DHW over 12 weeks)`,
    );
  }
  let sentence = parts.length ? `${reef} with ${parts.join(" and ")}` : reef;
  if (m.seaSurfaceTemp != null) sentence += ` at a mean SST of ${m.seaSurfaceTemp.toFixed(1)} °C`;
  return `${sentence}.`;
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

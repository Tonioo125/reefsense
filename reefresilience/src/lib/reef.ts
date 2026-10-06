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
    const year = m.coralCoverYear ? `, ${m.coralCoverYear} survey` : "";
    parts.push(`${cover} coral cover (${Math.round(m.coralCover)}%${year})`);
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

/** Where a coral-cover value comes from, e.g. "2019 survey" or "2016 survey, 3.2 km away". */
export function coralCoverNote(m: EnvironmentalMetrics): string | undefined {
  if (m.coralCover == null) return "no survey within 10 km";
  if (m.coralCoverSource !== "survey" || m.coralCoverYear == null) return undefined;
  const where = m.coralCoverKm != null && m.coralCoverKm >= 0.5 ? `, ${m.coralCoverKm} km away` : "";
  return `${m.coralCoverYear} survey${where}`;
}

/**
 * Outer bounds of the reef extent tiles, [[south, west], [north, east]]: the envelope of
 * REEF_AREA_BOXES in pipeline/config.py (West, South, Southeast and East Asia).
 */
export const REEF_AREA_BOUNDS: [[number, number], [number, number]] = [
  [-12, 32],
  [36, 150],
];
/** Fill colour of the reef extent tiles (mirrors pipeline/05_reef_area_tiles.py). */
export const REEF_AREA_COLOR = "rgba(32, 164, 170, 0.55)";
export const REEF_AREA_ATTRIBUTION =
  'Reef extent: UNEP-WCMC, WorldFish, WRI, TNC (2010), v4.1 released 2021 · <a href="https://www.unep-wcmc.org" target="_blank" rel="noopener">UNEP-WCMC</a>';

/** Sequential scale for hard coral cover: pale sand (bare) to deep teal (dense coral). */
export const CORAL_COVER_STOPS: { pct: number; color: [number, number, number] }[] = [
  { pct: 0, color: [236, 224, 199] },
  { pct: 35, color: [116, 181, 161] },
  { pct: 70, color: [22, 96, 82] },
];
export const CORAL_COVER_NO_DATA = "#c5ccce";
/** Cover at which the scale saturates (the legend shows "70%+"). */
export const CORAL_COVER_MAX = CORAL_COVER_STOPS[CORAL_COVER_STOPS.length - 1].pct;

/** CSS gradient for the coral cover scale, 0% → CORAL_COVER_MAX. */
export const CORAL_COVER_GRADIENT = `linear-gradient(to right, ${CORAL_COVER_STOPS.map(
  (s) => `rgb(${s.color.join(", ")}) ${(s.pct / CORAL_COVER_MAX) * 100}%`,
).join(", ")})`;

/** CSS gradient for predicted resilience, 0% → 100%, blending the three bands at their thresholds. */
export const RESILIENCE_GRADIENT = (() => {
  const { high, medium } = CATEGORY_THRESHOLDS;
  const mid = ((medium + high) / 2) * 100;
  return (
    `linear-gradient(to right, ${CATEGORY_COLORS.Low.base} 0%, ${CATEGORY_COLORS.Low.base} ${medium * 70}%, ` +
    `${CATEGORY_COLORS.Medium.base} ${mid}%, ${CATEGORY_COLORS.High.base} ${high * 100 + 10}%, ` +
    `${CATEGORY_COLORS.High.base} 100%)`
  );
})();

export function coralCoverColor(pct: number | null): string {
  if (pct == null) return CORAL_COVER_NO_DATA;
  const stops = CORAL_COVER_STOPS;
  const p = Math.min(Math.max(pct, stops[0].pct), stops[stops.length - 1].pct);
  const i = Math.max(0, stops.findIndex((s) => s.pct >= p) - 1);
  const [a, b] = [stops[i], stops[Math.min(i + 1, stops.length - 1)]];
  const t = b.pct === a.pct ? 0 : (p - a.pct) / (b.pct - a.pct);
  const rgb = a.color.map((c, k) => Math.round(c + (b.color[k] - c) * t));
  return `rgb(${rgb.join(", ")})`;
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

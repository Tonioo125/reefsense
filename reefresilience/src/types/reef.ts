// Domain types for ReefResilience. These match the FastAPI responses in backend/main.py.

export type ResilienceCategory = "High" | "Medium" | "Low";

/** Qualitative scale used for stressor-style variables. */
export type QualitativeLevel = "Low" | "Moderate" | "High";

export interface EnvironmentalMetrics {
  /** Mean sea surface temperature over the last 30 days, °C (NOAA Coral Reef Watch). */
  seaSurfaceTemp: number | null;
  /** Mean sea temperature anomaly over the last 30 days, °C. */
  sstAnomaly?: number | null;
  /** Live hard coral cover, percent. */
  coralCover: number | null;
  /** Whether coral cover was measured at the site or borrowed from nearby surveys. */
  coralCoverSource?: "site" | "nearby surveys";
  /** Representative reef depth, metres (from nearby surveys). */
  depth: number | null;
  /** Degree Heating Weeks today and peak over the last 12 weeks. */
  dhwNow?: number | null;
  dhwMax12w?: number | null;
  /** Accumulated thermal stress over 12 weeks, from peak DHW (4 DHW = NOAA Alert Level 1). */
  heatStress: QualitativeLevel | null;
  /** Current NOAA Bleaching Alert Area status, e.g. "NOAA: watch now". */
  alertLevel?: string | null;
}

/**
 * A single model feature contribution (SHAP-style, log-odds):
 * positive pushes the prediction toward higher resilience, negative toward lower.
 */
export interface FeatureContribution {
  feature: string;
  contribution: number;
}

export interface Reef {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  /** Model-estimated probability of high climate resilience, 0–1. */
  resilienceProbability: number;
  /** Model-estimated probability of bleaching (>= 10% of colonies), 0–1. */
  bleachingProbability?: number;
  category: ResilienceCategory;
  /** Distance to the nearest survey whose conditions fill the non-heat predictors. */
  nearestSurveyKm?: number;
  /** Date of the latest satellite heat-stress observation. */
  asOf?: string | null;
  metrics: EnvironmentalMetrics;
  contributions: FeatureContribution[];
  /** Short, plain-language model-based interpretation. */
  insight: string;
}

export type ReefFilter = "All" | ResilienceCategory;

/** Cross-validated model performance, as written by pipeline/03_train_bleaching.py. */
export interface ModelMetrics {
  region: string;
  n_rows: number;
  positive_rate: number;
  validation: string;
  model: { roc_auc: number | null; pr_auc: number };
  baseline_dhw?: { feature: string; roc_auc: number | null };
  indonesia_subset?: { n_rows: number; roc_auc: number | null };
}

// Domain types for ReefResilience.
// These mirror the shape of the planned FastAPI responses so that the mock
// API layer can be swapped for real network calls without UI changes.

export type ResilienceCategory = "High" | "Medium" | "Low";

/** Qualitative scale used for stressor-style variables. */
export type QualitativeLevel = "Low" | "Moderate" | "High";

export type OceanBasin = "Pacific" | "Indian" | "Atlantic";

export interface EnvironmentalMetrics {
  /** Mean sea surface temperature, °C. */
  seaSurfaceTemp: number;
  /** Live coral cover, percent of benthos. */
  coralCover: number;
  /** Representative reef depth, metres. */
  depth: number;
  /** Accumulated thermal stress exposure. */
  heatStress: QualitativeLevel;
  /** Local anthropogenic pressure (fishing, runoff, development). */
  humanPressure: QualitativeLevel;
}

/**
 * A single model feature contribution, in the spirit of a SHAP value:
 * positive pushes the prediction toward higher resilience, negative toward lower.
 */
export interface FeatureContribution {
  feature: string;
  contribution: number;
}

/** GET /api/reefs and GET /api/reefs/{id} */
export interface Reef {
  id: string;
  name: string;
  region: string;
  ocean: OceanBasin;
  latitude: number;
  longitude: number;
  /** Model-estimated probability of high climate resilience, 0–1. */
  resilienceProbability: number;
  category: ResilienceCategory;
  /** Model confidence in this prediction, 0–1. */
  modelConfidence: number;
  metrics: EnvironmentalMetrics;
}

/** GET /api/reefs/{id}/explanation */
export interface ReefExplanation {
  reefId: string;
  category: ResilienceCategory;
  probability: number;
  confidence: number;
  contributions: FeatureContribution[];
  /** Short, plain-language model-based interpretation. */
  summary: string;
}

/** POST /api/predict request body. */
export type PredictRequest = Partial<EnvironmentalMetrics>;

/** POST /api/predict response body. */
export interface PredictResponse {
  probability: number;
  category: ResilienceCategory;
}

export type ReefFilter = "All" | ResilienceCategory;

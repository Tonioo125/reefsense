// Domain types for ReefSense. These match the FastAPI responses in backend/main.py.

export type ResilienceCategory = "High" | "Medium" | "Low";

/** Qualitative scale used for stressor-style variables. */
export type QualitativeLevel = "Low" | "Moderate" | "High";

export interface EnvironmentalMetrics {
  /** Mean sea surface temperature over the last 30 days, °C (NOAA Coral Reef Watch). */
  seaSurfaceTemp: number | null;
  /** Mean sea temperature anomaly over the last 30 days, °C. */
  sstAnomaly?: number | null;
  /** Hard coral cover, percent, from the latest survey at or near the reef. Null when none within 10 km. */
  coralCover: number | null;
  /** "survey": GCBD survey at or near the reef; "site list": entered for the site. */
  coralCoverSource?: "site list" | "survey";
  /** Year of the survey the coral cover comes from. */
  coralCoverYear?: number | null;
  /** Distance from the reef to that survey, km (0 = the reef's own survey). */
  coralCoverKm?: number | null;
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

/** GET /api/reefs and GET /api/reefs/{id} */
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
  /**
   * True when peak heat stress stayed below 4 DHW for 12 weeks (NOAA's alerts never reached Alert
   * Level 1) but the model predicts moderate or lower resilience. See GET /api/noaa-gap.
   */
  noaaGap?: boolean;
  metrics: EnvironmentalMetrics;
}

/** GET /api/noaa-gap */
export interface NoaaGapSummary {
  definition: string;
  /** Reefs flagged (noaaGap). */
  count: number;
  /** Reefs whose peak DHW stayed below 4 over 12 weeks (NOAA never reached Alert Level 1). */
  belowAlert1Count: number;
  total: number;
  /** Flagged reefs whose largest model driver is a site attribute rather than recent heat. */
  nonHeatTopDriverCount: number;
  asOf: string | null;
  byCountry: { country: string; count: number }[];
  /** Flagged reef ids, highest predicted bleaching risk first. */
  reefIds: string[];
}

/** GET /api/reefs/{id}/explanation */
export interface ReefExplanation {
  reefId: string;
  category: ResilienceCategory;
  probability: number;
  contributions: FeatureContribution[];
  /** Units of the contributions, e.g. "log-odds of avoiding bleaching". */
  units: string;
  /** Short, plain-language model-based interpretation. */
  summary: string;
}

/** POST /api/predict request body: score a location under a heat-stress scenario. */
export interface PredictRequest {
  latitude: number;
  longitude: number;
  /** Peak Degree Heating Weeks over the past 12 weeks. */
  dhwMax12w: number;
  /** Mean sea temperature anomaly, last 30 days (°C). */
  sstAnomaly?: number;
  /** Reef depth (m). */
  depth?: number;
}

/** POST /api/predict response body. */
export interface PredictResponse {
  probability: number;
  bleachingProbability: number;
  category: ResilienceCategory;
  contributions: FeatureContribution[];
  nearestSurveyKm: number;
}

export type ReefFilter = "All" | ResilienceCategory;

/** What the map markers are coloured by. */
export type MapColorBy = "resilience" | "coral";

/** Cross-validated model performance, as written by pipeline/03_train_bleaching.py. */
export interface ModelMetrics {
  region: string;
  n_rows: number;
  positive_rate: number;
  features: string[];
  validation: string;
  model: { roc_auc: number | null; pr_auc: number };
  baseline_dhw?: { feature: string; roc_auc: number | null };
  indonesia_subset?: { n_rows: number; roc_auc: number | null };
}

/** GET /api/reefs/{id}/heat-history: daily NOAA Coral Reef Watch heat stress at the reef. */
export interface HeatHistory {
  reefId: string;
  asOf: string | null;
  source: string;
  alertThresholds: { dhw: number; label: string }[];
  /** One point per day, oldest first; `dhw` is null on days without data. */
  points: { date: string; dhw: number | null }[];
}

/** One year of past surveys near a reef (Global Coral-Bleaching Database). */
export interface SurveyYear {
  year: number;
  samples: number;
  locations: number;
  bleachingSamples: number;
  /** Mean percent of colonies bleached across that year's samples. */
  meanBleachedPct: number | null;
  maxBleachedPct: number | null;
  /** Share of samples at or above the bleaching threshold (10%). */
  bleachedShare: number | null;
  coralCoverPct: number | null;
}

/** GET /api/reefs/{id}/survey-history */
export interface SurveyHistory {
  reefId: string;
  radiusKm: number;
  nearestKm: number | null;
  samples: number;
  locations: number;
  /** Samples whose bleaching is a severity band's midpoint rather than a measured percent. */
  coarseSamples: number;
  sources: string[];
  thresholdPct: number;
  years: SurveyYear[];
}

export interface NewsArticle {
  title: string;
  url: string;
  published: string | null;
  summary: string | null;
  /** The region name the article matched. */
  place: string;
}

/** GET /api/reefs/{id}/news: coral news about the reef's region, matched by place name. */
export interface ReefNews {
  reefId: string;
  region: string;
  status: "ok" | "unavailable";
  source: string;
  sourceUrl: string;
  /** Place names searched, most specific first. */
  searched: string[];
  articles: NewsArticle[];
}

/** One year of observed bleaching across all surveys (GET /api/bleaching-history). */
export interface HistoryYear {
  year: number;
  surveys: number;
  locations: number;
  /** Share of surveys at or above the bleaching threshold (10% of colonies). */
  bleachedShare: number;
  meanBleachedPct: number;
  /** Most-surveyed countries that year. */
  topCountries: { country: string; surveys: number; bleachedShare: number }[];
}

/** [lat, lon, year, mean % bleached, max % bleached, surveys, country index] */
export type HistoryPoint = [number, number, number, number, number, number, number];

/** GET /api/bleaching-history */
export interface BleachingHistory {
  source: string;
  thresholdPct: number;
  countries: string[];
  points: HistoryPoint[];
  years: HistoryYear[];
}

export type MapMode = "today" | "history";

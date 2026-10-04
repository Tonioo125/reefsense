import { mockReefs } from "@/data/mockReefs";
import { categoryFromProbability } from "@/lib/reef";
import type {
  EnvironmentalMetrics,
  FeatureContribution,
  Reef,
  ResilienceCategory,
} from "@/types/reef";

/**
 * Frontend API layer (mock implementation).
 *
 * Every function here mirrors a planned FastAPI endpoint. Today they resolve
 * against the in-memory mock dataset; to go live, replace each body with the
 * corresponding `http()` call below — no UI component needs to change.
 *
 *   GET  /api/reefs                   -> listReefs()
 *   GET  /api/reefs/{id}              -> getReef(id)
 *   POST /api/predict                 -> predict(input)
 *   GET  /api/reefs/{id}/explanation  -> getExplanation(id)
 */

// const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
// async function http<T>(path: string, init?: RequestInit): Promise<T> {
//   const res = await fetch(`${API_BASE}${path}`, init);
//   if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
//   return res.json() as Promise<T>;
// }

/** Simulated network latency so loading states behave as they will in production. */
const LATENCY_MS = 350;
const wait = <T>(value: T, ms = LATENCY_MS): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** GET /api/reefs */
export function listReefs(): Promise<Reef[]> {
  // return http<Reef[]>("/reefs");
  return wait(mockReefs);
}

/** GET /api/reefs/{id} */
export function getReef(id: string): Promise<Reef | null> {
  // return http<Reef>(`/reefs/${id}`);
  return wait(mockReefs.find((r) => r.id === id) ?? null);
}

export interface Explanation {
  reefId: string;
  category: ResilienceCategory;
  probability: number;
  confidence: number;
  contributions: FeatureContribution[];
  summary: string;
}

/** GET /api/reefs/{id}/explanation */
export function getExplanation(id: string): Promise<Explanation | null> {
  // return http<Explanation>(`/reefs/${id}/explanation`);
  const reef = mockReefs.find((r) => r.id === id);
  if (!reef) return wait(null);
  return wait({
    reefId: reef.id,
    category: reef.category,
    probability: reef.resilienceProbability,
    confidence: reef.modelConfidence,
    contributions: reef.contributions,
    summary: reef.insight,
  });
}

export type PredictInput = Partial<EnvironmentalMetrics>;

export interface PredictResult {
  probability: number;
  category: ResilienceCategory;
}

/**
 * POST /api/predict
 * Mock stand-in for the trained classifier: a small, transparent logistic
 * response over the supplied predictors. Replace with the real model call.
 */
export function predict(input: PredictInput): Promise<PredictResult> {
  // return http<PredictResult>("/predict", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(input),
  // });
  const level = { Low: 1, Moderate: 0, High: -1 } as const;
  const z =
    0.03 * ((input.coralCover ?? 40) - 40) +
    0.6 * (input.heatStress ? level[input.heatStress] : 0) +
    0.5 * (input.humanPressure ? level[input.humanPressure] : 0) -
    0.25 * ((input.seaSurfaceTemp ?? 28.5) - 28.5);
  const probability = Math.min(0.98, Math.max(0.02, 1 / (1 + Math.exp(-z))));
  return wait({ probability, category: categoryFromProbability(probability) });
}

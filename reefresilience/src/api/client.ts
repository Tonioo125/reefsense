import type { FeatureContribution, ModelMetrics, Reef, ResilienceCategory } from "@/types/reef";

/**
 * Frontend API layer. Talks to the FastAPI backend (backend/main.py):
 *
 *   GET  /api/reefs                   -> listReefs()
 *   GET  /api/reefs/{id}              -> getReef(id)
 *   POST /api/predict                 -> predict(input)
 *   GET  /api/reefs/{id}/explanation  -> getExplanation(id)
 *   GET  /api/model                   -> getModelMetrics()
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new Error("The ReefResilience API is unreachable.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request to ${path} failed with status ${res.status}.`);
  }
  return res.json() as Promise<T>;
}

export function listReefs(): Promise<Reef[]> {
  return http<Reef[]>("/reefs");
}

export function getReef(id: string): Promise<Reef> {
  return http<Reef>(`/reefs/${encodeURIComponent(id)}`);
}

export interface Explanation {
  reefId: string;
  category: ResilienceCategory;
  probability: number;
  contributions: FeatureContribution[];
  units: string;
  summary: string;
}

export function getExplanation(id: string): Promise<Explanation> {
  return http<Explanation>(`/reefs/${encodeURIComponent(id)}/explanation`);
}

export interface PredictInput {
  latitude: number;
  longitude: number;
  /** Peak Degree Heating Weeks over the past 12 weeks. */
  dhwMax12w: number;
  sstAnomaly?: number;
  depth?: number;
}

export interface PredictResult {
  probability: number;
  bleachingProbability: number;
  category: ResilienceCategory;
  contributions: FeatureContribution[];
  nearestSurveyKm: number;
}

export function predict(input: PredictInput): Promise<PredictResult> {
  return http<PredictResult>("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function getModelMetrics(): Promise<ModelMetrics | null> {
  const { metrics } = await http<{ metrics: ModelMetrics }>("/model");
  return metrics?.model ? metrics : null;
}

import { mockReefRecords, type MockReefRecord } from "@/data/mockReefs";
import { categoryFromProbability } from "@/lib/reef";
import type {
  PredictRequest,
  PredictResponse,
  Reef,
  ReefExplanation,
} from "@/types/reef";

/**
 * Frontend API layer.
 *
 * Every function mirrors a FastAPI endpoint. By default they resolve against
 * the in-memory mock dataset; set `VITE_USE_MOCK=false` to call the backend
 * over HTTP instead. No UI component needs to change either way.
 *
 *   GET  /api/reefs                   -> listReefs()
 *   GET  /api/reefs/{id}              -> getReef(id)
 *   POST /api/predict                 -> predict(input)
 *   GET  /api/reefs/{id}/explanation  -> getExplanation(id)
 */

export interface ApiConfig {
  /** Backend origin without trailing slash. Empty = same-origin `/api`. */
  baseUrl: string;
  useMock: boolean;
}

/** Read on every call so the configuration can be changed in tests. */
export function getApiConfig(): ApiConfig {
  return {
    baseUrl: (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, ""),
    useMock: import.meta.env.VITE_USE_MOCK !== "false",
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl } = getApiConfig();
  const res = await fetch(`${baseUrl}/api${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(`Request to ${path} failed (${res.status})`, res.status);
  return (await res.json()) as T;
}

/** Like `http`, but resolves to `null` for 404 Not Found. */
async function httpOrNull<T>(path: string): Promise<T | null> {
  try {
    return await http<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Simulated network latency so loading states behave as they will in production. */
export const MOCK_LATENCY_MS = 350;
const wait = <T>(value: T, ms = MOCK_LATENCY_MS): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** Strip explanation-only fields so the response matches GET /api/reefs. */
function toReef(record: MockReefRecord): Reef {
  return structuredClone({
    id: record.id,
    name: record.name,
    region: record.region,
    ocean: record.ocean,
    latitude: record.latitude,
    longitude: record.longitude,
    resilienceProbability: record.resilienceProbability,
    category: record.category,
    modelConfidence: record.modelConfidence,
    metrics: record.metrics,
  });
}

function toExplanation(record: MockReefRecord): ReefExplanation {
  return {
    reefId: record.id,
    category: record.category,
    probability: record.resilienceProbability,
    confidence: record.modelConfidence,
    contributions: structuredClone(record.contributions),
    summary: record.insight,
  };
}

const findRecord = (id: string) => mockReefRecords.find((r) => r.id === id);

/** GET /api/reefs */
export function listReefs(): Promise<Reef[]> {
  if (!getApiConfig().useMock) return http<Reef[]>("/reefs");
  return wait(mockReefRecords.map(toReef));
}

/** GET /api/reefs/{id} */
export function getReef(id: string): Promise<Reef | null> {
  if (!getApiConfig().useMock) return httpOrNull<Reef>(`/reefs/${encodeURIComponent(id)}`);
  const record = findRecord(id);
  return wait(record ? toReef(record) : null);
}

/** GET /api/reefs/{id}/explanation */
export function getExplanation(id: string): Promise<ReefExplanation | null> {
  if (!getApiConfig().useMock) {
    return httpOrNull<ReefExplanation>(`/reefs/${encodeURIComponent(id)}/explanation`);
  }
  const record = findRecord(id);
  return wait(record ? toExplanation(record) : null);
}

/**
 * POST /api/predict
 * The mock stands in for the trained classifier with a small, transparent
 * logistic response over the supplied predictors.
 */
export function predict(input: PredictRequest): Promise<PredictResponse> {
  if (!getApiConfig().useMock) {
    return http<PredictResponse>("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }
  const level = { Low: 1, Moderate: 0, High: -1 } as const;
  const z =
    0.03 * ((input.coralCover ?? 40) - 40) +
    0.6 * (input.heatStress ? level[input.heatStress] : 0) +
    0.5 * (input.humanPressure ? level[input.humanPressure] : 0) -
    0.25 * ((input.seaSurfaceTemp ?? 28.5) - 28.5);
  const probability = Math.min(0.98, Math.max(0.02, 1 / (1 + Math.exp(-z))));
  return wait({ probability, category: categoryFromProbability(probability) });
}

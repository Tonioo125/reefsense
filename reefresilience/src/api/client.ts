import type {
  ModelMetrics,
  NoaaGapSummary,
  PredictRequest,
  PredictResponse,
  Reef,
  ReefExplanation,
} from "@/types/reef";

/**
 * Frontend API layer. Every function calls the ReefCast FastAPI backend
 * (backend/main.py); there is no mock fallback.
 *
 *   GET  /api/reefs                   -> listReefs()
 *   GET  /api/reefs/{id}              -> getReef(id)
 *   POST /api/predict                 -> predict(input)
 *   GET  /api/reefs/{id}/explanation  -> getExplanation(id)
 *   GET  /api/model                   -> getModelMetrics()
 *   GET  /api/noaa-gap                -> getNoaaGap()
 */

export interface ApiConfig {
  /** Backend origin without trailing slash. Empty = same-origin `/api`. */
  baseUrl: string;
}

/** Read on every call so the configuration can be changed in tests. */
export function getApiConfig(): ApiConfig {
  return { baseUrl: (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "") };
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
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("The ReefResilience API is unreachable.");
  }
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

/** GET /api/reefs */
export function listReefs(): Promise<Reef[]> {
  return http<Reef[]>("/reefs");
}

/** GET /api/reefs/{id} */
export function getReef(id: string): Promise<Reef | null> {
  return httpOrNull<Reef>(`/reefs/${encodeURIComponent(id)}`);
}

/** GET /api/reefs/{id}/explanation */
export function getExplanation(id: string): Promise<ReefExplanation | null> {
  return httpOrNull<ReefExplanation>(`/reefs/${encodeURIComponent(id)}/explanation`);
}

/** POST /api/predict: score any location under a given heat-stress scenario. */
export function predict(input: PredictRequest): Promise<PredictResponse> {
  return http<PredictResponse>("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** GET /api/model: cross-validated performance of the served model. */
export async function getModelMetrics(): Promise<ModelMetrics | null> {
  const { metrics } = await http<{ metrics: ModelMetrics }>("/model");
  return metrics?.model ? metrics : null;
}

/** GET /api/noaa-gap: reefs at elevated predicted risk while NOAA's current alert is below Warning. */
export function getNoaaGap(): Promise<NoaaGapSummary> {
  return http<NoaaGapSummary>("/noaa-gap");
}

/**
 * Leaflet tile URL for the coral reef extent layer (UNEP-WCMC v4.1). Images only: the source license
 * forbids making the underlying data downloadable.
 */
export function reefAreaTileUrl(): string {
  return `${getApiConfig().baseUrl}/api/tiles/reef-area/{z}/{x}/{y}.png`;
}

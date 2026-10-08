import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  getApiConfig,
  getExplanation,
  getModelMetrics,
  getNoaaGap,
  getReef,
  getReefPhotos,
  listReefs,
  predict,
  reefAreaTileUrl,
} from "@/api/client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const useHttp = (impl: (url: string, init?: RequestInit) => Response, baseUrl = "http://api.test/") => {
  vi.stubEnv("VITE_API_BASE_URL", baseUrl);
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => impl(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("configuration", () => {
  it("reads the base URL without a trailing slash", () => {
    useHttp(() => jsonResponse([]));
    expect(getApiConfig()).toEqual({ baseUrl: "http://api.test" });
  });

  it("defaults to same-origin /api", async () => {
    const fetchMock = useHttp(() => jsonResponse([]), "");
    await listReefs();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/reefs");
  });
});

describe("reef area tiles", () => {
  it("builds a Leaflet tile template on the API origin", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test/");
    expect(reefAreaTileUrl()).toBe("http://api.test/api/tiles/reef-area/{z}/{x}/{y}.png");
    vi.stubEnv("VITE_API_BASE_URL", "");
    expect(reefAreaTileUrl()).toBe("/api/tiles/reef-area/{z}/{x}/{y}.png");
  });
});

describe("endpoints", () => {
  it("calls the FastAPI endpoints", async () => {
    const fetchMock = useHttp(() => jsonResponse({ metrics: {} }));
    await listReefs();
    await getReef("GL15");
    await getExplanation("GL15");
    await predict({ latitude: -8.7155, longitude: 115.456, dhwMax12w: 4 });
    await getModelMetrics();
    await getNoaaGap();

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      "http://api.test/api/reefs",
      "http://api.test/api/reefs/GL15",
      "http://api.test/api/reefs/GL15/explanation",
      "http://api.test/api/predict",
      "http://api.test/api/model",
      "http://api.test/api/noaa-gap",
    ]);
    const [, init] = fetchMock.mock.calls[3];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      latitude: -8.7155,
      longitude: 115.456,
      dhwMax12w: 4,
    });
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("encodes ids in the path", async () => {
    const fetchMock = useHttp(() => jsonResponse({}));
    await getReef("a/b");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/reefs/a%2Fb");
  });

  it("loads reef photos", async () => {
    const photo = { id: "1", url: "https://img.test/1/medium.jpg", distanceKm: 0.4 };
    const fetchMock = useHttp(() => jsonResponse([photo]));
    expect(await getReefPhotos("GL15")).toEqual([photo]);
    await getReefPhotos("a/b");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://api.test/api/reefs/GL15/photos",
      "http://api.test/api/reefs/a%2Fb/photos",
    ]);
  });

  it("returns model metrics only when the API reports a trained model", async () => {
    useHttp(() => jsonResponse({ metrics: { model: { roc_auc: 0.75, pr_auc: 0.56 }, features: [] } }));
    expect((await getModelMetrics())?.model.roc_auc).toBe(0.75);
    useHttp(() => jsonResponse({ metrics: {} }));
    expect(await getModelMetrics()).toBeNull();
  });
});

describe("errors", () => {
  it("maps 404 to null", async () => {
    useHttp(() => jsonResponse({ detail: "Not found" }, 404));
    expect(await getReef("nope")).toBeNull();
    expect(await getExplanation("nope")).toBeNull();
    expect(await getReefPhotos("nope")).toEqual([]);
  });

  it("rejects other errors with ApiError", async () => {
    useHttp(() => jsonResponse({ detail: "boom" }, 503));
    await expect(listReefs()).rejects.toBeInstanceOf(ApiError);
    await expect(getReef("GL15")).rejects.toMatchObject({ status: 503 });
    await expect(getReefPhotos("GL15")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects with ApiError when the API is unreachable (no fallback data)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    await expect(listReefs()).rejects.toBeInstanceOf(ApiError);
    await expect(listReefs()).rejects.toThrow("unreachable");
  });
});

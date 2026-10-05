import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  getApiConfig,
  getExplanation,
  getReef,
  listReefs,
  predict,
} from "@/api/client";
import { categoryFromProbability } from "@/lib/reef";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("mock mode (default)", () => {
  it("is enabled unless VITE_USE_MOCK is 'false'", () => {
    expect(getApiConfig().useMock).toBe(true);
  });

  it("lists reefs without explanation fields", async () => {
    const reefs = await listReefs();
    expect(reefs).toHaveLength(24);
    for (const r of reefs) {
      expect(r).not.toHaveProperty("contributions");
      expect(r).not.toHaveProperty("insight");
      expect(r.ocean).toMatch(/^(Pacific|Indian|Atlantic)$/);
    }
  });

  it("gets a single reef by id", async () => {
    const palau = await getReef("palau");
    expect(palau).toMatchObject({
      name: "Palau Reef",
      latitude: 7.5,
      longitude: 134.6,
      resilienceProbability: 0.87,
      category: "High",
      metrics: { seaSurfaceTemp: 28.4, coralCover: 72, depth: 8.2 },
    });
    expect(await getReef("nope")).toBeNull();
  });

  it("serves the model explanation", async () => {
    const e = await getExplanation("palau");
    expect(e?.reefId).toBe("palau");
    expect(e?.contributions).toHaveLength(5);
    expect(e?.contributions[0]).toEqual({ feature: "Coral cover", contribution: 0.21 });
    expect(await getExplanation("nope")).toBeNull();
  });

  it("predicts a probability with a consistent category", async () => {
    const res = await predict({
      coralCover: 72,
      heatStress: "Low",
      humanPressure: "Low",
      seaSurfaceTemp: 28.4,
    });
    expect(res.probability).toBeGreaterThan(0);
    expect(res.probability).toBeLessThan(1);
    expect(res.category).toBe(categoryFromProbability(res.probability));
  });

  it("returns copies, not shared references", async () => {
    const first = await getReef("palau");
    first!.metrics.coralCover = 0;
    const firstExpl = await getExplanation("palau");
    firstExpl!.contributions[0].contribution = 99;
    expect((await getReef("palau"))!.metrics.coralCover).toBe(72);
    expect((await getExplanation("palau"))!.contributions[0].contribution).toBe(0.21);
  });
});

describe("HTTP mode", () => {
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const useHttp = (impl: (url: string, init?: RequestInit) => Response) => {
    vi.stubEnv("VITE_USE_MOCK", "false");
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test/");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => impl(url, init));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("reads the base URL without a trailing slash", () => {
    useHttp(() => jsonResponse([]));
    expect(getApiConfig()).toEqual({ baseUrl: "http://api.test", useMock: false });
  });

  it("calls the FastAPI endpoints", async () => {
    const fetchMock = useHttp(() => jsonResponse({}));
    await listReefs();
    await getReef("palau");
    await getExplanation("palau");
    await predict({ coralCover: 50 });

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      "http://api.test/api/reefs",
      "http://api.test/api/reefs/palau",
      "http://api.test/api/reefs/palau/explanation",
      "http://api.test/api/predict",
    ]);
    const [, init] = fetchMock.mock.calls[3];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ coralCover: 50 });
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("encodes ids in the path", async () => {
    const fetchMock = useHttp(() => jsonResponse({}));
    await getReef("a/b");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/reefs/a%2Fb");
  });

  it("maps 404 to null", async () => {
    useHttp(() => jsonResponse({ detail: "Not found" }, 404));
    expect(await getReef("nope")).toBeNull();
    expect(await getExplanation("nope")).toBeNull();
  });

  it("rejects other errors with ApiError", async () => {
    useHttp(() => jsonResponse({ detail: "boom" }, 500));
    await expect(listReefs()).rejects.toBeInstanceOf(ApiError);
    await expect(getReef("palau")).rejects.toMatchObject({ status: 500 });
  });
});

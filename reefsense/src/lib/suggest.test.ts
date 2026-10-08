import { describe, expect, it } from "vitest";
import { suggestedReefs } from "@/lib/suggest";
import type { Reef } from "@/types/reef";

const reef = (id: string, over: Partial<Reef> & { dhw?: number } = {}): Reef => ({
  id,
  name: over.name ?? `Reef ${id}`,
  region: over.region ?? "Somewhere",
  latitude: 0,
  longitude: 0,
  resilienceProbability: over.resilienceProbability ?? 0.5,
  category: "Medium",
  metrics: { seaSurfaceTemp: null, coralCover: null, depth: null, heatStress: null, dhwMax12w: over.dhw ?? 1 },
});

describe("suggestedReefs", () => {
  const reefs = [
    reef("a", { region: "Nusa Penida", resilienceProbability: 0.6 }),
    reef("b", { name: "Reef Check site #1", resilienceProbability: 0.99, dhw: 30 }),
    reef("c", { resilienceProbability: 0.9 }),
    reef("d", { dhw: 12 }),
    reef("e"),
  ];

  it("picks the case study, a NOAA-gap reef, the most resilient named reef and the hottest", () => {
    const picks = suggestedReefs(reefs, ["zz", "e"]);
    expect(picks.map((p) => p.reef.id)).toEqual(["a", "e", "c", "d"]);
  });

  it("skips survey-ID names for the resilience pick and never repeats a reef", () => {
    const picks = suggestedReefs([reef("a", { region: "Nusa Penida", resilienceProbability: 0.95, dhw: 20 })]);
    expect(picks.map((p) => p.reef.id)).toEqual(["a"]);
  });

  it("returns nothing for no reefs", () => {
    expect(suggestedReefs([])).toEqual([]);
  });
});

describe("suggestedReefs, focus country", () => {
  const r = (id: string, region: string, res: number, dhw = 1) => ({
    id, name: `Reef ${id}`, region, latitude: 0, longitude: 0, resilienceProbability: res,
    category: "High" as const, metrics: { seaSurfaceTemp: null, coralCover: null, depth: null, heatStress: null, dhwMax12w: dhw },
  });
  it("prefers Indonesian reefs and falls back elsewhere per pick", () => {
    const reefs = [r("jp", "Okinawa, Japan", 0.99, 9), r("id1", "Bali, Indonesia", 0.8, 2), r("id2", "Aceh, Indonesia", 0.7, 3)];
    const picks = suggestedReefs(reefs, ["jp", "id2"]);
    expect(picks.map((p) => p.reef.id)).toEqual(["id2", "id1", "jp"]);
  });
});

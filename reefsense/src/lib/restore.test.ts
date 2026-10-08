import { describe, expect, it } from "vitest";
import { countriesByReefCount, countryOf, rankForRestoration } from "@/lib/restore";
import type { Reef } from "@/types/reef";

const reef = (id: string, region: string, resilience: number, cover: number | null): Reef => ({
  id,
  name: id,
  region,
  latitude: 0,
  longitude: 0,
  resilienceProbability: resilience,
  category: "High",
  metrics: { seaSurfaceTemp: null, coralCover: cover, depth: null, heatStress: null },
});

describe("countryOf", () => {
  it("reads the country from every region style in the data", () => {
    expect(countryOf("West Sumatra, Indonesia")).toBe("Indonesia");
    expect(countryOf("Nusa Penida")).toBe("Indonesia");
    expect(countryOf("Indonesia — Coral Triangle")).toBe("Indonesia");
    expect(countryOf("Japan — Okinawa")).toBe("Japan");
    expect(countryOf("Zanzibar — Tanzania")).toBe("Tanzania");
    expect(countryOf("Maldives")).toBe("Maldives");
  });
});

describe("rankForRestoration", () => {
  const reefs = [
    reef("a", "Bali, Indonesia", 0.9, 10),
    reef("b", "Bali, Indonesia", 0.6, 70),
    reef("c", "Aceh, Indonesia", 0.95, null),
    reef("d", "Okinawa, Japan", 0.99, 80),
  ];

  it("weights the criteria and keeps to the chosen country", () => {
    const r = rankForRestoration(reefs, { risk: 0.5, cover: 0.5 }, "Indonesia");
    expect(r.ranked.map((x) => x.reef.id)).toEqual(["b", "a"]);
    expect(r.ranked[0].score).toBeCloseTo(80); // (0.6 + 1.0) / 2
    expect(r.scored).toBe(2);
  });

  it("leaves out, and counts, reefs missing a weighted criterion", () => {
    expect(rankForRestoration(reefs, { risk: 0.5, cover: 0.5 }, "Indonesia").excluded).toBe(1);
    // With no weight on cover, the reef without a survey is scored too.
    const riskOnly = rankForRestoration(reefs, { risk: 1, cover: 0 }, "Indonesia");
    expect(riskOnly.ranked.map((x) => x.reef.id)).toEqual(["c", "a", "b"]);
    expect(riskOnly.excluded).toBe(0);
  });

  it("ranks nothing with no weight at all", () => {
    expect(rankForRestoration(reefs, { risk: 0, cover: 0 }, null).ranked).toEqual([]);
  });
});

describe("countriesByReefCount", () => {
  it("lists countries with most reefs first", () => {
    expect(countriesByReefCount([reef("a", "X, Japan", 1, 1), reef("b", "Nusa Penida", 1, 1), reef("c", "Y, Indonesia", 1, 1)])).toEqual([
      { country: "Indonesia", count: 2 },
      { country: "Japan", count: 1 },
    ]);
  });
});

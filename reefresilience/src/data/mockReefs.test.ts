import { describe, expect, it } from "vitest";
import { mockReefRecords } from "@/data/mockReefs";
import { categoryFromProbability } from "@/lib/reef";

describe("mockReefRecords", () => {
  it("has 15–25 reefs with unique ids", () => {
    expect(mockReefRecords.length).toBeGreaterThanOrEqual(15);
    expect(mockReefRecords.length).toBeLessThanOrEqual(25);
    const ids = mockReefRecords.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has valid coordinates", () => {
    for (const r of mockReefRecords) {
      expect(r.latitude).toBeGreaterThanOrEqual(-90);
      expect(r.latitude).toBeLessThanOrEqual(90);
      expect(r.longitude).toBeGreaterThanOrEqual(-180);
      expect(r.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("assigns categories consistent with the probability thresholds", () => {
    for (const r of mockReefRecords) {
      expect(r.category, r.id).toBe(categoryFromProbability(r.resilienceProbability));
    }
  });

  it("covers the key reef regions", () => {
    const names = mockReefRecords.map((r) => r.name);
    for (const name of [
      "Palau Reef",
      "Raja Ampat",
      "Gulf of Aqaba",
      "Mesoamerican Reef",
      "Florida Keys",
      "Baa Atoll",
      "Chagos Archipelago",
      "Kāneʻohe Bay",
      "Moorea",
      "Ningaloo Reef",
      "Aldabra Atoll",
    ]) {
      expect(names).toContain(name);
    }
    expect(names.filter((n) => n.includes("Great Barrier Reef")).length).toBeGreaterThanOrEqual(2);
  });

  it("matches the spec example for Palau", () => {
    const palau = mockReefRecords.find((r) => r.id === "palau")!;
    expect(palau).toMatchObject({
      latitude: 7.5,
      longitude: 134.6,
      resilienceProbability: 0.87,
      category: "High",
      metrics: {
        seaSurfaceTemp: 28.4,
        coralCover: 72,
        depth: 8.2,
        heatStress: "Low",
        humanPressure: "Low",
      },
    });
    expect(palau.contributions).toEqual([
      { feature: "Coral cover", contribution: 0.21 },
      { feature: "Lower heat stress", contribution: 0.17 },
      { feature: "Reef connectivity", contribution: 0.12 },
      { feature: "Depth", contribution: 0.08 },
      { feature: "Human pressure", contribution: -0.04 },
    ]);
  });

  it("never labels a negative heat contribution as 'Lower heat stress'", () => {
    for (const r of mockReefRecords) {
      for (const c of r.contributions) {
        if (c.feature === "Lower heat stress") expect(c.contribution, r.id).toBeGreaterThan(0);
      }
    }
  });

  it("has at least three reefs per category", () => {
    for (const cat of ["High", "Medium", "Low"] as const) {
      expect(mockReefRecords.filter((r) => r.category === cat).length).toBeGreaterThanOrEqual(3);
    }
  });
});

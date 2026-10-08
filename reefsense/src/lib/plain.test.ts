import { describe, expect, it } from "vitest";
import { bleachColor, eventForYear } from "@/lib/history";
import { chanceInWords, plainHeat, plainHistory, plainRisk } from "@/lib/plain";
import type { SurveyHistory } from "@/types/reef";

const history = (years: { year: number; meanBleachedPct: number | null }[]): SurveyHistory => ({
  reefId: "X",
  radiusKm: 10,
  nearestKm: 1,
  samples: years.length,
  locations: 1,
  coarseSamples: 0,
  sources: [],
  thresholdPct: 10,
  years: years.map((y) => ({
    ...y,
    samples: 1,
    locations: 1,
    bleachingSamples: y.meanBleachedPct == null ? 0 : 1,
    maxBleachedPct: y.meanBleachedPct,
    bleachedShare: null,
    coralCoverPct: null,
  })),
});

describe("chanceInWords", () => {
  it.each([
    [0.02, "less than 1 in 20"],
    [0.34, "about 1 in 3"],
    [0.1, "about 1 in 10"],
    [0.5, "about 5 in 10"],
    [0.71, "about 7 in 10"],
    [0.97, "more than 9 in 10"],
  ])("%s -> %s", (p, words) => expect(chanceInWords(p)).toBe(words));
});

describe("plain sentences", () => {
  it("states the risk with its meaning", () => {
    expect(plainRisk(0.34)).toContain("the chance of significant bleaching here at about 1 in 3,");
  });
  it("describes heat against NOAA's alert levels", () => {
    expect(plainHeat(null)).toBeNull();
    expect(plainHeat(0.4)).toContain("close to normal");
    expect(plainHeat(2.2)).toContain("not hot enough for NOAA");
    expect(plainHeat(5)).toContain("NOAA warns bleaching is likely");
    expect(plainHeat(9)).toContain("severe bleaching");
  });
  it("names the worst year and the mass bleaching event it fell in", () => {
    const text = plainHistory(history([{ year: 1998, meanBleachedPct: 75 }, { year: 2003, meanBleachedPct: 5 }]));
    expect(text).toBe(
      "In 1998, during the first global bleaching event, divers surveying within 10 km found on average 75% of corals bleached.",
    );
  });
  it("keeps proper nouns capitalised", () => {
    expect(plainHistory(history([{ year: 2005, meanBleachedPct: 40 }]))).toContain("during the Caribbean mass bleaching");
  });
  it("reports little bleaching honestly, and no surveys as none", () => {
    expect(plainHistory(history([{ year: 2016, meanBleachedPct: 1.5 }, { year: 2018, meanBleachedPct: 3.2 }]))).toBe(
      "Divers who surveyed within 10 km between 2016 and 2018 found little bleaching: never more than 3% of corals on average.",
    );
    expect(plainHistory(history([{ year: 2001, meanBleachedPct: null }]))).toContain("No past bleaching surveys");
    expect(plainHistory(null)).toBeNull();
  });
});

describe("bleaching history helpers", () => {
  it("finds the event a year falls in", () => {
    expect(eventForYear(2016)?.name).toBe("Third global bleaching event");
    expect(eventForYear(2012)).toBeNull();
  });
  it("colours observed bleaching on a light-to-dark scale", () => {
    expect(bleachColor(0)).toBe("#fde7e1".toUpperCase());
    expect(bleachColor(100)).toBe("#8D3C3C");
    expect(bleachColor(20)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

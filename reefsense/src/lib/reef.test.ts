import { describe, expect, it } from "vitest";
import {
  CATEGORY_COLORS,
  CATEGORY_THRESHOLDS,
  CORAL_COVER_GRADIENT,
  CORAL_COVER_MAX,
  RESILIENCE_GRADIENT,
  CORAL_COVER_NO_DATA,
  coralCoverColor,
  coralCoverNote,
  coverTrend,
  formatDay,
  heatBandShares,
  heatPeak,
  categoryFromProbability,
  categoryRangeLabel,
  environmentalSummary,
  explanationHeading,
  formatPercent,
  formatSigned,
  insightCopy,
  topPositiveFactors,
} from "@/lib/reef";

describe("categoryFromProbability", () => {
  it.each([
    [0.87, "High"],
    [0.66, "High"],
    [0.65, "Medium"],
    [0.4, "Medium"],
    [0.39, "Low"],
  ] as const)("%s -> %s", (p, expected) => {
    expect(categoryFromProbability(p)).toBe(expected);
  });

  it("uses the exported thresholds", () => {
    expect(CATEGORY_THRESHOLDS).toEqual({ high: 0.66, medium: 0.4 });
  });
});

describe("formatters", () => {
  it("formats percentages and signed values", () => {
    expect(formatPercent(0.87)).toBe("87%");
    expect(formatSigned(0.21)).toBe("+0.21");
    expect(formatSigned(-0.04)).toBe("\u22120.04");
  });
});

describe("category copy", () => {
  it("derives legend ranges from the thresholds", () => {
    expect(categoryRangeLabel("High")).toBe("≥ 66%");
    expect(categoryRangeLabel("Medium")).toBe("40–65%");
    expect(categoryRangeLabel("Low")).toBe("< 40%");
  });

  it("uses the spec heading for high resilience and hedged wording otherwise", () => {
    expect(explanationHeading("High")).toBe("Why does the model predict high resilience?");
    expect(explanationHeading("Medium")).toBe("Why does the model predict medium resilience?");
    expect(explanationHeading("Low")).toBe("Why does the model predict low resilience?");
  });

  it("provides insight titles and hedged bodies", () => {
    expect(insightCopy("High")).toEqual({
      title: "Conditions here favour this reef",
      body: "This reef shows environmental characteristics associated with stronger climate resilience in the model.",
    });
    expect(insightCopy("Medium").title).toBe("A mix of helpful and harmful conditions");
    expect(insightCopy("Low").title).toBe("Conditions here work against this reef");
  });

});

describe("topPositiveFactors", () => {
  it("returns the largest positive contributions first", () => {
    const result = topPositiveFactors([
      { feature: "Reef depth", contribution: 0.08 },
      { feature: "Accumulated heat stress (DHW)", contribution: -1.98 },
      { feature: "Wave exposure", contribution: 0.21 },
      { feature: "Distance to shore", contribution: 0.12 },
      { feature: "Water clarity (turbidity)", contribution: 0.17 },
    ]);
    expect(result.map((f) => f.feature)).toEqual([
      "Wave exposure",
      "Water clarity (turbidity)",
      "Distance to shore",
    ]);
  });

  it("does not mutate the input", () => {
    const input = [
      { feature: "A", contribution: 0.1 },
      { feature: "B", contribution: 0.2 },
    ];
    topPositiveFactors(input, 1);
    expect(input.map((f) => f.feature)).toEqual(["A", "B"]);
  });
});

describe("environmentalSummary", () => {
  it("summarises a reef with full data (Florida Keys, scored 2026-10-03)", () => {
    expect(
      environmentalSummary({
        seaSurfaceTemp: 30.75,
        coralCover: 14,
        depth: 5.2,
        dhwMax12w: 19.07,
        heatStress: "High",
      }),
    ).toBe(
      "Shallow reef (5.2 m) with low coral cover (14%) and high accumulated heat stress (19.1 DHW over 12 weeks) at a mean SST of 30.8 °C.",
    );
  });

  it("leaves out values missing from the source data instead of guessing", () => {
    expect(
      environmentalSummary({
        seaSurfaceTemp: 30.75,
        coralCover: null,
        depth: 5.2,
        dhwMax12w: 19.07,
        heatStress: "High",
      }),
    ).toBe(
      "Shallow reef (5.2 m) with high accumulated heat stress (19.1 DHW over 12 weeks) at a mean SST of 30.8 °C.",
    );
    expect(
      environmentalSummary({ seaSurfaceTemp: null, coralCover: null, depth: null, heatStress: null }),
    ).toBe("Reef.");
  });
});

describe("coral cover", () => {
  const base = { seaSurfaceTemp: 27.8, depth: 6, heatStress: "Moderate" as const };

  it("dates every survey value and gives the distance when it is not the reef's own", () => {
    expect(coralCoverNote({ ...base, coralCover: 36, coralCoverSource: "survey", coralCoverYear: 2019, coralCoverKm: 0 })).toBe("2019 survey");
    expect(coralCoverNote({ ...base, coralCover: 36, coralCoverSource: "survey", coralCoverYear: 2016, coralCoverKm: 3.2 })).toBe("2016 survey, 3.2 km away");
    expect(coralCoverNote({ ...base, coralCover: null })).toBe("no survey within 10 km");
  });

  it("includes the survey year in the summary", () => {
    expect(environmentalSummary({ ...base, coralCover: 36, coralCoverYear: 2019 })).toBe(
      "Shallow reef (6.0 m) with moderate coral cover (36%, 2019 survey) at a mean SST of 27.8 °C.",
    );
  });

  it("maps cover onto the sequential scale and marks missing data", () => {
    expect(coralCoverColor(0)).toBe("rgb(125, 223, 242)");
    expect(coralCoverColor(70)).toBe("rgb(22, 78, 90)");
    expect(coralCoverColor(95)).toBe("rgb(22, 78, 90)");
    expect(coralCoverColor(null)).toBe(CORAL_COVER_NO_DATA);
  });
});

describe("map gradients", () => {
  const stops = (g: string) => [...g.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));

  it("resilience gradient runs low → high with increasing stops inside 0–100%", () => {
    const s = stops(RESILIENCE_GRADIENT);
    expect(s).toEqual([...s].sort((a, b) => a - b));
    expect(s[0]).toBe(0);
    expect(s[s.length - 1]).toBe(100);
    expect(RESILIENCE_GRADIENT.indexOf(CATEGORY_COLORS.Low.base)).toBeLessThan(
      RESILIENCE_GRADIENT.indexOf(CATEGORY_COLORS.High.base),
    );
  });

  it("coral gradient spans 0% to the scale maximum", () => {
    const s = stops(CORAL_COVER_GRADIENT);
    expect(s[0]).toBe(0);
    expect(s[s.length - 1]).toBe(100);
    expect(CORAL_COVER_MAX).toBe(70);
  });
});

describe("formatDay", () => {
  it("formats ISO days without shifting them across time zones", () => {
    expect(formatDay("2026-10-04")).toBe("4 Oct 2026");
    expect(formatDay("2026-01-01", false)).toBe("1 Jan");
  });
});

describe("heatPeak", () => {
  it("finds the highest day and skips missing values", () => {
    expect(
      heatPeak([
        { date: "2026-07-01", dhw: 1.2 },
        { date: "2026-07-02", dhw: null },
        { date: "2026-07-03", dhw: 3.4 },
        { date: "2026-07-04", dhw: 2.0 },
      ]),
    ).toEqual({ date: "2026-07-03", dhw: 3.4 });
  });
  it("is null without data", () => {
    expect(heatPeak([{ date: "2026-07-01", dhw: null }])).toBeNull();
  });
});

describe("coverTrend", () => {
  it("returns the first and latest surveyed cover", () => {
    expect(
      coverTrend([
        { year: 1998, coralCoverPct: null },
        { year: 2001, coralCoverPct: 25.3 },
        { year: 2018, coralCoverPct: 25 },
      ]),
    ).toEqual({ first: { year: 2001, pct: 25.3 }, last: { year: 2018, pct: 25 } });
  });
  it("is null without cover records", () => {
    expect(coverTrend([{ year: 1998, coralCoverPct: null }])).toBeNull();
  });
});

describe("heatBandShares", () => {
  const reef = (category: "High" | "Medium" | "Low", dhw: number | null) => ({ category, metrics: { dhwMax12w: dhw } });
  it("bins reefs by peak DHW, with band shares per bin", () => {
    const bins = heatBandShares([reef("High", 0.5), reef("Low", 0.9), reef("Medium", 4), reef("Low", 12), reef("High", null)]);
    expect(bins.map((b) => b.count)).toEqual([2, 0, 0, 0, 1, 0, 1]);
    expect(bins[0].shares).toEqual({ High: 0.5, Medium: 0, Low: 0.5 });
    expect(bins[4].shares.Medium).toBe(1); // 4 DHW starts the 4–6 bin (NOAA Alert Level 1)
    expect(bins[1].shares).toEqual({ High: 0, Medium: 0, Low: 0 });
  });
});

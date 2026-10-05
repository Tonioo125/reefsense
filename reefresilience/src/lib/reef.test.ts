import { describe, expect, it } from "vitest";
import {
  CATEGORY_THRESHOLDS,
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
    expect(explanationHeading("Medium")).toBe("Why does the model predict moderate resilience?");
    expect(explanationHeading("Low")).toBe("Why does the model predict lower resilience?");
  });

  it("provides insight titles and hedged bodies", () => {
    expect(insightCopy("High")).toEqual({
      title: "High resilience potential",
      body: "This reef shows environmental characteristics associated with stronger climate resilience in the model.",
    });
    expect(insightCopy("Medium").title).toBe("Moderate resilience potential");
    expect(insightCopy("Low").title).toBe("Limited resilience potential");
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

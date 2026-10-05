import { describe, expect, it } from "vitest";
import {
  CATEGORY_THRESHOLDS,
  ENVIRONMENTAL_VARIABLES,
  categoryFromProbability,
  categoryRangeLabel,
  confidenceLabel,
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

  it("labels model confidence", () => {
    expect(confidenceLabel(0.84)).toBe("High");
    expect(confidenceLabel(0.75)).toBe("High");
    expect(confidenceLabel(0.6)).toBe("Moderate");
    expect(confidenceLabel(0.59)).toBe("Limited");
  });
});

describe("topPositiveFactors", () => {
  it("returns the largest positive contributions first", () => {
    const result = topPositiveFactors([
      { feature: "Depth", contribution: 0.08 },
      { feature: "Human pressure", contribution: -0.04 },
      { feature: "Coral cover", contribution: 0.21 },
      { feature: "Reef connectivity", contribution: 0.12 },
      { feature: "Lower heat stress", contribution: 0.17 },
    ]);
    expect(result.map((f) => f.feature)).toEqual([
      "Coral cover",
      "Lower heat stress",
      "Reef connectivity",
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
  it("summarises Palau exactly", () => {
    expect(
      environmentalSummary({
        seaSurfaceTemp: 28.4,
        coralCover: 72,
        depth: 8.2,
        heatStress: "Low",
        humanPressure: "Low",
      }),
    ).toBe(
      "Mid-depth reef (8.2 m) with high coral cover (72%), low heat stress and low human pressure at a mean SST of 28.4 °C.",
    );
  });

  it("classifies shallow, low-cover reefs", () => {
    expect(
      environmentalSummary({
        seaSurfaceTemp: 30.1,
        coralCover: 14,
        depth: 6.4,
        heatStress: "High",
        humanPressure: "High",
      }),
    ).toMatch(/^Shallow reef \(6\.4 m\) with low coral cover \(14%\), high heat stress/);
  });
});

describe("ENVIRONMENTAL_VARIABLES", () => {
  it("lists the five predictors in spec order", () => {
    expect(ENVIRONMENTAL_VARIABLES.map((v) => v.label)).toEqual([
      "Sea surface temperature",
      "Coral cover",
      "Depth",
      "Heat stress",
      "Human pressure",
    ]);
  });
});

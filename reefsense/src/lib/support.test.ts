import { describe, expect, it } from "vitest";
import { hasSupport, languageNote, reachLabel } from "@/lib/support";
import type { ReefSupport } from "@/types/reef";

describe("reachLabel", () => {
  it("describes where the organisation works", () => {
    expect(reachLabel({ reach: "local", scope: "Kochi Prefecture" })).toBe("Works in Kochi Prefecture");
    expect(reachLabel({ reach: "national", scope: "Japan" })).toBe("Works across Japan");
    expect(reachLabel({ reach: "global", scope: "Global" })).toBe("Global reef programme");
  });
});

describe("languageNote", () => {
  it("names non-English page languages", () => {
    expect(languageNote("ja")).toBe("Site in Japanese");
    expect(languageNote("xx")).toBe("Site in XX");
  });

  it("is null for English or unknown", () => {
    expect(languageNote("en")).toBeNull();
    expect(languageNote(null)).toBeNull();
    expect(languageNote(undefined)).toBeNull();
  });
});

describe("hasSupport", () => {
  const org = {
    id: "a",
    name: "A",
    url: "https://a.test/donate/",
    description: "Reef work.",
    scope: "Japan",
    reach: "national" as const,
    language: "en",
    verifiedOn: "2026-10-08",
  };
  const support = (organisations: ReefSupport["organisations"]): ReefSupport => ({
    reefId: "X",
    tier: "country",
    organisations,
  });

  it("needs at least one organisation", () => {
    expect(hasSupport(null)).toBe(false);
    expect(hasSupport(support([]))).toBe(false);
    expect(hasSupport(support([org]))).toBe(true);
  });
});

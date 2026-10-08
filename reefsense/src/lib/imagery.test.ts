import { describe, expect, it } from "vitest";
import {
  ESRI_IMAGERY_ATTRIBUTION,
  ESRI_IMAGERY_URL,
  licenseLabel,
  photoAlt,
  photoCredit,
} from "@/lib/imagery";
import type { ReefPhoto } from "@/types/reef";

// Fixture photos stand in for API data (there is no mock mode in the app).
const photo = (over: Partial<ReefPhoto> = {}): ReefPhoto => ({
  id: "739315777",
  url: "https://inaturalist-open-data.s3.amazonaws.com/photos/739315777/medium.jpg",
  largeUrl: "https://inaturalist-open-data.s3.amazonaws.com/photos/739315777/large.jpg",
  width: 500,
  height: 375,
  attribution: "(c) Nurhafizh Sri Albarra, some rights reserved (CC BY-NC)",
  license: "cc-by-nc",
  photographer: "Nurhafizh Sri Albarra",
  observationUrl: "https://www.inaturalist.org/observations/402707430",
  observedOn: "2026-09-23",
  taxon: "Acanthogorgia",
  distanceKm: 0.06,
  ...over,
});

describe("licence labels", () => {
  it("formats Creative Commons codes", () => {
    expect(licenseLabel("cc0")).toBe("CC0");
    expect(licenseLabel("cc-by")).toBe("CC BY");
    expect(licenseLabel("cc-by-nc")).toBe("CC BY-NC");
    expect(licenseLabel("cc-by-nc-sa")).toBe("CC BY-NC-SA");
  });

  it("falls back to the upper-cased code", () => {
    expect(licenseLabel("pd")).toBe("PD");
  });
});

describe("photo text", () => {
  it("describes the photo for screen readers", () => {
    expect(photoAlt(photo(), "Crystal Bay")).toBe(
      "Acanthogorgia photographed about 0.1 km from Crystal Bay",
    );
    expect(photoAlt(photo({ distanceKm: 8.72, taxon: "Acropora" }), "Nusa Penida")).toBe(
      "Acropora photographed about 8.7 km from Nusa Penida",
    );
    // The pipeline stores null when an observation has no taxon name.
    expect(photoAlt(photo({ taxon: null }), "Crystal Bay")).toBe(
      "Coral photographed about 0.1 km from Crystal Bay",
    );
  });

  it("credits the photographer and licence", () => {
    expect(photoCredit(photo())).toBe("Nurhafizh Sri Albarra · CC BY-NC");
    expect(photoCredit(photo({ photographer: "reefdiver", license: "cc0" }))).toBe("reefdiver · CC0");
  });
});

describe("satellite tiles", () => {
  it("uses the Esri World Imagery template with attribution", () => {
    expect(ESRI_IMAGERY_URL).toMatch(/^https:\/\/server\.arcgisonline\.com\//);
    expect(ESRI_IMAGERY_URL).toContain("{z}/{y}/{x}");
    expect(ESRI_IMAGERY_ATTRIBUTION).toContain("Esri");
  });
});

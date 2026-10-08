import type { ReefPhoto } from "@/types/reef";

/** Esri World Imagery tiles for the satellite view (note the {y}/{x} order of the ArcGIS REST API). */
export const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const ESRI_IMAGERY_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
/** Zoom of the satellite view: a few kilometres around the reef. */
export const SATELLITE_ZOOM = 13;
/** Search radius for community photos (mirrors pipeline/06_fetch_reef_photos.py --radius-km). */
export const PHOTO_RADIUS_KM = 10;

/** Display label for a Creative Commons licence code, e.g. "cc-by-nc" -> "CC BY-NC". */
export function licenseLabel(code: string): string {
  const c = code.trim().toLowerCase();
  if (c === "cc0") return "CC0";
  if (c.startsWith("cc-")) return `CC ${c.slice(3).toUpperCase()}`;
  return code.toUpperCase();
}

/** Alt text, e.g. "Acanthogorgia photographed about 0.1 km from Crystal Bay". */
export function photoAlt(photo: ReefPhoto, reefName: string): string {
  return `${photo.taxon || "Coral"} photographed about ${photo.distanceKm.toFixed(1)} km from ${reefName}`;
}

/** Credit line, e.g. "Nurhafizh Sri Albarra · CC BY-NC". */
export function photoCredit(photo: ReefPhoto): string {
  return `${photo.photographer} · ${licenseLabel(photo.license)}`;
}

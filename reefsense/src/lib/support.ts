import type { ReefSupport, SupportOrganisation } from "@/types/reef";

/** Where the organisation works: "Works in Kochi Prefecture", "Works across Japan", "Global reef programme". */
export function reachLabel(org: Pick<SupportOrganisation, "reach" | "scope">): string {
  if (org.reach === "global") return "Global reef programme";
  return org.reach === "national" ? `Works across ${org.scope}` : `Works in ${org.scope}`;
}

const LANGUAGES: Record<string, string> = {
  ja: "Japanese",
  id: "Indonesian",
  ms: "Malay",
  th: "Thai",
  vi: "Vietnamese",
  zh: "Chinese",
  km: "Khmer",
  fil: "Filipino",
};

/** "Site in Japanese" when the linked page is not in English; null otherwise. */
export function languageNote(language: string | null | undefined): string | null {
  if (!language || language === "en") return null;
  return `Site in ${LANGUAGES[language] ?? language.toUpperCase()}`;
}

/** True when there is at least one organisation to show. */
export function hasSupport(data: ReefSupport | null): data is ReefSupport {
  return data != null && data.organisations.length > 0;
}

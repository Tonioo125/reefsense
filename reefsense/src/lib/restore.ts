import type { Reef } from "@/types/reef";

/** Bali sites in the demo list carry a place name but no country. */
const BALI = new Set([
  "Nusa Penida",
  "Nusa Lembongan",
  "Padang Bai",
  "East Bali",
  "West Bali",
  "North Bali",
  "South Bali",
]);
/** "Place — detail" regions whose first part is not the country. */
const PLACE_COUNTRY: Record<string, string> = { Zanzibar: "Tanzania", "Hawaiʻi": "United States" };

/** The country a reef's region belongs to, e.g. "West Sumatra, Indonesia" -> "Indonesia". */
export function countryOf(region: string): string {
  if (region.includes(", ")) return region.slice(region.lastIndexOf(", ") + 2);
  if (BALI.has(region)) return "Indonesia";
  const place = region.split(" — ")[0];
  return PLACE_COUNTRY[place] ?? place;
}

/** Coral cover counts in full from this share of the seabed (the map legend's "70%+"). */
export const FULL_COVER_PCT = 70;

export interface RestoreWeights {
  /** Weight on low near-term bleaching risk (the model), 0–1. */
  risk: number;
  /** Weight on healthy coral cover today (latest dive survey within 10 km), 0–1. */
  cover: number;
}

export interface RankedReef {
  reef: Reef;
  /** 0–100: the weighted average of the criteria. */
  score: number;
  /** Each criterion on 0–1, null when it has no data. */
  safety: number;
  cover: number | null;
}

export interface Ranking {
  ranked: RankedReef[];
  /** Reefs in scope with data for every weighted criterion. */
  scored: number;
  /** Reefs in scope left out because a weighted criterion has no data (never scored on less). */
  excluded: number;
}

/**
 * A transparent restoration ranking: reefs where effort is most likely to last, by low near-term
 * bleaching risk and healthy coral cover. A reef missing a criterion that carries weight is left out
 * and counted, rather than quietly scored on the remaining criteria.
 */
export function rankForRestoration(
  reefs: Reef[],
  weights: RestoreWeights,
  country: string | null,
  limit = 10,
): Ranking {
  const total = weights.risk + weights.cover;
  const scope = country ? reefs.filter((r) => countryOf(r.region) === country) : reefs;
  if (total <= 0) return { ranked: [], scored: 0, excluded: scope.length };

  const scoredReefs: RankedReef[] = [];
  let excluded = 0;
  for (const reef of scope) {
    const pct = reef.metrics.coralCover;
    const cover = pct == null ? null : Math.min(pct / FULL_COVER_PCT, 1);
    if (weights.cover > 0 && cover == null) {
      excluded++;
      continue;
    }
    const safety = reef.resilienceProbability;
    const score = (100 * (weights.risk * safety + weights.cover * (cover ?? 0))) / total;
    scoredReefs.push({ reef, score, safety, cover });
  }
  scoredReefs.sort((a, b) => b.score - a.score || b.safety - a.safety);
  return { ranked: scoredReefs.slice(0, limit), scored: scoredReefs.length, excluded };
}

/** Countries in the data, most reefs first, for the scope picker. */
export function countriesByReefCount(reefs: Reef[]): { country: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reefs) {
    const c = countryOf(r.region);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
}

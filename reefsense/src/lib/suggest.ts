import { countryOf } from "@/lib/restore";
import type { Reef } from "@/types/reef";

export interface SuggestedReef {
  reef: Reef;
  /** Why this reef is worth opening, in plain words. */
  reason: string;
}

/** Reefs named after a survey record ("Reef Check site #5831") rather than a place. */
const isSurveyId = (r: Reef) => /\bsite #\d+/i.test(r.name);

/**
 * A few reefs worth opening first, picked from the data and Indonesia first: the Nusa Penida case
 * study, the highest-risk reef NOAA's alerts did not cover, the named reef the model rates most
 * resilient, and the reef under the most heat.
 * Each reef appears once; a rule with no match is skipped.
 */
export function suggestedReefs(
  allReefs: Reef[],
  noaaGapIds: string[] = [],
  max = 4,
  focus = "Indonesia",
): SuggestedReef[] {
  // Each pick prefers the focus country and falls back to every reef when it has no match there.
  const local = allReefs.filter((r) => countryOf(r.region) === focus);
  const picked: SuggestedReef[] = [];
  const isPicked = (r: Reef) => picked.some((p) => p.reef.id === r.id);
  /** `rank` orders a pool best-first; the first reef not already picked wins. */
  const add = (rank: (pool: Reef[]) => Reef[], reason: string) => {
    const reef = rank(local).find((r) => !isPicked(r)) ?? rank(allReefs).find((r) => !isPicked(r));
    if (reef) picked.push({ reef, reason });
  };
  const named = (pool: Reef[]) => pool.filter((r) => !isSurveyId(r));
  const gapOrder = new Map(noaaGapIds.map((id, i) => [id, i]));

  add((pool) => pool.filter((r) => /nusa penida/i.test(r.region)), "Case study site, Nusa Penida, Bali");
  add((pool) => {
    // Highest-risk first (the order of noaaGapIds), place names before survey records.
    const gap = pool.filter((r) => gapOrder.has(r.id)).sort((a, b) => gapOrder.get(a.id)! - gapOrder.get(b.id)!);
    return [...named(gap), ...gap.filter(isSurveyId)];
  }, "At risk, but no NOAA heat alert");
  add(
    (pool) => named(pool).sort((a, b) => b.resilienceProbability - a.resilienceProbability),
    "Among the most resilient predictions",
  );
  add((pool) => {
    const hot = (list: Reef[]) =>
      list
        .filter((r) => r.metrics.dhwMax12w != null)
        .sort((a, b) => (b.metrics.dhwMax12w ?? 0) - (a.metrics.dhwMax12w ?? 0));
    return [...hot(named(pool)), ...hot(pool.filter(isSurveyId))];
  }, "Hottest water in the last 12 weeks");
  return picked.slice(0, max);
}

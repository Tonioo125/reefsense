/**
 * Plain-language mode: the model's numbers and the survey record, in everyday words.
 * Every sentence is built from data on the page; nothing is added that the data does not say.
 */
import { eventForYear } from "@/lib/history";
import type { SurveyHistory } from "@/types/reef";

/** "about 1 in 3", "less than 1 in 20", "about 7 in 10". */
export function chanceInWords(p: number): string {
  if (p < 0.05) return "less than 1 in 20";
  if (p < 0.5) return `about 1 in ${Math.round(1 / p)}`;
  if (p > 0.95) return "more than 9 in 10";
  return `about ${Math.round(p * 10)} in 10`;
}

/** The predicted risk as a sentence a non-specialist can read. */
export function plainRisk(bleachingProbability: number): string {
  return (
    `Based on recent ocean heat and this reef's local conditions, the model puts the chance of ` +
    `significant bleaching here at ${chanceInWords(bleachingProbability)}, ` +
    `meaning at least 1 in 10 corals turning white.`
  );
}

/** Peak heat stress over 12 weeks, described against NOAA's alert levels (4 and 8 DHW). */
export function plainHeat(dhwMax12w: number | null | undefined): string | null {
  if (dhwMax12w == null) return null;
  if (dhwMax12w < 1) return "The water here has stayed close to normal over the past 12 weeks.";
  if (dhwMax12w < 4)
    return "The water has been warmer than usual over the past 12 weeks, but not hot enough for NOAA to warn that bleaching is likely.";
  if (dhwMax12w < 8)
    return "The water has been hot for long enough over the past 12 weeks that NOAA warns bleaching is likely.";
  return "The water has been hot for long enough over the past 12 weeks that NOAA warns of severe bleaching and coral deaths.";
}

/** NOAA's alerts stayed quiet, but the model still sees risk. */
export const PLAIN_NOAA_GAP =
  "NOAA's heat alerts did not go off here, but local conditions still raise the risk, so it is worth keeping an eye on.";

/** The worst bleaching recorded nearby, linked to a mass bleaching event when it fell in one. */
export function plainHistory(history: SurveyHistory | null): string | null {
  if (!history) return null;
  const surveyed = history.years.filter((y) => y.meanBleachedPct != null);
  if (!surveyed.length) return `No past bleaching surveys were recorded within ${history.radiusKm} km of this reef.`;
  const worst = surveyed.reduce((a, b) => ((b.meanBleachedPct ?? 0) > (a.meanBleachedPct ?? 0) ? b : a));
  const pct = Math.round(worst.meanBleachedPct ?? 0);
  const first = surveyed[0].year;
  const last = surveyed[surveyed.length - 1].year;
  if (pct < history.thresholdPct) {
    const span = first === last ? `in ${first}` : `between ${first} and ${last}`;
    return `Divers who surveyed within ${history.radiusKm} km ${span} found little bleaching: never more than ${pct}% of corals on average.`;
  }
  const event = eventForYear(worst.year);
  const when = event ? `In ${worst.year}, during the ${event.phrase},` : `In ${worst.year},`;
  return `${when} divers surveying within ${history.radiusKm} km found on average ${pct}% of corals bleached.`;
}

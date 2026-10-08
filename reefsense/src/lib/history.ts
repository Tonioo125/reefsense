import { PALETTE, RESILIENCE } from "@/lib/palette";

/**
 * Bleaching history: the mass bleaching events of the survey era and the colour scale for observed
 * bleaching on the replay map.
 */

export interface BleachingEvent {
  start: number;
  end: number;
  name: string;
  /** The name as it reads mid-sentence: "during the …". */
  phrase: string;
  note: string;
}

/**
 * Mass bleaching events recognised by NOAA Coral Reef Watch that fall within the survey record
 * (GCBD ends in 2020; the fourth global event began in 2023).
 */
export const BLEACHING_EVENTS: BleachingEvent[] = [
  { start: 1998, end: 1998, name: "First global bleaching event", phrase: "first global bleaching event", note: "Driven by the very strong 1997–98 El Niño." },
  { start: 2005, end: 2005, name: "Caribbean mass bleaching", phrase: "Caribbean mass bleaching", note: "A record marine heatwave across the Caribbean." },
  { start: 2010, end: 2010, name: "Second global bleaching event", phrase: "second global bleaching event", note: "During the 2009–10 El Niño." },
  {
    start: 2014,
    end: 2017,
    name: "Third global bleaching event",
    phrase: "third global bleaching event",
    note: "The longest on record, peaking with the 2015–16 El Niño.",
  },
];

export function eventForYear(year: number): BleachingEvent | null {
  return BLEACHING_EVENTS.find((e) => year >= e.start && year <= e.end) ?? null;
}

/** Fewer surveys than this in a year: the share bleached is a small sample. */
export const FEW_SURVEYS = 100;

/** Sequential scale for observed % of colonies bleached: one hue, light (none) to dark (severe). */
export const BLEACH_STOPS: { pct: number; color: string }[] = [
  // The two light stops are derived tints between coralSoft and coral.
  { pct: 0, color: "#FDE7E1" },
  { pct: 10, color: "#FFB49F" },
  { pct: 30, color: PALETTE.coral },
  { pct: 50, color: RESILIENCE.Low.base },
  { pct: 75, color: RESILIENCE.Low.text },
];

export const BLEACH_GRADIENT = `linear-gradient(to right, ${BLEACH_STOPS.map(
  (s) => `${s.color} ${(s.pct / 75) * 100}%`,
).join(", ")})`;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** Colour for an observed % bleached, interpolated between BLEACH_STOPS. */
export function bleachColor(pct: number): string {
  const stops = BLEACH_STOPS;
  if (pct <= stops[0].pct) return stops[0].color;
  for (let i = 1; i < stops.length; i++) {
    if (pct <= stops[i].pct) {
      const t = (pct - stops[i - 1].pct) / (stops[i].pct - stops[i - 1].pct);
      const a = hex(stops[i - 1].color);
      const b = hex(stops[i].color);
      return `#${a.map((v, k) => Math.round(v + (b[k] - v) * t).toString(16).padStart(2, "0")).join("")}`;
    }
  }
  return stops[stops.length - 1].color;
}

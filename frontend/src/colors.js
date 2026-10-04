// Markers literally bleach: living coral pink fades to bleached white as risk rises.
const LIVING = [181, 71, 107];
const BLEACHED = [245, 242, 233];

export function bleachColor(p) {
  if (p == null) return "#c9d3d0";
  const t = Math.min(Math.max(p, 0), 1);
  const mix = LIVING.map((c, i) => Math.round(c + (BLEACHED[i] - c) * t));
  return `rgb(${mix.join(",")})`;
}

export const ALERT_LABELS = ["No stress", "Watch", "Warning", "Alert level 1", "Alert level 2", "Alert level 3", "Alert level 4", "Alert level 5"];

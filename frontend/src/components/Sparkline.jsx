// 90-day Degree Heating Weeks with NOAA's 4 and 8 °C-week reference lines.
export default function Sparkline({ series }) {
  const pts = series.filter((p) => p.dhw != null);
  if (pts.length < 2) return <p className="muted">No recent heat-stress record for this pixel.</p>;

  const w = 320, h = 96, pad = 4;
  const max = Math.max(9, ...pts.map((p) => p.dhw));
  const x = (i) => pad + (i / (pts.length - 1)) * (w - 2 * pad);
  const y = (v) => h - pad - (v / max) * (h - 2 * pad);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.dhw).toFixed(1)}`).join(" ");

  return (
    <figure className="spark">
      <svg viewBox={`0 0 ${w} ${h}`} role="img"
        aria-label={`Degree Heating Weeks over the last ${pts.length} days, latest ${pts.at(-1).dhw.toFixed(1)}`}>
        {[4, 8].map((t) => (
          <g key={t}>
            <line x1={pad} x2={w - pad} y1={y(t)} y2={y(t)} className="spark-ref" />
            <text x={w - pad} y={y(t) - 3} textAnchor="end" className="spark-label">{t} DHW</text>
          </g>
        ))}
        <path d={line} className="spark-line" />
      </svg>
      <figcaption>Heat stress, last 90 days ({pts[0].t} to {pts.at(-1).t})</figcaption>
    </figure>
  );
}

import { ALERT_LABELS, bleachColor } from "../colors.js";
import Sparkline from "./Sparkline.jsx";

const pct = (p) => `${Math.round(p * 100)}%`;
const fmt = (v, d = 1) => (v == null ? "n/a" : v.toFixed(d));

export default function SitePanel({ site }) {
  if (!site) return <p className="muted">Select a reef on the map to see its outlook.</p>;
  const p = site.bleaching_probability;
  const h = site.heat;

  return (
    <article className="site">
      <h2>{site.name}</h2>
      <p className="muted">{site.region}</p>

      <div className="verdict">
        <div className="swatch" style={{ background: bleachColor(p) }} aria-hidden="true" />
        {p == null ? (
          <p>No live heat-stress data for this site yet. Check its coordinates in <code>demo_sites.csv</code>.</p>
        ) : (
          <p><strong className="big">{pct(p)}</strong> likelihood of bleaching under the heat stress of the past 12 weeks.</p>
        )}
      </div>

      <dl className="facts">
        <div><dt>Heat stress now</dt><dd>{fmt(h.dhw_now)} DHW</dd></div>
        <div><dt>Peak, last 12 weeks</dt><dd>{fmt(h.dhw_max_12w)} DHW</dd></div>
        <div><dt>Sea temperature anomaly</dt><dd>{fmt(h.ssta_mean_30d)} °C</dd></div>
        <div><dt>NOAA status</dt><dd>{h.alert_level == null ? "n/a" : ALERT_LABELS[h.alert_level] ?? h.alert_level}</dd></div>
      </dl>

      {h.series?.length > 0 && <Sparkline series={h.series} />}

      {site.drivers?.length > 0 && (
        <section>
          <h3>Why the model thinks so</h3>
          <ul className="drivers">
            {site.drivers.map((d) => (
              <li key={d.feature} className={d.effect === "raises risk" ? "up" : "down"}>
                <span>{d.label}</span><span>{d.effect}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Non-heat conditions are taken from surveyed reefs {site.nearest_survey_km} km away and closer.
          </p>
        </section>
      )}
    </article>
  );
}

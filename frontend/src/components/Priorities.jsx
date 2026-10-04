import { useEffect, useState } from "react";
import { fetchRanking } from "../api.js";

const DEFAULTS = { heat_safety: 0.45, coral_cover: 0.25, refugia: 0.2, connectivity: 0.1 };

export default function Priorities({ criteria, onSelect }) {
  const [weights, setWeights] = useState(DEFAULTS);
  const [ranking, setRanking] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRanking(weights).then(setRanking).catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [weights]);

  return (
    <section className="priorities">
      <p className="muted">Set what matters for your restoration programme. The ranking updates as you go.</p>
      <div className="weights">
        {Object.entries(criteria).map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input type="range" min="0" max="1" step="0.05" value={weights[key]}
              onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })} />
          </label>
        ))}
        <button className="link" onClick={() => setWeights(DEFAULTS)}>Reset weights</button>
      </div>

      {error && <p className="notice">{error}</p>}
      <ol className="ranking">
        {ranking?.sites.map((r) => (
          <li key={r.site_id}>
            <button onClick={() => onSelect(r.site_id)}>
              <span className="name">{r.name}<small>{r.region}</small></span>
              <span className="score">{r.score ?? "n/a"}</span>
            </button>
            {r.missing.length > 0 && <p className="small muted">Not scored on: {r.missing.join(", ")}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

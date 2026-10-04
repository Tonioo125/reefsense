// Shows model skill against the plain DHW rule, so the AI's added value is visible, not claimed.
export default function ModelNote({ metrics }) {
  const m = metrics?.model;
  if (!m?.roc_auc) return null;
  const base = metrics.baseline_dhw?.roc_auc;
  return (
    <footer className="model-note small">
      Bleaching model AUC {m.roc_auc.toFixed(2)}
      {base != null && <> vs {base.toFixed(2)} for heat stress alone</>}
      {" "}({metrics.n_rows.toLocaleString()} surveys, {metrics.validation}).
    </footer>
  );
}

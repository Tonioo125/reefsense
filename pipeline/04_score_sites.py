"""Score demo sites with the trained model and live CRW heat stress; write sites_scored.json for the API.

python pipeline/04_score_sites.py
"""
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

from common import filter_region, load_gcbd, to_json_safe
from config import (CRW_OVERRIDES, CRW_TIMESERIES, FEATURE_LABELS, METRICS_PATH,
                    MODEL_PATH, SITES_CSV, SITES_SCORED)

EARTH_RADIUS_KM = 6371.0
NEIGHBOURS = 5


def heat_summary(ts):
    ts = ts.sort_values("time")
    if ts.empty or ts["CRW_DHW"].isna().all():
        return {"dhw_now": None, "dhw_max_12w": None, "ssta_mean_30d": None, "alert_level": None, "series": []}
    last = ts["time"].max()
    w12 = ts[ts["time"] > last - pd.Timedelta(days=84)]
    w30 = ts[ts["time"] > last - pd.Timedelta(days=30)]
    tail = ts[ts["time"] > last - pd.Timedelta(days=90)]
    return {
        "dhw_now": ts["CRW_DHW"].dropna().iloc[-1],
        "dhw_max_12w": w12["CRW_DHW"].max(),
        "ssta_mean_30d": w30["CRW_SSTANOMALY"].mean(),
        "alert_level": ts["CRW_BAA"].dropna().iloc[-1] if ts["CRW_BAA"].notna().any() else None,
        "as_of": last.strftime("%Y-%m-%d"),
        "series": [{"t": t.strftime("%Y-%m-%d"), "dhw": to_json_safe(v)}
                   for t, v in zip(tail["time"], tail["CRW_DHW"])],
    }


def optional(value, cast=float):
    return None if pd.isna(value) else cast(value)


def main():
    bundle = joblib.load(MODEL_PATH)
    model, features = bundle["model"], bundle["features"]
    sites = pd.read_csv(SITES_CSV)
    crw = pd.read_csv(CRW_TIMESERIES, parse_dates=["time"])

    # Static (non-thermal) features come from the nearest surveyed reefs.
    gcbd = filter_region(load_gcbd(), bundle["region"])
    survey = gcbd.groupby(["lat", "lon"])[features].median().reset_index()
    tree = BallTree(np.radians(survey[["lat", "lon"]].to_numpy()), metric="haversine")

    out = []
    for site in sites.itertuples():
        heat = heat_summary(crw[crw["site_id"] == site.site_id])
        dist, idx = tree.query(np.radians([[site.lat, site.lon]]), k=min(NEIGHBOURS, len(survey)))
        neighbours = survey.iloc[idx[0]]
        row = {f: neighbours[f].median() for f in features}
        for feat, key in CRW_OVERRIDES.items():
            if feat in row and heat.get(key) is not None:
                row[feat] = heat[key]

        X = pd.DataFrame([row])[features]
        prob = None if heat["dhw_max_12w"] is None else float(model.predict_proba(X)[0, 1])
        contrib = model.predict(X, pred_contrib=True)[0][:-1]  # per-feature log-odds contributions
        drivers = [
            {"feature": f, "label": FEATURE_LABELS.get(f, f), "value": to_json_safe(row[f]),
             "effect": "raises risk" if c > 0 else "lowers risk", "contribution": round(float(c), 4)}
            for f, c in sorted(zip(features, contrib), key=lambda p: -abs(p[1]))[:3]
        ]

        out.append({
            "site_id": site.site_id, "name": site.name, "region": site.region,
            "lat": site.lat, "lon": site.lon,
            "bleaching_probability": to_json_safe(prob),
            "heat": {k: to_json_safe(v) if k != "series" else v for k, v in heat.items()},
            "drivers": drivers,
            "nearest_survey_km": round(float(dist[0][0] * EARTH_RADIUS_KM), 1),
            "coral_cover_pct": optional(site.coral_cover_pct),
            "refugia_50reefs_plus": optional(site.refugia_50reefs_plus, lambda v: bool(int(v))),
            "connectivity": optional(site.connectivity),
            "in_mpa": optional(site.in_mpa, lambda v: bool(int(v))),
        })
        print(f"{site.site_id} {site.name}: p={prob}")

    metrics = json.loads(METRICS_PATH.read_text()) if METRICS_PATH.exists() else {}
    SITES_SCORED.write_text(json.dumps({"model": metrics, "sites": out}, indent=2))
    print(f"Wrote {SITES_SCORED}")


if __name__ == "__main__":
    main()

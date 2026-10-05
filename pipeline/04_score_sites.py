"""Score sites with the trained model and live CRW heat stress; write sites_scored.json for the API.

python pipeline/04_score_sites.py
"""
import json

import pandas as pd

from common import to_json_safe
from config import CRW_TIMESERIES, METRICS_PATH, SITES_CSV, SITES_SCORED
from inference import Scorer


def heat_summary(ts):
    ts = ts.sort_values("time")
    if ts.empty or ts["CRW_DHW"].isna().all():
        return {"dhw_now": None, "dhw_max_12w": None, "ssta_mean_30d": None, "sst_mean_30d": None,
                "alert_level": None, "series": []}
    last = ts["time"].max()
    w12 = ts[ts["time"] > last - pd.Timedelta(days=84)]
    w30 = ts[ts["time"] > last - pd.Timedelta(days=30)]
    tail = ts[ts["time"] > last - pd.Timedelta(days=90)]
    return {
        "dhw_now": ts["CRW_DHW"].dropna().iloc[-1],
        "dhw_max_12w": w12["CRW_DHW"].max(),
        "ssta_mean_30d": w30["CRW_SSTANOMALY"].mean(),
        "sst_mean_30d": w30["CRW_SST"].mean() if "CRW_SST" in w30 else None,
        "alert_level": ts["CRW_BAA"].dropna().iloc[-1] if ts["CRW_BAA"].notna().any() else None,
        "as_of": last.strftime("%Y-%m-%d"),
        "series": [{"t": t.strftime("%Y-%m-%d"), "dhw": to_json_safe(v)}
                   for t, v in zip(tail["time"], tail["CRW_DHW"])],
    }


def optional(value, cast=float):
    return None if pd.isna(value) else cast(value)


def main():
    scorer = Scorer()
    sites = pd.read_csv(SITES_CSV)
    crw = pd.read_csv(CRW_TIMESERIES, parse_dates=["time"])

    out = []
    for site in sites.itertuples():
        heat = heat_summary(crw[crw["site_id"] == site.site_id])
        row, context, nearest_km = scorer.feature_row(site.lat, site.lon, heat)
        prob, contributions = scorer.explain(row)
        if heat["dhw_max_12w"] is None:
            prob = None  # no live heat stress for this pixel: don't report a stale-climatology guess

        out.append({
            "site_id": site.site_id, "name": site.name, "region": site.region,
            "lat": site.lat, "lon": site.lon,
            "bleaching_probability": to_json_safe(prob),
            "heat": {k: to_json_safe(v) if k != "series" else v for k, v in heat.items()},
            "drivers": [
                {**d, "effect": "raises risk" if d["contribution"] > 0 else "lowers risk"}
                for d in contributions[:3]
            ],
            "contributions": contributions,
            "depth_m": to_json_safe(row.get("Depth_m")),
            "survey_coral_cover_pct": to_json_safe(context.get("Percent_Hard_Coral")),
            "nearest_survey_km": round(nearest_km, 1),
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

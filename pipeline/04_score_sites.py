"""Score sites with the trained model and live CRW heat stress; write sites_scored.json for the API.

python pipeline/04_score_sites.py
"""
import json

import pandas as pd

from common import to_json_safe
from config import CRW_HEAT_GRID, CRW_TIMESERIES, METRICS_PATH, SITE_FILES, SITES_SCORED
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


def grid_heat(row):
    """Heat summary from a 02b_fetch_crw_grid.py row (no daily series: grids are summarised on download)."""
    keys = ["dhw_now", "dhw_max_12w", "ssta_mean_30d", "sst_mean_30d", "alert_level", "as_of"]
    heat = {k: (None if pd.isna(row.get(k)) else row.get(k)) for k in keys}
    heat["series"] = []
    return heat


def load_sites():
    lists = [pd.read_csv(path) for path in SITE_FILES if path.exists()]
    sites = pd.concat(lists, ignore_index=True)
    dupes = sites["site_id"][sites["site_id"].duplicated()].unique()
    if len(dupes):
        raise SystemExit(f"Duplicate site_id across site lists: {list(dupes)[:5]}")
    return sites


def optional(value, cast=float):
    return None if pd.isna(value) else cast(value)


def main():
    scorer = Scorer()
    sites = load_sites()
    crw = (pd.read_csv(CRW_TIMESERIES, parse_dates=["time"]) if CRW_TIMESERIES.exists()
           else pd.DataFrame(columns=["site_id", "time", "CRW_DHW"]))
    grid = (pd.read_csv(CRW_HEAT_GRID).set_index("site_id") if CRW_HEAT_GRID.exists()
            else pd.DataFrame())

    out = []
    for site in sites.itertuples():
        heat = heat_summary(crw[crw["site_id"] == site.site_id])
        if heat["dhw_max_12w"] is None and site.site_id in grid.index:
            heat = grid_heat(grid.loc[site.site_id])
        row, nearest_km = scorer.feature_row(site.lat, site.lon, heat)
        cover = scorer.coral_cover(site.lat, site.lon) or {}
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
            "survey_coral_cover_pct": cover.get("pct"),
            "survey_coral_cover_year": cover.get("year"),
            "survey_coral_cover_km": cover.get("km"),
            "nearest_survey_km": round(nearest_km, 1),
            "coral_cover_pct": optional(site.coral_cover_pct),
            "refugia_50reefs_plus": optional(site.refugia_50reefs_plus, lambda v: bool(int(v))),
            "connectivity": optional(site.connectivity),
            "in_mpa": optional(site.in_mpa, lambda v: bool(int(v))),
        })
    scored = sum(s["bleaching_probability"] is not None for s in out)
    print(f"Scored {scored:,} of {len(out):,} sites; without heat data: "
          f"{[s['site_id'] for s in out if s['bleaching_probability'] is None][:10]}")

    metrics = json.loads(METRICS_PATH.read_text()) if METRICS_PATH.exists() else {}
    # Compact: with thousands of sites, indentation would roughly double the file.
    SITES_SCORED.write_text(json.dumps({"model": metrics, "sites": out}, separators=(",", ":")))
    print(f"Wrote {SITES_SCORED}")


if __name__ == "__main__":
    main()

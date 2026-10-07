"""Fetch NOAA Coral Reef Watch heat stress for many sites at once, as regional grids.

python pipeline/02b_fetch_crw_grid.py                      # every site in data/sites/gcbd_indonesia.csv
python pipeline/02b_fetch_crw_grid.py --sites my_sites.csv --out my_heat.csv

02_fetch_crw.py makes one request per site (~30 s each). Here sites are grouped into CELL_DEG cells and
each cell's bounding box is downloaded in two requests, which is far faster for dense site lists:
  - CRW_DHW, daily, last 84 days   -> dhw_now, dhw_max_12w (daily, so the 12-week peak is exact)
  - SST anomaly, SST, alert level, daily, last 30 days -> ssta_mean_30d, sst_mean_30d, alert_level
(ERDDAP requires every variable in one request to share the same time range, hence two requests.)
The daily DHW series behind each site's 12-week peak is saved alongside (CRW_HEAT_SERIES), for the
API's heat timeline. Each site uses its own 5 km pixel, or the nearest ocean pixel within PAD_DEG if its pixel is masked
as land. Raw downloads are cached in data/raw/crw_grid/ so an interrupted run resumes; pass
--refresh to download fresh data.
"""
import argparse
import json
import math
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd

from common import erddap_csv
from config import CRW_GRID_CACHE, CRW_HEAT_GRID, CRW_HEAT_SERIES, GCBD_SITES_CSV

CELL_DEG = 2.0
PAD_DEG = 0.25
KM_PER_DEG = 111.2


def box_query(variables, days, box):
    lat_lo, lat_hi, lon_lo, lon_hi = box
    sel = f"[last-{days - 1}:1:last][({lat_hi}):({lat_lo})][({lon_lo}):({lon_hi})]"
    return ",".join(f"{v}{sel}" for v in variables)


def fetch_cell(cell, box, refresh):
    """Download (or reuse) the two grids for one cell. Returns (cell, dhw, sst) or (cell, None, None)."""
    # Keyed by the box, not just the cell: a different site list gives the same cell a different box.
    key = "_".join(f"{v:.3f}" for v in box)
    paths = {k: CRW_GRID_CACHE / f"{key}_{k}.csv" for k in ("dhw", "sst")}
    if not refresh and all(p.exists() for p in paths.values()):
        return cell, *(pd.read_csv(paths[k], parse_dates=["time"]) for k in ("dhw", "sst"))
    dhw = erddap_csv(box_query(["CRW_DHW"], 84, box), timeout=600)
    sst = erddap_csv(box_query(["CRW_SSTANOMALY", "CRW_SST", "CRW_BAA"], 30, box), timeout=600)
    if dhw is None or sst is None:
        return cell, None, None
    dhw.to_csv(paths["dhw"], index=False)
    sst.to_csv(paths["sst"], index=False)
    return cell, dhw, sst


def daily_series(p_dhw):
    """{"start": first day, "dhw": [one value per day, None where missing]} for one pixel."""
    s = p_dhw.set_index(p_dhw["time"].dt.normalize())["CRW_DHW"].sort_index()
    s = s[~s.index.duplicated()]
    s = s.reindex(pd.date_range(s.index.min(), s.index.max(), freq="D"))
    return {"start": s.index[0].strftime("%Y-%m-%d"),
            "dhw": [None if pd.isna(v) else round(float(v), 2) for v in s]}


def summarise(site, dhw, sst):
    """(heat summary, daily DHW series) for one site from its cell's grids, using the nearest pixel
    with data. The series is None when no pixel within PAD_DEG has data."""
    last = dhw["time"].max()
    latest = dhw[(dhw["time"] == last) & dhw["CRW_DHW"].notna()]
    dy = latest["latitude"] - site.lat
    dx = (latest["longitude"] - site.lon) * math.cos(math.radians(site.lat))
    km = (dx ** 2 + dy ** 2) ** 0.5 * KM_PER_DEG
    if km.empty or km.min() > PAD_DEG * KM_PER_DEG:
        return {"site_id": site.site_id}, None
    pixel = latest.loc[km.idxmin()]
    at = lambda df: df[(df["latitude"] == pixel["latitude"]) & (df["longitude"] == pixel["longitude"])]
    p_dhw, p_sst = at(dhw), at(sst)
    baa = p_sst.sort_values("time")["CRW_BAA"].dropna()
    summary = {
        "site_id": site.site_id,
        "pixel_lat": pixel["latitude"], "pixel_lon": pixel["longitude"], "pixel_km": round(km.min(), 1),
        "dhw_now": pixel["CRW_DHW"],
        "dhw_max_12w": p_dhw["CRW_DHW"].max(),
        "ssta_mean_30d": p_sst["CRW_SSTANOMALY"].mean(),
        "sst_mean_30d": p_sst["CRW_SST"].mean(),
        "alert_level": baa.iloc[-1] if len(baa) else None,
        "as_of": last.strftime("%Y-%m-%d"),
    }
    return summary, daily_series(p_dhw)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sites", default=str(GCBD_SITES_CSV))
    parser.add_argument("--out", default=str(CRW_HEAT_GRID))
    parser.add_argument("--series-out", default=str(CRW_HEAT_SERIES))
    parser.add_argument("--workers", type=int, default=3, help="parallel requests (be polite)")
    parser.add_argument("--refresh", action="store_true", help="ignore cached downloads")
    args = parser.parse_args()

    sites = pd.read_csv(args.sites)
    sites["cell"] = ((sites["lat"] // CELL_DEG).astype(int).astype(str) + "_"
                     + (sites["lon"] // CELL_DEG).astype(int).astype(str))
    boxes = {
        cell: (g["lat"].min() - PAD_DEG, g["lat"].max() + PAD_DEG,
               g["lon"].min() - PAD_DEG, g["lon"].max() + PAD_DEG)
        for cell, g in sites.groupby("cell")
    }
    CRW_GRID_CACHE.mkdir(parents=True, exist_ok=True)
    print(f"{len(sites):,} sites in {len(boxes)} cells; {args.workers} parallel requests", flush=True)

    rows, series, failed = [], {}, []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(fetch_cell, cell, box, args.refresh) for cell, box in boxes.items()]
        for done, future in enumerate(as_completed(futures), 1):
            cell, dhw, sst = future.result()
            members = sites[sites["cell"] == cell]
            if dhw is None:
                failed.append(cell)
                print(f"[{done}/{len(boxes)}] cell {cell}: download failed", flush=True)
                continue
            results = [summarise(s, dhw, sst) for s in members.itertuples()]
            summaries = [summary for summary, _ in results]
            rows += summaries
            series.update({summary["site_id"]: ts for summary, ts in results if ts is not None})
            masked = sum(1 for r in summaries if r.get("pixel_km", 0) > 2.5)
            print(f"[{done}/{len(boxes)}] cell {cell}: {len(members)} sites"
                  + (f", {masked} using a nearby ocean pixel" if masked else ""), flush=True)

    out = pd.DataFrame(rows)
    out.to_csv(args.out, index=False)
    missing = out["dhw_max_12w"].isna().sum() if "dhw_max_12w" in out else len(out)
    with open(args.series_out, "w") as f:
        json.dump(series, f, separators=(",", ":"))
    print(f"Saved {len(out):,} site summaries to {args.out}; without heat data: {missing}")
    print(f"Saved {len(series):,} daily DHW series to {args.series_out}")
    if failed:
        print(f"Failed cells (re-run to retry; cached cells are skipped): {', '.join(failed)}")


if __name__ == "__main__":
    main()

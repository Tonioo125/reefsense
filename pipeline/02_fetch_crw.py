"""Fetch recent NOAA Coral Reef Watch heat-stress time series for each demo site.

python pipeline/02_fetch_crw.py --days 180
python pipeline/02_fetch_crw.py --days 180 --only NP01 BL03   # refetch some sites, keep the rest

Coastal reefs often fall in a 5 km pixel masked as land. When that happens, the nearest ocean pixel
with data (within SEARCH_RADIUS_DEG) is used instead; the latitude/longitude columns record the pixel.
"""
import argparse
import math
import time

import pandas as pd

from common import erddap_csv
from config import CRW_TIMESERIES, CRW_VARIABLES, SITES_CSV

SEARCH_RADIUS_DEG = 0.25


def fetch_point(lat, lon, days):
    # Index-based time selection ([last-N:1:last]) avoids guessing the latest available date.
    sel = f"[last-{days - 1}:1:last][({lat})][({lon})]"
    return erddap_csv(",".join(f"{v}{sel}" for v in CRW_VARIABLES))


def nearest_ocean_pixel(lat, lon):
    """Nearest pixel with data on the latest day, as (lat, lon, km), or None."""
    r = SEARCH_RADIUS_DEG
    grid = erddap_csv(f"CRW_DHW[last][({lat - r}):({lat + r})][({lon - r}):({lon + r})]")
    if grid is None:
        return None
    grid = grid.dropna(subset=["CRW_DHW"])
    if grid.empty:
        return None
    dy = grid["latitude"] - lat
    dx = (grid["longitude"] - lon) * math.cos(math.radians(lat))
    best = grid.loc[(dx ** 2 + dy ** 2).idxmin()]
    km = math.hypot(float(dx[best.name]), float(dy[best.name])) * 111.2
    return float(best["latitude"]), float(best["longitude"]), km


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=180)
    parser.add_argument("--only", nargs="+", metavar="SITE_ID", help="refetch these sites only")
    args = parser.parse_args()

    sites = pd.read_csv(SITES_CSV)
    if args.only:
        sites = sites[sites["site_id"].isin(args.only)]
    frames = []
    for site in sites.itertuples():
        print(f"{site.site_id} {site.name} ({site.lat}, {site.lon})", flush=True)
        df = fetch_point(site.lat, site.lon, args.days)
        if df is None:
            print("  skipped: ERDDAP unreachable", flush=True)
            continue
        if df["CRW_DHW"].isna().all():
            pixel = nearest_ocean_pixel(site.lat, site.lon)
            if pixel is None:
                print(f"  warning: no ocean pixel with data within {SEARCH_RADIUS_DEG}°", flush=True)
            else:
                print(f"  land-masked pixel; using nearest ocean pixel ({pixel[0]}, {pixel[1]}), "
                      f"{pixel[2]:.1f} km away", flush=True)
                df = fetch_point(pixel[0], pixel[1], args.days)
                if df is None:
                    continue
        df.insert(0, "site_id", site.site_id)
        frames.append(df)
        time.sleep(1)  # be polite to the public server

    if not frames:
        raise SystemExit("No CRW data fetched.")
    out = pd.concat(frames, ignore_index=True)
    if args.only and CRW_TIMESERIES.exists():
        kept = pd.read_csv(CRW_TIMESERIES, parse_dates=["time"])
        out = pd.concat([kept[~kept["site_id"].isin(out["site_id"].unique())], out], ignore_index=True)
    CRW_TIMESERIES.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(CRW_TIMESERIES, index=False)
    print(f"Saved {len(out):,} rows to {CRW_TIMESERIES}")


if __name__ == "__main__":
    main()

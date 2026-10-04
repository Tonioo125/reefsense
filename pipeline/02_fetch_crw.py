"""Fetch recent NOAA Coral Reef Watch heat-stress time series for each demo site.

python pipeline/02_fetch_crw.py --days 180
"""
import argparse
import io
import time

import pandas as pd
import requests

from config import CRW_ERDDAP, CRW_TIMESERIES, CRW_VARIABLES, SITES_CSV


def fetch_point(lat, lon, days):
    # Index-based time selection ([last-N:1:last]) avoids guessing the latest available date.
    sel = f"[last-{days - 1}:1:last][({lat})][({lon})]"
    query = ",".join(f"{v}{sel}" for v in CRW_VARIABLES)
    url = f"{CRW_ERDDAP}.csv?{query}"
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=120)
            resp.raise_for_status()
            return pd.read_csv(io.StringIO(resp.text), skiprows=[1], parse_dates=["time"])
        except requests.RequestException as err:
            print(f"  attempt {attempt + 1} failed: {err}")
            time.sleep(3 * (attempt + 1))
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=180)
    args = parser.parse_args()

    sites = pd.read_csv(SITES_CSV)
    frames = []
    for site in sites.itertuples():
        print(f"{site.site_id} {site.name} ({site.lat}, {site.lon})")
        df = fetch_point(site.lat, site.lon, args.days)
        if df is None:
            print("  skipped: ERDDAP unreachable")
            continue
        if df["CRW_DHW"].isna().all():
            print("  warning: no data. The 5 km pixel is probably masked as land; "
                  "move the site ~0.05° seaward in demo_sites.csv.")
        df.insert(0, "site_id", site.site_id)
        frames.append(df)
        time.sleep(1)  # be polite to the public server

    if not frames:
        raise SystemExit("No CRW data fetched.")
    out = pd.concat(frames, ignore_index=True)
    CRW_TIMESERIES.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(CRW_TIMESERIES, index=False)
    print(f"Saved {len(out):,} rows to {CRW_TIMESERIES}")


if __name__ == "__main__":
    main()

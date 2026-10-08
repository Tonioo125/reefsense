"""Fetch survey hard coral cover from MERMAID and match it to every reef site the app uses.

python pipeline/05_fetch_mermaid.py                  # nearest MERMAID site within 10 km of each reef
python pipeline/05_fetch_mermaid.py --radius-km 5

MERMAID (https://datamermaid.org) publishes public summaries of every sample event. All pages of
/v1/summarysampleevents/ are read (no authentication). Hard coral % comes from the benthic PIT, LIT or
photo-quadrat summary, else the benthic quadrat summary; projects whose data policy hides benthic
detail carry no cover and are skipped. Each MERMAID site is summarised at its latest sample date (mean
over that date's events), and each reef gets its nearest MERMAID site within --radius-km. Writes
data/processed/mermaid_sites.json; if any page cannot be fetched or nothing usable comes back, exits 1
and leaves the previous file untouched.
"""
import argparse
import json
import sys
import time
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from common import get_json, haversine_km, load_site_list
from config import MERMAID_API, MERMAID_SITES

PAGE_SIZE = 1000
PAGE_DELAY_S = 1.0
COVER_PROTOCOLS = ("benthicpit", "benthiclit", "benthicpqt")
QUADRAT_PROTOCOL = "quadrat_benthic_percent"


def hard_coral(protocols):
    """(percent hard coral, protocol) from a sample event's protocol summaries, or None."""
    protocols = protocols or {}
    for name in COVER_PROTOCOLS:
        value = ((protocols.get(name) or {}).get("percent_cover_benthic_category_avg") or {}).get("Hard coral")
        if value is not None:
            return float(value), name
    value = (protocols.get(QUADRAT_PROTOCOL) or {}).get("percent_hard_avg_avg")
    if value is not None:
        return float(value), QUADRAT_PROTOCOL
    return None


def fetch_events():
    """Every public sample event, or None if any page fails."""
    url, params, events = f"{MERMAID_API}/summarysampleevents/", {"limit": PAGE_SIZE}, []
    page = 0
    while url:
        if page:
            time.sleep(PAGE_DELAY_S)
        data = get_json(url, params=params, timeout=180)
        if data is None:
            print(f"page {page + 1} failed", flush=True)
            return None
        events += data.get("results", [])
        page += 1
        print(f"page {page}: {len(events):,} of {data.get('count', '?')} sample events", flush=True)
        url, params = data.get("next"), None  # `next` already carries limit and page
    return events


def summarise_sites(events):
    """One row per MERMAID site: latest sample date, mean hard coral over that date's events."""
    rows = []
    for event in events:
        cover = hard_coral(event.get("protocols"))
        if cover is None or not 0 <= cover[0] <= 100:
            continue
        if event.get("latitude") is None or event.get("longitude") is None or not event.get("sample_date"):
            continue
        rows.append({
            "site_id": event["site_id"], "site_name": event.get("site_name"),
            "lat": float(event["latitude"]), "lon": float(event["longitude"]),
            "sample_date": event["sample_date"], "pct": cover[0], "protocol": cover[1],
            "project_id": event.get("project_id"),
        })
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    latest = df[df["sample_date"] == df.groupby("site_id")["sample_date"].transform("max")]
    return latest.groupby("site_id", as_index=False).agg(
        site_name=("site_name", "first"), lat=("lat", "first"), lon=("lon", "first"),
        sample_date=("sample_date", "first"), hard_coral_pct=("pct", "mean"),
        protocol=("protocol", lambda s: s.mode().iloc[0]), n_sample_events=("pct", "size"),
        project_id=("project_id", "first"),
    )


def match_reefs(reefs, msites, radius_km):
    """{reef_id: record} for reefs with a MERMAID site within radius_km (nearest wins)."""
    out = {}
    lat, lon = msites["lat"].to_numpy(), msites["lon"].to_numpy()
    for reef in reefs.itertuples():
        km = haversine_km(reef.lat, reef.lon, lat, lon)
        best = int(np.argmin(km))
        if km[best] > radius_km:
            continue
        m = msites.iloc[best]
        out[reef.site_id] = {
            "mermaid_site": m["site_name"], "project_id": m["project_id"], "sample_date": m["sample_date"],
            "hard_coral_pct": round(float(m["hard_coral_pct"]), 1), "protocol": m["protocol"],
            "n_sample_events": int(m["n_sample_events"]), "km": round(float(km[best]), 2),
            "lat": float(m["lat"]), "lon": float(m["lon"]),
        }
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--radius-km", type=float, default=10)
    args = parser.parse_args()

    events = fetch_events()
    if events is None:
        sys.exit(f"MERMAID fetch failed; {MERMAID_SITES} left unchanged.")
    msites = summarise_sites(events)
    if msites.empty:
        sys.exit(f"No usable MERMAID hard coral data; {MERMAID_SITES} left unchanged.")
    print(f"{len(events):,} sample events; {len(msites):,} MERMAID sites with hard coral cover", flush=True)

    reefs = match_reefs(load_site_list(), msites, args.radius_km)
    used = {r["project_id"] for r in reefs.values()}
    projects = {}
    for event in events:
        pid = event.get("project_id")
        if pid in used and pid not in projects:
            projects[pid] = {"name": event.get("project_name"), "citation": event.get("suggested_citation")}

    MERMAID_SITES.parent.mkdir(parents=True, exist_ok=True)
    MERMAID_SITES.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": f"MERMAID {MERMAID_API}/summarysampleevents/",
        "radius_km": args.radius_km,
        "projects": dict(sorted(projects.items())),
        "reefs": reefs,
    }, separators=(",", ":")))
    print(f"Matched {len(reefs):,} reefs (within {args.radius_km:g} km) from {len(projects)} projects; "
          f"wrote {MERMAID_SITES}")


if __name__ == "__main__":
    main()

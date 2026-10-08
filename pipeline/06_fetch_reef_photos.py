"""Cache openly licensed iNaturalist coral photos taken near every reef site the app uses.

python pipeline/06_fetch_reef_photos.py                         # every site (~1,100 requests, ~55 min)
python pipeline/06_fetch_reef_photos.py --only NP01 BL01 GL13   # refetch some sites, keep the rest
python pipeline/06_fetch_reef_photos.py --radius-km 5 --per-reef 4

Sites are grouped into CELL_DEG cells and each cell makes one /v2/observations request at its
members' centroid (radius = --radius-km + the farthest member's distance), for research-grade or
needs-ID observations of stony, soft and fire corals (config.INAT_CORAL_TAXA) with a Creative Commons
photo and an exact (not obscured) location. Each site then keeps up to --per-reef photos within --radius-km, one per observation, most
recent first. Requests are spaced at least MIN_INTERVAL_S apart. Writes data/processed/reef_photos.json
(photo records stored once, reefs reference them by id; reefs without photos are omitted). Reefs in
cells whose request failed keep their previous photos; if every request fails nothing is written and
the script exits 1.
"""
import argparse
import json
import math
import sys
import time
from datetime import datetime, timezone

import numpy as np

from common import get_json, haversine_km, load_site_list
from config import INAT_API, INAT_CORAL_TAXA, REEF_PHOTOS

CELL_DEG = 0.1
PER_PAGE = 100
MIN_INTERVAL_S = 1.0
MEDIUM_PX = 500  # iNaturalist "medium" photos are at most 500 px on the long side
ALLOWED_LICENSES = ("cc0", "cc-by", "cc-by-nc", "cc-by-sa", "cc-by-nd", "cc-by-nc-sa", "cc-by-nc-nd")
FIELDS = ("(id:!t,uri:!t,observed_on:!t,location:!t,taxon:(name:!t),user:(login:!t,name:!t),"
          "photos:(id:!t,url:!t,license_code:!t,attribution:!t,original_dimensions:(width:!t,height:!t)))")

_last_request = 0.0


def throttle():
    """Sleep so consecutive requests start at least MIN_INTERVAL_S apart."""
    global _last_request
    wait = _last_request + MIN_INTERVAL_S - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()


def cells(sites, deg=CELL_DEG):
    """{cell key: member sites} for a grid of deg x deg cells."""
    keys = (np.floor(sites["lat"] / deg).astype(int).astype(str) + "_"
            + np.floor(sites["lon"] / deg).astype(int).astype(str))
    return {key: group for key, group in sites.groupby(keys, sort=False)}


def cell_query(members, radius_km):
    """(lat, lon, radius_km) of one request that covers radius_km around every member site."""
    lat, lon = float(members["lat"].mean()), float(members["lon"].mean())
    farthest = float(np.max(haversine_km(lat, lon, members["lat"].to_numpy(), members["lon"].to_numpy())))
    return round(lat, 5), round(lon, 5), math.ceil(radius_km + farthest)


def query_cell(lat, lon, radius_km):
    """Observations with photos around (lat, lon), most recent first; None if the request failed."""
    throttle()
    data = get_json(f"{INAT_API}/observations", params={
        "lat": lat, "lng": lon, "radius": radius_km,
        "taxon_id": ",".join(str(t) for t in INAT_CORAL_TAXA),
        "photos": "true", "quality_grade": "research,needs_id",
        # Obscured observations (by the observer or for threatened taxa) have randomised public
        # coordinates, so their distance to a reef would be wrong: keep exact locations only.
        "geoprivacy": "open", "taxon_geoprivacy": "open",
        "photo_license": ",".join(ALLOWED_LICENSES),
        "per_page": PER_PAGE, "order_by": "observed_on", "order": "desc", "fields": FIELDS,
    })
    return None if data is None else data.get("results", [])


def photo_record(obs, photo):
    """(photo id, record) for an openly licensed photo with full credit details, else None."""
    license_code = photo.get("license_code")
    url = photo.get("url") or ""
    dims = photo.get("original_dimensions") or {}
    user = obs.get("user") or {}
    photographer = user.get("name") or user.get("login")
    if license_code not in ALLOWED_LICENSES or "/square." not in url or not photo.get("attribution"):
        return None
    if not dims.get("width") or not dims.get("height") or not photographer or photo.get("id") is None:
        return None
    scale = min(1.0, MEDIUM_PX / max(dims["width"], dims["height"]))
    return str(photo["id"]), {
        "url": url.replace("/square.", "/medium."),
        "large_url": url.replace("/square.", "/large."),
        "width": round(dims["width"] * scale), "height": round(dims["height"] * scale),
        "attribution": photo["attribution"], "license": license_code, "photographer": photographer,
        "observation_url": obs.get("uri") or f"https://www.inaturalist.org/observations/{obs.get('id')}",
        "observed_on": obs.get("observed_on"),
        "taxon": (obs.get("taxon") or {}).get("name"),
    }


def obs_location(obs):
    try:
        lat, lon = (float(v) for v in str(obs.get("location")).split(","))
    except ValueError:
        return None
    return lat, lon


def assign(site_lat, site_lon, observations, radius_km, per_reef):
    """[(photo id, km, record)] for one site: within radius_km, one photo per observation, newest first."""
    newest_first = sorted(observations, key=lambda o: o.get("observed_on") or "", reverse=True)
    picks = []
    for obs in newest_first:
        loc = obs_location(obs)
        if loc is None:
            continue
        km = float(haversine_km(site_lat, site_lon, *loc))
        if km > radius_km:
            continue
        for photo in obs.get("photos") or []:
            record = photo_record(obs, photo)
            if record:
                picks.append((record[0], round(km, 2), record[1]))
                break
        if len(picks) >= per_reef:
            break
    return picks


def load_previous():
    if not REEF_PHOTOS.exists():
        return {"photos": {}, "reefs": {}}
    return json.loads(REEF_PHOTOS.read_text())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--radius-km", type=float, default=10)
    parser.add_argument("--per-reef", type=int, default=6)
    parser.add_argument("--only", nargs="+", metavar="SITE_ID", help="refetch these sites' cells only")
    args = parser.parse_args()

    sites = load_site_list()
    groups = cells(sites)
    if args.only:
        unknown = sorted(set(args.only) - set(sites["site_id"]))
        if unknown:
            sys.exit(f"Unknown site ids: {unknown}")
        groups = {k: g for k, g in groups.items() if g["site_id"].isin(args.only).any()}
    print(f"{sum(len(g) for g in groups.values()):,} sites in {len(groups):,} cells", flush=True)

    photos, reefs, fetched, failed = {}, {}, set(), []
    for done, (key, members) in enumerate(groups.items(), 1):
        lat, lon, radius = cell_query(members, args.radius_km)
        observations = query_cell(lat, lon, radius)
        if observations is None:
            failed.append(key)
            print(f"[{done}/{len(groups)}] cell {key}: request failed", flush=True)
            continue
        fetched.update(members["site_id"])
        with_photos = 0
        for site in members.itertuples():
            picks = assign(site.lat, site.lon, observations, args.radius_km, args.per_reef)
            if picks:
                with_photos += 1
                reefs[site.site_id] = [[pid, km] for pid, km, _ in picks]
                photos.update({pid: record for pid, _, record in picks})
        if done % 50 == 0 or done == len(groups) or args.only:
            print(f"[{done}/{len(groups)}] cell {key}: {len(observations)} observations, "
                  f"{with_photos}/{len(members)} sites with photos", flush=True)

    if not fetched:
        print(f"Every iNaturalist request failed ({len(failed)}); {REEF_PHOTOS} left unchanged.", flush=True)
        sys.exit(1)

    # Reefs not fetched this run (other cells with --only, or failed cells) keep their previous photos.
    previous = load_previous()
    for site_id in sites["site_id"]:
        if site_id in fetched or site_id not in previous["reefs"]:
            continue
        refs = [ref for ref in previous["reefs"][site_id] if ref[0] in previous["photos"]]
        if refs:
            reefs[site_id] = refs
            photos.update({ref[0]: previous["photos"][ref[0]] for ref in refs})
    order = {site_id: i for i, site_id in enumerate(sites["site_id"])}
    reefs = dict(sorted(reefs.items(), key=lambda item: order[item[0]]))

    REEF_PHOTOS.parent.mkdir(parents=True, exist_ok=True)
    tmp = REEF_PHOTOS.with_name(REEF_PHOTOS.name + ".part")
    tmp.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "iNaturalist API v2 /observations",
        "radius_km": args.radius_km,
        "taxon_ids": list(INAT_CORAL_TAXA),
        "photos": photos,
        "reefs": reefs,
    }, separators=(",", ":")))
    tmp.replace(REEF_PHOTOS)
    print(f"Wrote {REEF_PHOTOS}: {len(reefs):,} reefs with photos, {len(photos):,} photos")
    if failed:
        print(f"::warning::{len(failed)} of {len(groups)} iNaturalist requests failed; "
              "their reefs keep their previous photos")


if __name__ == "__main__":
    main()

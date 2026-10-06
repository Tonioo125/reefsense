"""Turn every surveyed GCBD location in a region or country into a site list for scoring.

python pipeline/01c_make_gcbd_sites.py                       # all of Asia (config.ASIA_COUNTRIES)
python pipeline/01c_make_gcbd_sites.py --country Indonesia   # a single country

Each location keeps its own GCBD Site_ID, name and province. Unnamed locations (most Reef Check
surveys store an empty name) are labelled from their data source and Site_ID.
"""
import argparse
import re

from common import load_gcbd
from config import GCBD_SITES_CSV, REGION_COUNTRIES

SOURCE_LABELS = {"Reef_Check": "Reef Check"}


def clean_name(raw):
    """GCBD stores some names as Python bytes reprs, e.g. "b''" or "b'Pemuteran'"."""
    if not isinstance(raw, str):
        return ""
    match = re.fullmatch(r"b(['\"])(.*)\1", raw.strip())
    return (match.group(2) if match else raw).strip()


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--region", choices=sorted(REGION_COUNTRIES), default="asia")
    group.add_argument("--country")
    args = parser.parse_args()
    countries = [args.country] if args.country else REGION_COUNTRIES[args.region]
    label = args.country or args.region.title()

    df = load_gcbd()
    df = df[df["country"].astype(str).str.lower().isin([c.lower() for c in countries])]
    if df.empty:
        raise SystemExit(f"No GCBD surveys for {label!r}.")
    missing = sorted(set(countries) - set(df["country"]))
    if missing:
        print(f"warning: no surveys for {missing}")

    sites = df.groupby(["lat", "lon"], as_index=False).agg(
        gcbd_site_id=("site", "min"),
        raw_name=("Site_Name", "first"),
        province=("province", "first"),
        country=("country", "first"),
        source=("Data_Source", "first"),
    )
    names = sites["raw_name"].map(clean_name)
    fallback = (sites["source"].map(lambda s: SOURCE_LABELS.get(s, s)) + " site #"
                + sites["gcbd_site_id"].astype(int).astype(str))
    province = sites["province"].map(clean_name)
    out = sites.assign(
        site_id="GCBD" + sites["gcbd_site_id"].astype(int).astype(str),
        region=(province + ", " + sites["country"]).where(province != "", sites["country"]),
        name=names.where(names != "", fallback),
        coral_cover_pct=None, refugia_50reefs_plus=None, connectivity=None, in_mpa=None,
    )[["site_id", "name", "region", "lat", "lon",
       "coral_cover_pct", "refugia_50reefs_plus", "connectivity", "in_mpa"]]

    out.to_csv(GCBD_SITES_CSV, index=False)
    print(f"Saved {len(out):,} {label} survey locations from {df['country'].nunique()} countries "
          f"to {GCBD_SITES_CSV}")
    print(f"named in GCBD: {(names != '').sum():,} | labelled by source + Site_ID: {(names == '').sum():,}")


if __name__ == "__main__":
    main()

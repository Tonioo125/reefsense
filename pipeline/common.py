"""Shared helpers: loading the Global Coral-Bleaching Database and querying NOAA's ERDDAP."""
import io
import time

import numpy as np
import pandas as pd
import requests

from config import (COLUMN_CANDIDATES, CRW_ERDDAP, FEATURE_CANDIDATES, GCBD_RAW, KELVIN_COLUMNS,
                    REGIONS)

EXPOSURE_CODES = {"sheltered": 0, "sometimes": 1, "exposed": 2}


def _pick(df, key):
    for col in COLUMN_CANDIDATES[key]:
        if col in df.columns:
            return col
    return None


def load_gcbd(path=GCBD_RAW):
    if not path.exists():
        raise SystemExit(
            f"{path} not found. Run `python pipeline/01_fetch_gcbd.py`, or download the CSV "
            "from https://www.bco-dmo.org/dataset/773466 and save it at that path."
        )
    df = pd.read_csv(path, low_memory=False, na_values=["nan", "NaN", "NA", "nd", ""])

    rename = {}
    for key in COLUMN_CANDIDATES:
        col = _pick(df, key)
        if col:
            rename[col] = key
    missing = [k for k in ("lat", "lon", "bleach") if k not in rename.values()]
    if missing:
        raise SystemExit(
            f"Could not find columns for {missing}. Available columns:\n{list(df.columns)}\n"
            "Add the right names to COLUMN_CANDIDATES in pipeline/config.py."
        )
    df = df.rename(columns=rename)

    for col in ["lat", "lon", "bleach", "year"] + FEATURE_CANDIDATES:
        if col in df.columns and col != "Exposure":
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Some temperature columns are labelled °C but stored in Kelvin.
    for col in KELVIN_COLUMNS:
        if col in df.columns and df[col].median(skipna=True) > 200:
            df[col] = df[col] - 273.15

    if "Exposure" in df.columns:
        df["Exposure"] = df["Exposure"].astype(str).str.strip().str.lower().map(EXPOSURE_CODES)

    return df


def filter_region(df, region):
    box = REGIONS[region]
    if box is None:
        return df
    lat_ok = df["lat"].between(box["lat_min"], box["lat_max"])
    if box["lon_min"] <= box["lon_max"]:
        lon_ok = df["lon"].between(box["lon_min"], box["lon_max"])
    else:  # box crosses the antimeridian
        lon_ok = (df["lon"] >= box["lon_min"]) | (df["lon"] <= box["lon_max"])
    return df[lat_ok & lon_ok]


def usable_features(df, min_coverage=0.5):
    return [f for f in FEATURE_CANDIDATES if f in df.columns and df[f].notna().mean() >= min_coverage]


def erddap_csv(query, timeout=180, attempts=3):
    """GET a griddap CSV query against NOAA Coral Reef Watch; None if every attempt fails."""
    url = f"{CRW_ERDDAP}.csv?{query}"
    for attempt in range(attempts):
        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            # ERDDAP CSVs put a units row directly under the header; drop it.
            return pd.read_csv(io.StringIO(resp.text), skiprows=[1], parse_dates=["time"])
        except requests.RequestException as err:
            print(f"  attempt {attempt + 1} failed: {err}", flush=True)
            time.sleep(3 * (attempt + 1))
    return None


def to_json_safe(value):
    if value is None:
        return None
    if isinstance(value, (np.floating, float)):
        return None if np.isnan(value) else round(float(value), 4)
    if isinstance(value, np.integer):
        return int(value)
    return value

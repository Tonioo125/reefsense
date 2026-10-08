"""Shared helpers: loading the Global Coral-Bleaching Database and querying NOAA's ERDDAP."""
import io
import time

import numpy as np
import pandas as pd
import requests

from config import (COLUMN_CANDIDATES, CRW_ERDDAP, FEATURE_CANDIDATES, GCBD_RAW, KELVIN_COLUMNS,
                    REGIONS, SITE_FILES, USER_AGENT)

EARTH_RADIUS_KM = 6371.0
# Seconds to wait for a TCP connection. Kept short so an unreachable host fails fast, while the
# per-call `timeout` (read timeout) stays long enough for slow ERDDAP queries.
CONNECT_TIMEOUT_S = 15

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
            resp = requests.get(url, timeout=(CONNECT_TIMEOUT_S, timeout))
            resp.raise_for_status()
            # ERDDAP CSVs put a units row directly under the header; drop it.
            return pd.read_csv(io.StringIO(resp.text), skiprows=[1], parse_dates=["time"])
        except requests.RequestException as err:
            print(f"  attempt {attempt + 1} failed: {err}", flush=True)
            time.sleep(3 * (attempt + 1))
    return None


def get_json(url, params=None, attempts=4, timeout=60):
    """GET a JSON API with retries (timeouts, connection errors, 429, 5xx); None if every attempt fails.

    Backoff is 2, 4, 8 s, or the server's Retry-After when it sends one.
    """
    for attempt in range(attempts):
        wait = 2 ** (attempt + 1)
        try:
            resp = requests.get(url, params=params, timeout=(CONNECT_TIMEOUT_S, timeout),
                                headers={"User-Agent": USER_AGENT})
            if resp.status_code == 429 or resp.status_code >= 500:
                retry_after = resp.headers.get("Retry-After", "")
                if retry_after.isdigit():
                    wait = int(retry_after)
                raise requests.HTTPError(f"HTTP {resp.status_code}", response=resp)
            resp.raise_for_status()
            return resp.json()
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as err:
            status = getattr(getattr(err, "response", None), "status_code", None)
            if status is not None and status < 500 and status != 429:
                print(f"  request failed: {err}", flush=True)
                return None  # other 4xx: retrying will not help
            print(f"  attempt {attempt + 1} failed: {err}", flush=True)
        except ValueError as err:  # body was not JSON
            print(f"  attempt {attempt + 1} failed: invalid JSON ({err})", flush=True)
        if attempt + 1 < attempts:
            time.sleep(wait)
    return None


def load_site_list():
    """Every site the app uses (config.SITE_FILES); same rules as 04_score_sites.load_sites."""
    lists = [pd.read_csv(path) for path in SITE_FILES if path.exists()]
    sites = pd.concat(lists, ignore_index=True)
    dupes = sites["site_id"][sites["site_id"].duplicated()].unique()
    if len(dupes):
        raise SystemExit(f"Duplicate site_id across site lists: {list(dupes)[:5]}")
    return sites


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance in km; accepts scalars or numpy arrays (broadcast)."""
    lat1, lon1, lat2, lon2 = (np.radians(np.asarray(v, dtype=float)) for v in (lat1, lon1, lat2, lon2))
    a = (np.sin((lat2 - lat1) / 2) ** 2
         + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2)
    return 2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def to_json_safe(value):
    if value is None:
        return None
    if isinstance(value, (np.floating, float)):
        return None if np.isnan(value) else round(float(value), 4)
    if isinstance(value, np.integer):
        return int(value)
    return value

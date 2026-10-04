"""Download the Global Coral-Bleaching Database (BCO-DMO 773466) via ERDDAP.

If the ERDDAP copy turns out to be a subset (it may only cover ~1998-2017), download the full
CSV manually from https://www.bco-dmo.org/dataset/773466 and save it as data/raw/gcbd.csv.
"""
import io

import pandas as pd
import requests

from config import GCBD_ERDDAP_CSV, GCBD_RAW


def main():
    GCBD_RAW.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {GCBD_ERDDAP_CSV} ...")
    try:
        resp = requests.get(GCBD_ERDDAP_CSV, timeout=300)
        resp.raise_for_status()
    except requests.RequestException as err:
        raise SystemExit(
            f"Download failed ({err}).\nDownload the CSV manually from "
            f"https://www.bco-dmo.org/dataset/773466 and save it as {GCBD_RAW}"
        )
    # ERDDAP CSVs put a units row directly under the header; drop it.
    df = pd.read_csv(io.StringIO(resp.text), skiprows=[1], low_memory=False)
    df.to_csv(GCBD_RAW, index=False)
    print(f"Saved {len(df):,} rows and {df.shape[1]} columns to {GCBD_RAW}")


if __name__ == "__main__":
    main()

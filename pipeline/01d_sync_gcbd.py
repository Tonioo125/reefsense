"""Check the Global Coral-Bleaching Database upstream for a new version; regenerate gcbd_asia.csv if so.

python pipeline/01d_sync_gcbd.py              # weekly check: does nothing unless upstream changed
python pipeline/01d_sync_gcbd.py --force      # download, regenerate and validate even if unchanged
python pipeline/01d_sync_gcbd.py --baseline   # record the current upstream as the source of the
                                              # committed gcbd_asia.csv, without regenerating it

The upstream file is BCO-DMO dataset 773466 (version 2) as one CSV. Its fingerprint (ETag,
Last-Modified, size) comes from a 1-byte ranged GET (the presigned S3 URL refuses HEAD) and is compared
with data/sites/gcbd_source.json. Only when it differs is the CSV downloaded to
data/raw/gcbd_bcodmo_v2.csv; if its sha256 matches the manifest (same bytes re-uploaded) only the
fingerprint is refreshed. Otherwise it is turned into a site list by 01c_make_gcbd_sites.py and validated (exact
header, at least 80% of the current rows, unique site_id, no clash with demo site ids) before
gcbd_asia.csv and the manifest are replaced. Any failure exits 1 and leaves both files untouched.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

from config import (GCBD_SITES_COLUMNS, GCBD_SITES_CSV, GCBD_SOURCE_MANIFEST, GCBD_SYNC_RAW,
                    GCBD_V2_CSV_URL, SITES_CSV, USER_AGENT)

HERE = Path(__file__).resolve().parent
MIN_ROW_RATIO = 0.8
FINGERPRINT_KEYS = ("etag", "last_modified", "size")
BASELINE_SOURCE = "GCBD SQLite release via 01b+01c (baseline adopted)"
REGENERATED_SOURCE = "BCO-DMO 773466 v2 CSV via 01c_make_gcbd_sites.py"


def fingerprint(url=GCBD_V2_CSV_URL, timeout=60):
    """{etag, last_modified, size} of the upstream file from a 1-byte ranged GET; None on failure."""
    headers = {"Range": "bytes=0-0", "User-Agent": USER_AGENT}
    try:
        # stream=True: if a server ignores Range, the body is not downloaded.
        with requests.get(url, headers=headers, allow_redirects=True, timeout=timeout,
                          stream=True) as resp:
            resp.raise_for_status()
            size = None
            total = resp.headers.get("Content-Range", "").rpartition("/")[2]
            if total.isdigit():
                size = int(total)
            elif resp.status_code == 200 and resp.headers.get("Content-Length", "").isdigit():
                size = int(resp.headers["Content-Length"])
            fp = {"etag": resp.headers.get("ETag"), "last_modified": resp.headers.get("Last-Modified"),
                  "size": size}
    except requests.RequestException as err:
        print(f"Fingerprint request failed: {err}", flush=True)
        return None
    if all(fp[k] is None for k in FINGERPRINT_KEYS):
        print("Fingerprint request returned no ETag, Last-Modified or size", flush=True)
        return None
    return fp


def load_manifest(path=GCBD_SOURCE_MANIFEST):
    return json.loads(Path(path).read_text()) if Path(path).exists() else None


def write_manifest(manifest, path=GCBD_SOURCE_MANIFEST):
    Path(path).write_text(json.dumps(manifest, indent=2) + "\n")


def unchanged(fp, manifest):
    return manifest is not None and all(fp.get(k) == manifest.get(k) for k in FINGERPRINT_KEYS)


def download(url, path, timeout=300):
    """Stream url to path (atomically via a .part file); returns the sha256 hex digest or None."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_name(path.name + ".part")
    digest = hashlib.sha256()
    try:
        with requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout, stream=True) as resp:
            resp.raise_for_status()
            with open(part, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=1 << 20):
                    fh.write(chunk)
                    digest.update(chunk)
    except (requests.RequestException, OSError) as err:
        print(f"Download failed: {err}", flush=True)
        part.unlink(missing_ok=True)
        return None
    part.replace(path)
    return digest.hexdigest()


def count_rows(csv_path):
    return len(pd.read_csv(csv_path)) if Path(csv_path).exists() else 0


def validate_sites(new_csv, current_csv=GCBD_SITES_CSV, demo_csv=SITES_CSV):
    """Problems that make a regenerated site list unsafe to adopt (empty list = OK)."""
    new = pd.read_csv(new_csv)
    header = list(new.columns)
    if header != GCBD_SITES_COLUMNS:
        return [f"header {header} != {GCBD_SITES_COLUMNS}"]
    problems = []
    current_rows = count_rows(current_csv)
    if len(new) < MIN_ROW_RATIO * current_rows:
        problems.append(f"{len(new):,} rows is below {MIN_ROW_RATIO:.0%} of the current {current_rows:,}")
    dupes = new["site_id"][new["site_id"].duplicated()].unique()
    if len(dupes):
        problems.append(f"duplicate site_id: {list(dupes)[:5]}")
    if Path(demo_csv).exists():
        clash = sorted(set(new["site_id"]) & set(pd.read_csv(demo_csv)["site_id"]))
        if clash:
            problems.append(f"site_id also used by demo sites: {clash[:5]}")
    return problems


def regenerate(raw_csv, out_csv):
    """Run 01c_make_gcbd_sites.py on raw_csv; True if it succeeded."""
    cmd = [sys.executable, str(HERE / "01c_make_gcbd_sites.py"), "--gcbd", str(raw_csv), "--out", str(out_csv)]
    return subprocess.run(cmd, cwd=HERE).returncode == 0


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--force", action="store_true", help="regenerate even if upstream is unchanged")
    mode.add_argument("--baseline", action="store_true",
                      help="adopt the current upstream as the source of gcbd_asia.csv (no regeneration)")
    args = parser.parse_args()

    fp = fingerprint()
    if fp is None:
        sys.exit(1)
    manifest = load_manifest()
    print(f"Upstream: etag={fp['etag']} last_modified={fp['last_modified']} size={fp['size']}", flush=True)

    if not (args.force or args.baseline) and unchanged(fp, manifest):
        print(f"GCBD unchanged since {manifest.get('checked')}; nothing to do.")
        return

    if manifest is None and not (args.force or args.baseline):
        print("No manifest yet; downloading and regenerating.", flush=True)
    print(f"Downloading {GCBD_V2_CSV_URL} -> {GCBD_SYNC_RAW}", flush=True)
    sha256 = download(GCBD_V2_CSV_URL, GCBD_SYNC_RAW)
    if sha256 is None:
        sys.exit(1)
    record = {"url": GCBD_V2_CSV_URL, **fp, "sha256": sha256}

    if not (args.force or args.baseline) and manifest and manifest.get("sha256") == sha256:
        # Same bytes re-uploaded (new ETag/Last-Modified): keep gcbd_asia.csv, refresh the fingerprint.
        write_manifest({**manifest, **record, "checked": now_iso()})
        print(f"GCBD content unchanged (sha256 {sha256[:12]}...); refreshed the fingerprint in "
              f"{GCBD_SOURCE_MANIFEST}, {GCBD_SITES_CSV} left as is.")
        return

    if args.baseline:
        write_manifest({**record, "sites": count_rows(GCBD_SITES_CSV), "generated_from": BASELINE_SOURCE,
                        "checked": now_iso()})
        print(f"Baseline recorded in {GCBD_SOURCE_MANIFEST}; {GCBD_SITES_CSV} left as is.")
        return

    with tempfile.TemporaryDirectory() as tmp:
        candidate = Path(tmp) / "gcbd_asia.csv"
        if not regenerate(GCBD_SYNC_RAW, candidate):
            print("01c_make_gcbd_sites.py failed; files left unchanged.", flush=True)
            sys.exit(1)
        problems = validate_sites(candidate)
        if problems:
            print("Regenerated site list rejected; files left unchanged:", flush=True)
            for problem in problems:
                print(f"  - {problem}", flush=True)
            sys.exit(1)
        rows = count_rows(candidate)
        shutil.copyfile(candidate, GCBD_SITES_CSV)
    write_manifest({**record, "sites": rows, "generated_from": REGENERATED_SOURCE, "checked": now_iso()})
    print(f"Updated {GCBD_SITES_CSV} ({rows:,} sites) and {GCBD_SOURCE_MANIFEST}")


if __name__ == "__main__":
    main()

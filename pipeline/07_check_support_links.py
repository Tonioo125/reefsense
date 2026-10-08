"""Re-check every donation/support URL in data/sites/support_links.json (report only).

python pipeline/07_check_support_links.py            # prints OK/BROKEN per organisation, exits 0
python pipeline/07_check_support_links.py --strict   # exits 1 if any link is broken

Each URL gets one GET with a browser-like User-Agent, following redirects. A link is OK when it is
https, answers HTTP 200, and the final page is still https on the same site (e.g. coral.org ->
give.coral.org). Nothing is written: a broken link needs a person to find the organisation's current
page and verify it (see the file's _rule). With GITHUB_STEP_SUMMARY set, broken links are listed there.
"""
import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests

ROOT = Path(__file__).resolve().parents[1]
SUPPORT_LINKS = ROOT / "data/sites/support_links.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                         "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 ReefSense-link-check"}
# Second-level labels under country TLDs (reefcheck.org.my, kuroshio.or.jp, wwf.org.hk).
SECOND_LEVEL = {"ac", "co", "com", "edu", "gov", "net", "or", "org"}


def site_of(host):
    """Registrable part of a host name, roughly: give.coral.org -> coral.org, www.wwf.org.hk -> wwf.org.hk."""
    labels = (host or "").lower().split(".")
    n = 3 if len(labels) >= 3 and len(labels[-1]) == 2 and labels[-2] in SECOND_LEVEL else 2
    return ".".join(labels[-n:])


def check(url, get=requests.get):
    """(ok, detail) for one support URL."""
    start = urlparse(url)
    if start.scheme != "https" or not start.netloc:
        return False, "not https"
    try:
        r = get(url, headers=HEADERS, timeout=15, allow_redirects=True)
    except requests.RequestException as err:
        return False, type(err).__name__
    final = urlparse(r.url or url)
    if r.status_code != 200:
        return False, f"HTTP {r.status_code}"
    if final.scheme != "https":
        return False, f"redirected to non-https {r.url}"
    if site_of(final.hostname) != site_of(start.hostname):
        return False, f"redirected off-site to {r.url}"
    return True, "HTTP 200" + (f" -> {r.url}" if r.url and r.url != url else "")


def main(argv=None, get=requests.get):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--path", type=Path, default=SUPPORT_LINKS)
    parser.add_argument("--strict", action="store_true", help="exit 1 if any link is broken")
    args = parser.parse_args(argv)
    try:
        orgs = json.loads(args.path.read_text(encoding="utf-8"))["organisations"]
    except (OSError, ValueError, KeyError) as err:
        print(f"Cannot read {args.path}: {err!r}", file=sys.stderr)
        return 1

    broken = []
    for org_id, org in orgs.items():
        ok, detail = check(org["url"], get=get)
        print(f"{'OK    ' if ok else 'BROKEN'} {org_id} {org['url']} ({detail})")
        if not ok:
            broken.append((org_id, org["url"], detail))
    print(f"{len(orgs) - len(broken)}/{len(orgs)} support links OK")

    summary = os.getenv("GITHUB_STEP_SUMMARY")
    if summary and broken:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("### Broken support links\n\n| Organisation | URL | Problem |\n| --- | --- | --- |\n")
            f.writelines(f"| {o} | {u} | {d} |\n" for o, u, d in broken)
            f.write("\nFix by hand in data/sites/support_links.json (verify the new page first).\n")
    return 1 if args.strict and broken else 0


if __name__ == "__main__":
    sys.exit(main())

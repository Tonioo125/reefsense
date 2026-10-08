"""Coral news for a reef's region, from Mongabay's environmental news search feed.

Articles are matched to the reef's region name (province first, then country). Only articles whose title
mentions corals, reefs or bleaching, and whose title or summary names the place, are kept, so loosely
related stories are dropped rather than shown. Results are cached in memory; a failed fetch is reported
as "unavailable" and retried after a short delay.

(GDELT was tried first: its full-text matches were mostly off-topic and it rate-limits shared IPs.)
"""
import html
import re
import threading
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from email.utils import parsedate_to_datetime

import requests

SOURCE = "Mongabay"
SOURCE_URL = "https://news.mongabay.com/"
FEED = "https://news.mongabay.com/"
HEADERS = {"User-Agent": "ReefCast/0.3 (coral reef research prototype)"}
TIMEOUT_S = 25  # an uncached Mongabay search can take 10-20 s
CACHE_TTL_S = 6 * 3600
FAILURE_TTL_S = 5 * 60
MAX_ARTICLES = 6
SUMMARY_CHARS = 180

TOPIC = re.compile(r"\b(coral|corals|reef|reefs|bleach\w*)\b", re.I)
DIRECTIONS = re.compile(r"^(north|south|east|west|central|northern|southern|eastern|western)\s+", re.I)

_cache: dict[str, tuple[float, list | None]] = {}
_lock = threading.Lock()


def places_for(region):
    """Search places for a region label, most specific first.

    "West Nusa Tenggara, Indonesia" -> ["West Nusa Tenggara", "Nusa Tenggara", "Indonesia"]
    "Japan — Okinawa"               -> ["Okinawa", "Japan"]
    """
    if ", " in region:
        parts = region.split(", ")
    elif " — " in region:
        parts = list(reversed(region.split(" — ")))
    else:
        parts = [region]
    places = []
    for part in (p.strip() for p in parts):
        for name in (part, DIRECTIONS.sub("", part)):
            if name and name.lower() not in {p.lower() for p in places}:
                places.append(name)
    return places


def _fetch(place):
    """Relevant articles for one place, newest first; None if the feed could not be read."""
    try:
        resp = requests.get(FEED, params={"s": f"coral {place}", "feed": "rss2", "orderby": "date"},
                            headers=HEADERS, timeout=TIMEOUT_S)
        resp.raise_for_status()
        items = ET.fromstring(resp.content).findall("./channel/item")
    except (requests.RequestException, ET.ParseError):
        return None
    mention = re.compile(rf"\b{re.escape(place)}\b", re.I)
    articles = []
    for item in items:
        title = html.unescape(item.findtext("title") or "").strip()
        summary = html.unescape(re.sub(r"<[^>]+>", " ", item.findtext("description") or ""))
        summary = re.sub(r"\s+", " ", summary).strip()
        link = (item.findtext("link") or "").strip()
        if not (title and link.startswith("https://") and TOPIC.search(title)):
            continue
        if not (mention.search(title) or mention.search(summary)):
            continue
        try:
            published = parsedate_to_datetime(item.findtext("pubDate") or "").date().isoformat()
        except (TypeError, ValueError):
            published = None
        if len(summary) > SUMMARY_CHARS:
            summary = summary[:SUMMARY_CHARS].rsplit(" ", 1)[0] + "…"
        articles.append({"title": title, "url": link, "published": published,
                         "summary": summary or None, "place": place})
    return articles


def _cached_fetch(place):
    key = place.lower()
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < (CACHE_TTL_S if hit[1] is not None else FAILURE_TTL_S):
            return hit[1]
    articles = _fetch(place)
    with _lock:
        _cache[key] = (time.time(), articles)
    return articles


def news_for_region(region, country=None):
    """Up to MAX_ARTICLES articles about corals in this region, most specific place first.

    country is searched last when the region label does not already name it.
    """
    places = places_for(region)
    if country and country.lower() not in {p.lower() for p in places}:
        places.append(country)
    # Places are searched in parallel: uncached searches are slow, and each place is cached separately.
    with ThreadPoolExecutor(max_workers=len(places)) as pool:
        results = list(pool.map(_cached_fetch, places))
    articles, seen = [], set()
    for found in results:
        for article in sorted(found or [], key=lambda a: a["published"] or "", reverse=True):
            if article["url"] not in seen:
                seen.add(article["url"])
                articles.append(article)
    return {
        "status": "unavailable" if all(found is None for found in results) else "ok",
        "source": SOURCE,
        "sourceUrl": SOURCE_URL,
        "searched": places,
        "articles": articles[:MAX_ARTICLES],
    }

"""API tests. Run from backend/:  python3 -m pytest -q

The endpoint tests use the real scored data and model, and are skipped until the pipeline has run.
"""
import json
import os

import pytest
from fastapi.testclient import TestClient

import main
import news

needs_data = pytest.mark.skipif(not main.DATA_PATH.exists(), reason="run the pipeline first")


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        yield c


def site(dhw, bleaching):
    return {"heat": {"dhw_max_12w": dhw}, "bleaching_probability": bleaching}


@pytest.mark.parametrize("dhw, bleaching, expected", [
    (0.0, 0.50, True),    # no Alert Level 1 in 12 weeks, model: moderate resilience
    (3.9, 0.70, True),    # just below NOAA's 4 DHW threshold, model: lower resilience
    (2.0, 0.36, True),    # model: resilience 0.64, just below the High band
    (4.0, 0.70, False),   # NOAA's alerts reached Alert Level 1: not missed
    (9.0, 0.90, False),   # severe heat, NOAA clearly signalled it
    (1.0, 0.20, False),   # model agrees the reef is in the High band
    (None, 0.9, False),   # no heat data: no claim
])
def test_noaa_gap_rule(dhw, bleaching, expected):
    assert main.is_noaa_gap(site(dhw, bleaching)) is expected


@needs_data
def test_reefs_carry_the_gap_flag_and_summary_matches(client):
    reefs = client.get("/api/reefs").json()
    assert reefs and all(isinstance(r["noaaGap"], bool) for r in reefs)
    summary = client.get("/api/noaa-gap").json()
    flagged = {r["id"] for r in reefs if r["noaaGap"]}
    assert summary["count"] == len(flagged) == len(summary["reefIds"])
    assert set(summary["reefIds"]) == flagged
    assert sum(c["count"] for c in summary["byCountry"]) == summary["count"]
    assert summary["count"] <= summary["belowAlert1Count"] <= summary["total"] == len(reefs)
    assert 0 <= summary["nonHeatTopDriverCount"] <= summary["count"]
    assert all(by_id_dhw < 4 for by_id_dhw in
               (r["metrics"]["dhwMax12w"] for r in reefs if r["noaaGap"]))
    by_id = {r["id"]: r for r in reefs}
    risks = [by_id[i]["bleachingProbability"] for i in summary["reefIds"]]
    assert risks == sorted(risks, reverse=True)


@needs_data
def test_predict_at_current_heat_reproduces_the_map_score(client):
    """The what-if slider starts at the reef's current conditions; it must not jump on first move."""
    reefs = client.get("/api/reefs").json()
    sample = reefs[:: max(1, len(reefs) // 25)]
    for reef in sample:
        m = reef["metrics"]
        body = {"latitude": reef["latitude"], "longitude": reef["longitude"],
                "dhwMax12w": m["dhwMax12w"], "sstAnomaly": m["sstAnomaly"]}
        res = client.post("/api/predict", json=body)
        assert res.status_code == 200, res.text
        assert res.json()["probability"] == pytest.approx(reef["resilienceProbability"], abs=0.01), reef["id"]


def photo_record(n):
    return {"url": f"https://img.test/{n}/medium.jpg", "large_url": f"https://img.test/{n}/large.jpg",
            "width": 500, "height": 375, "attribution": f"(c) User {n}, some rights reserved (CC BY)",
            "license": "cc-by", "photographer": f"User {n}",
            "observation_url": f"https://www.inaturalist.org/observations/{n}",
            "observed_on": "2025-01-0" + str(n), "taxon": "Acropora"}


@pytest.fixture
def photos_file(tmp_path, monkeypatch):
    path = tmp_path / "reef_photos.json"
    path.write_text(json.dumps({
        "photos": {"2": photo_record(2), "1": photo_record(1)},
        # "9" is referenced but missing from photos: skipped.
        "reefs": {"NP01": [["2", 0.4], ["9", 1.0], ["1", 3.2]]},
    }))
    monkeypatch.setattr(main, "PHOTOS_PATH", path)
    return path


@needs_data
def test_photos_are_camel_case_in_file_order(client, photos_file):
    res = client.get("/api/reefs/NP01/photos")
    assert res.status_code == 200
    body = res.json()
    assert [p["id"] for p in body] == ["2", "1"]
    assert body[0] == {
        "id": "2", "url": "https://img.test/2/medium.jpg", "largeUrl": "https://img.test/2/large.jpg",
        "width": 500, "height": 375, "attribution": "(c) User 2, some rights reserved (CC BY)",
        "license": "cc-by", "photographer": "User 2",
        "observationUrl": "https://www.inaturalist.org/observations/2",
        "observedOn": "2025-01-02", "taxon": "Acropora", "distanceKm": 0.4,
    }


@needs_data
def test_photos_empty_for_scored_reef_without_photos(client, photos_file):
    other = next(r["id"] for r in client.get("/api/reefs").json() if r["id"] != "NP01")
    res = client.get(f"/api/reefs/{other}/photos")
    assert res.status_code == 200 and res.json() == []


@needs_data
def test_photos_unknown_reef_is_404(client, photos_file):
    assert client.get("/api/reefs/NOPE/photos").status_code == 404


@needs_data
def test_photos_missing_file_is_empty(client, tmp_path, monkeypatch):
    monkeypatch.setattr(main, "PHOTOS_PATH", tmp_path / "absent.json")
    res = client.get("/api/reefs/NP01/photos")
    assert res.status_code == 200 and res.json() == []


@needs_data
def test_predict_validates_input(client):
    assert client.post("/api/predict", json={"latitude": 200, "longitude": 0, "dhwMax12w": 1}).status_code == 422
    assert client.post("/api/predict", json={"latitude": 0, "longitude": 0, "dhwMax12w": -1}).status_code == 422


@needs_data
def test_heat_history_matches_the_reef_summary(client):
    """The timeline must show the same heat stress the score used: its peak is the 12-week peak."""
    reefs = client.get("/api/reefs").json()
    for reef in reefs[:: max(1, len(reefs) // 25)]:
        body = client.get(f"/api/reefs/{reef['id']}/heat-history").json()
        values = [p["dhw"] for p in body["points"] if p["dhw"] is not None]
        assert values, reef["id"]
        assert body["points"][-1]["date"] == reef["asOf"], reef["id"]
        assert values[-1] == pytest.approx(reef["metrics"]["dhwNow"], abs=0.01), reef["id"]
        assert max(values) >= reef["metrics"]["dhwMax12w"] - 0.01, reef["id"]
    assert client.get("/api/reefs/NOPE/heat-history").status_code == 404


@needs_data
def test_survey_history_is_consistent(client):
    reef = client.get("/api/reefs").json()[0]
    body = client.get(f"/api/reefs/{reef['id']}/survey-history").json()
    years = [y["year"] for y in body["years"]]
    assert years == sorted(years)
    assert sum(y["samples"] for y in body["years"]) == body["samples"]
    assert 0 <= body["coarseSamples"] <= body["samples"]
    for y in body["years"]:
        if y["meanBleachedPct"] is not None:
            assert 0 <= y["meanBleachedPct"] <= y["maxBleachedPct"] <= 100
            assert 0 <= y["bleachedShare"] <= 1


@pytest.mark.parametrize("region, expected", [
    ("West Nusa Tenggara, Indonesia", ["West Nusa Tenggara", "Nusa Tenggara", "Indonesia"]),
    ("Japan — Okinawa", ["Okinawa", "Japan"]),
    ("Bali", ["Bali"]),
])
def test_news_places(region, expected):
    assert news.places_for(region) == expected


FEED = """<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Coral bleaching hits Bali reefs</title><link>https://news.mongabay.com/a</link>
  <pubDate>Tue, 22 Sep 2026 02:00:00 +0000</pubDate><description>Surveys off Bali found...</description></item>
<item><title>Rice prices rise in Bali</title><link>https://news.mongabay.com/b</link>
  <pubDate>Mon, 21 Sep 2026 02:00:00 +0000</pubDate><description>Not about reefs.</description></item>
<item><title>Coral restoration in Mexico</title><link>https://news.mongabay.com/c</link>
  <pubDate>Sun, 20 Sep 2026 02:00:00 +0000</pubDate><description>Caribbean reefs.</description></item>
</channel></rss>"""


def test_news_keeps_only_coral_articles_about_the_place(monkeypatch):
    class Resp:
        content = FEED.encode()

        def raise_for_status(self):
            pass

    monkeypatch.setattr(news.requests, "get", lambda *a, **k: Resp())
    articles = news._fetch("Bali")
    assert [a["url"] for a in articles] == ["https://news.mongabay.com/a"]
    assert articles[0]["published"] == "2026-09-22"


def test_news_reports_unavailable_when_the_feed_fails(monkeypatch):
    def fail(*a, **k):
        raise news.requests.ConnectionError

    monkeypatch.setattr(news.requests, "get", fail)
    monkeypatch.setattr(news, "_cache", {})
    body = news.news_for_region("Nowhere, Atlantis")
    assert body["status"] == "unavailable" and body["articles"] == []


@needs_data
def test_demo_reefs_get_a_country_for_news():
    site = next(s for s in main.load_data()["sites"] if s["site_id"] == "NP01")  # labelled "Nusa Penida"
    assert main.nearest_country(site) == "Indonesia"


@needs_data
def test_bleaching_history_points_add_up_to_the_yearly_totals(client):
    body = client.get("/api/bleaching-history").json()
    per_year = {}
    for lat, lon, year, mean, peak, n, country in body["points"]:
        assert 0 <= mean <= peak <= 100 and n >= 1 and 0 <= country < len(body["countries"])
        per_year[year] = per_year.get(year, 0) + n
    assert per_year == {y["year"]: y["surveys"] for y in body["years"]}
    assert min(per_year) == main.HISTORY_FIRST_YEAR
    for y in body["years"]:
        assert 0 <= y["bleachedShare"] <= 1
        assert sum(c["surveys"] for c in y["topCountries"]) <= y["surveys"]


def test_scored_data_is_cached_until_the_file_changes(tmp_path, monkeypatch):
    path = tmp_path / "sites_scored.json"
    site = {"site_id": "A", "bleaching_probability": 0.2}
    path.write_text(json.dumps({"sites": [site]}))
    monkeypatch.setattr(main, "DATA_PATH", path)
    first = main.load_data()
    assert main.load_data() is first  # parsed once
    assert main.find_site("A")["bleaching_probability"] == 0.2

    path.write_text(json.dumps({"sites": [{**site, "bleaching_probability": 0.7}]}))
    os.utime(path, ns=(path.stat().st_atime_ns, path.stat().st_mtime_ns + 1_000_000))
    assert main.find_site("A")["bleaching_probability"] == 0.7  # re-read after a pipeline run


@needs_data
def test_model_endpoint_reports_validation_when_available(client):
    body = client.get("/api/model").json()
    assert "metrics" in body and "validation" in body
    if main.VALIDATION_PATH.exists():
        assert {"time_splits", "country_holdouts", "cyclone_confound"} <= body["validation"].keys()

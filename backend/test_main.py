"""API tests. Run from backend/:  python3 -m pytest -q

The endpoint tests use the real scored data and model, and are skipped until the pipeline has run.
"""
import pytest
from fastapi.testclient import TestClient

import main

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


@needs_data
def test_predict_validates_input(client):
    assert client.post("/api/predict", json={"latitude": 200, "longitude": 0, "dhwMax12w": 1}).status_code == 422
    assert client.post("/api/predict", json={"latitude": 0, "longitude": 0, "dhwMax12w": -1}).status_code == 422

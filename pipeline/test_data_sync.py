"""Offline tests for the scheduled data sync scripts (no network).

cd pipeline; python -m pytest -q test_data_sync.py
"""
import importlib.util
import json
import sys
from pathlib import Path

import pandas as pd
import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import common  # noqa: E402
from config import GCBD_SITES_COLUMNS  # noqa: E402


def load(filename):
    """Import a digit-prefixed pipeline script as a module."""
    spec = importlib.util.spec_from_file_location(f"script_{Path(filename).stem}", HERE / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


crw = load("02_fetch_crw.py")
grid = load("02b_fetch_crw_grid.py")
gcbd = load("01d_sync_gcbd.py")
mermaid = load("05_fetch_mermaid.py")
photos = load("06_fetch_reef_photos.py")


# --- common.get_json ------------------------------------------------------------------------------

class FakeResponse:
    def __init__(self, status, body=None, headers=None):
        self.status_code, self._body, self.headers = status, body, headers or {}

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise common.requests.HTTPError(f"HTTP {self.status_code}", response=self)


def test_get_json_retries_server_errors_and_honours_retry_after(monkeypatch):
    responses = [FakeResponse(503), FakeResponse(429, headers={"Retry-After": "7"}), FakeResponse(200, {"ok": 1})]
    sleeps = []
    monkeypatch.setattr(common.requests, "get", lambda *a, **k: responses.pop(0))
    monkeypatch.setattr(common.time, "sleep", sleeps.append)
    assert common.get_json("https://example.test") == {"ok": 1}
    assert sleeps == [2, 7]


def test_get_json_gives_up_on_client_errors_and_after_all_attempts(monkeypatch):
    calls = []
    monkeypatch.setattr(common.time, "sleep", lambda s: None)
    monkeypatch.setattr(common.requests, "get", lambda *a, **k: calls.append(1) or FakeResponse(404))
    assert common.get_json("https://example.test") is None
    assert len(calls) == 1
    monkeypatch.setattr(common.requests, "get", lambda *a, **k: calls.append(1) or FakeResponse(500))
    assert common.get_json("https://example.test", attempts=3) is None
    assert len(calls) == 4


def test_requests_use_a_short_connect_timeout(monkeypatch):
    timeouts = []
    monkeypatch.setattr(common.requests, "get",
                        lambda *a, **k: timeouts.append(k["timeout"]) or FakeResponse(200, {"ok": 1}))
    common.get_json("https://example.test", timeout=60)
    assert timeouts == [(common.CONNECT_TIMEOUT_S, 60)]
    monkeypatch.setattr(common.requests, "get", lambda *a, **k: timeouts.append(k["timeout"]) or FakeResponse(500))
    monkeypatch.setattr(common.time, "sleep", lambda s: None)
    assert common.erddap_csv("CRW_DHW[last]", timeout=600, attempts=1) is None
    assert timeouts[-1] == (common.CONNECT_TIMEOUT_S, 600)


def test_haversine_km_is_vectorised():
    km = common.haversine_km(0, 0, [0, 0], [1, 0])
    assert km[0] == pytest.approx(111.19, abs=0.01)
    assert km[1] == 0


# --- 02 / 02b: failed sites keep their previous rows ----------------------------------------------

def test_crw_merge_previous_keeps_sites_missing_from_new_run():
    previous = pd.DataFrame({"site_id": ["A", "A", "B", "C"], "CRW_DHW": [1, 2, 3, 4]})
    new = pd.DataFrame({"site_id": ["A"], "CRW_DHW": [9]})
    out = crw.merge_previous(previous, new)
    assert sorted(out["site_id"]) == ["A", "B", "C"]
    assert out.loc[out["site_id"] == "A", "CRW_DHW"].tolist() == [9]
    assert out.loc[out["site_id"] == "C", "CRW_DHW"].tolist() == [4]


def test_grid_keep_failed_keeps_previous_rows_of_failed_cells_only():
    previous = pd.DataFrame({"site_id": ["A", "B", "C"], "dhw_max_12w": [1.0, 2.0, 3.0]})
    new = pd.DataFrame({"site_id": ["A"], "dhw_max_12w": [9.0]})
    out = grid.keep_failed(previous, new, ["B"])
    assert dict(zip(out["site_id"], out["dhw_max_12w"])) == {"A": 9.0, "B": 2.0}


def run_grid(monkeypatch, tmp_path, ok_cells):
    """Run 02b main() on two sites in different cells; only cells in ok_cells download."""
    sites = tmp_path / "sites.csv"
    pd.DataFrame({"site_id": ["A", "B"], "lat": [0.5, 10.5], "lon": [0.5, 10.5]}).to_csv(sites, index=False)
    out = tmp_path / "heat.csv"
    pd.DataFrame({"site_id": ["A", "B"], "dhw_max_12w": [1.0, 2.0]}).to_csv(out, index=False)
    monkeypatch.setattr(grid, "CRW_GRID_CACHE", tmp_path / "cache")
    monkeypatch.setattr(grid, "fetch_cell", lambda cell, box, refresh: (cell, *(("dhw", "sst") if cell in ok_cells else (None, None))))
    monkeypatch.setattr(grid, "summarise", lambda site, dhw, sst: {"site_id": site.site_id, "dhw_max_12w": 9.0})
    monkeypatch.setattr(sys, "argv", ["02b", "--sites", str(sites), "--out", str(out), "--workers", "1"])
    grid.main()
    return pd.read_csv(out)


def test_grid_partial_failure_keeps_previous_rows(monkeypatch, tmp_path):
    out = run_grid(monkeypatch, tmp_path, {"0_0"})
    assert dict(zip(out["site_id"], out["dhw_max_12w"])) == {"A": 9.0, "B": 2.0}


def test_grid_all_cells_failed_exits_1_without_writing(monkeypatch, tmp_path):
    with pytest.raises(SystemExit) as exc:
        run_grid(monkeypatch, tmp_path, set())
    assert exc.value.code == 1
    assert pd.read_csv(tmp_path / "heat.csv")["dhw_max_12w"].tolist() == [1.0, 2.0]


# --- 01d: GCBD version check ------------------------------------------------------------------------

FP = {"etag": '"abc-2"', "last_modified": "Fri, 30 Jun 2023 16:53:39 GMT", "size": 16772400}


def test_gcbd_unchanged_fingerprint_does_not_download_or_write(monkeypatch, capsys):
    def forbidden(*args, **kwargs):
        raise AssertionError("must not be called when upstream is unchanged")

    monkeypatch.setattr(sys, "argv", ["01d_sync_gcbd.py"])
    monkeypatch.setattr(gcbd, "fingerprint", lambda *a, **k: dict(FP))
    monkeypatch.setattr(gcbd, "load_manifest", lambda *a, **k: {**FP, "sha256": "x", "checked": "then"})
    for name in ("download", "regenerate", "write_manifest"):
        monkeypatch.setattr(gcbd, name, forbidden)
    monkeypatch.setattr(gcbd.shutil, "copyfile", forbidden)
    gcbd.main()
    assert "unchanged" in capsys.readouterr().out


def test_gcbd_changed_or_missing_manifest_is_not_unchanged():
    assert not gcbd.unchanged(FP, None)
    assert not gcbd.unchanged(FP, {**FP, "etag": '"new-2"'})
    assert gcbd.unchanged(FP, {**FP, "sha256": "anything"})


@pytest.fixture
def gcbd_upstream_changed(monkeypatch, tmp_path):
    """01d main() wired to temp files, with a new upstream ETag and offline download/regenerate."""
    files = {"current": tmp_path / "gcbd_asia.csv", "demo": tmp_path / "demo.csv",
             "manifest": tmp_path / "gcbd_source.json", "raw": tmp_path / "raw" / "gcbd_v2.csv"}
    write_sites(files["current"], [f"GCBD{i}" for i in range(10)])
    write_sites(files["demo"], ["NP01"])
    old = {"url": "u", **FP, "sha256": "old-sha", "sites": 10, "generated_from": gcbd.BASELINE_SOURCE,
           "checked": "then"}
    files["manifest"].write_text(json.dumps(old))
    state = {"new_ids": [f"GCBD{i}" for i in range(9)] + ["GCBD99"], "sha256": "new-sha", "calls": []}

    def fake_download(url, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text("raw gcbd csv")
        state["calls"].append("download")
        return state["sha256"]

    def fake_regenerate(raw_csv, out_csv):
        assert Path(raw_csv) == files["raw"]
        write_sites(out_csv, state["new_ids"])
        state["calls"].append("regenerate")
        return True

    validate = gcbd.validate_sites
    write = gcbd.write_manifest
    monkeypatch.setattr(sys, "argv", ["01d_sync_gcbd.py"])
    monkeypatch.setattr(gcbd, "fingerprint", lambda *a, **k: {**FP, "etag": '"new-2"'})
    monkeypatch.setattr(gcbd, "load_manifest", lambda *a, **k: json.loads(files["manifest"].read_text()))
    monkeypatch.setattr(gcbd, "write_manifest", lambda manifest: write(manifest, files["manifest"]))
    monkeypatch.setattr(gcbd, "validate_sites", lambda new: validate(new, files["current"], files["demo"]))
    monkeypatch.setattr(gcbd, "download", fake_download)
    monkeypatch.setattr(gcbd, "regenerate", fake_regenerate)
    monkeypatch.setattr(gcbd, "GCBD_SYNC_RAW", files["raw"])
    monkeypatch.setattr(gcbd, "GCBD_SITES_CSV", files["current"])
    return files, state


def test_gcbd_changed_upstream_replaces_site_list_and_manifest(gcbd_upstream_changed):
    files, state = gcbd_upstream_changed
    gcbd.main()
    assert state["calls"] == ["download", "regenerate"]
    assert sorted(pd.read_csv(files["current"])["site_id"]) == sorted(state["new_ids"])
    manifest = json.loads(files["manifest"].read_text())
    assert (manifest["etag"], manifest["sha256"], manifest["sites"]) == ('"new-2"', "new-sha", 10)
    assert manifest["generated_from"] == gcbd.REGENERATED_SOURCE


def test_gcbd_same_content_only_refreshes_fingerprint(gcbd_upstream_changed, capsys):
    files, state = gcbd_upstream_changed
    state["sha256"] = "old-sha"  # same bytes re-uploaded under a new ETag
    before = files["current"].read_bytes()
    gcbd.main()
    assert state["calls"] == ["download"]
    assert files["current"].read_bytes() == before
    manifest = json.loads(files["manifest"].read_text())
    assert (manifest["etag"], manifest["sha256"]) == ('"new-2"', "old-sha")
    assert manifest["generated_from"] == gcbd.BASELINE_SOURCE and manifest["checked"] != "then"
    assert "content unchanged" in capsys.readouterr().out


def test_gcbd_rejected_site_list_leaves_files_untouched(gcbd_upstream_changed):
    files, state = gcbd_upstream_changed
    state["new_ids"] = ["GCBD0", "GCBD1"]  # 20 % of the current rows
    before = {k: files[k].read_bytes() for k in ("current", "manifest")}
    with pytest.raises(SystemExit) as exc:
        gcbd.main()
    assert exc.value.code == 1
    assert {k: files[k].read_bytes() for k in ("current", "manifest")} == before


def test_gcbd_network_failure_exits_1(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["01d_sync_gcbd.py"])
    monkeypatch.setattr(gcbd, "fingerprint", lambda *a, **k: None)
    with pytest.raises(SystemExit) as exc:
        gcbd.main()
    assert exc.value.code == 1


def write_sites(path, ids, columns=GCBD_SITES_COLUMNS):
    rows = [{c: (sid if c == "site_id" else 0) for c in columns} for sid in ids]
    pd.DataFrame(rows, columns=columns).to_csv(path, index=False)
    return path


@pytest.fixture
def site_lists(tmp_path):
    current = write_sites(tmp_path / "current.csv", [f"GCBD{i}" for i in range(10)])
    demo = write_sites(tmp_path / "demo.csv", ["NP01", "BL01"])
    return tmp_path, current, demo


def test_validate_sites_accepts_a_good_list(site_lists):
    tmp, current, demo = site_lists
    new = write_sites(tmp / "new.csv", [f"GCBD{i}" for i in range(9)])  # 90 % of current
    assert gcbd.validate_sites(new, current, demo) == []


def test_validate_sites_rejects_wrong_header(site_lists):
    tmp, current, demo = site_lists
    new = write_sites(tmp / "new.csv", [f"GCBD{i}" for i in range(10)], GCBD_SITES_COLUMNS[:-1])
    assert "header" in gcbd.validate_sites(new, current, demo)[0]


def test_validate_sites_rejects_big_row_drop(site_lists):
    tmp, current, demo = site_lists
    new = write_sites(tmp / "new.csv", [f"GCBD{i}" for i in range(7)])  # 70 %
    assert any("below 80%" in p for p in gcbd.validate_sites(new, current, demo))


def test_validate_sites_rejects_duplicate_ids(site_lists):
    tmp, current, demo = site_lists
    new = write_sites(tmp / "new.csv", [f"GCBD{i}" for i in range(9)] + ["GCBD0"])
    assert any("duplicate" in p for p in gcbd.validate_sites(new, current, demo))


def test_validate_sites_rejects_demo_id_collision(site_lists):
    tmp, current, demo = site_lists
    new = write_sites(tmp / "new.csv", [f"GCBD{i}" for i in range(9)] + ["NP01"])
    assert any("demo" in p for p in gcbd.validate_sites(new, current, demo))


# --- 05: MERMAID hard coral ---------------------------------------------------------------------------

def cover(pct):
    return {"sample_unit_count": 2, "percent_cover_benthic_category_avg": {"Hard coral": pct, "Sand": 5}}


def test_hard_coral_prefers_pit_then_lit_then_pqt_then_quadrat():
    quadrat = {"percent_hard_avg_avg": 40.0}
    assert mermaid.hard_coral({"benthiclit": cover(20), "benthicpit": cover(10),
                               "quadrat_benthic_percent": quadrat}) == (10.0, "benthicpit")
    assert mermaid.hard_coral({"benthicpqt": cover(30), "benthiclit": cover(20)}) == (20.0, "benthiclit")
    assert mermaid.hard_coral({"benthicpqt": cover(30), "quadrat_benthic_percent": quadrat}) == (30.0, "benthicpqt")
    assert mermaid.hard_coral({"quadrat_benthic_percent": quadrat}) == (40.0, "quadrat_benthic_percent")


def test_hard_coral_skips_benthicpqt_without_cover():
    assert mermaid.hard_coral({"benthicpqt": {"sample_unit_count": 4}}) is None
    assert mermaid.hard_coral({"beltfish": {"biomass_kgha_avg": 3}}) is None
    assert mermaid.hard_coral(None) is None
    assert mermaid.hard_coral({"benthicpqt": {"sample_unit_count": 4},
                               "quadrat_benthic_percent": {"percent_hard_avg_avg": 12}}) == (12.0, "quadrat_benthic_percent")


def test_summarise_sites_uses_latest_date_mean():
    def event(date, pct, site="s1"):
        return {"site_id": site, "site_name": "Site", "latitude": -8.7, "longitude": 115.4,
                "sample_date": date, "project_id": "p", "protocols": {"benthicpit": cover(pct)}}

    out = mermaid.summarise_sites([event("2020-01-01", 90), event("2024-04-09", 10), event("2024-04-09", 20),
                                   {**event("2024-05-01", 50), "protocols": {"benthicpqt": {"sample_unit_count": 1}}}])
    row = out.iloc[0]
    assert (row["sample_date"], row["hard_coral_pct"], row["n_sample_events"]) == ("2024-04-09", 15.0, 2)


# --- 06: iNaturalist photos -----------------------------------------------------------------------------

def photo(pid, license_code="cc-by", w=2048, h=1536):
    return {"id": pid, "url": f"https://static.test/photos/{pid}/square.jpg", "license_code": license_code,
            "attribution": f"(c) someone ({pid})", "original_dimensions": {"width": w, "height": h}}


def obs(oid, location, observed_on, *photo_list, user=None):
    return {"id": oid, "uri": f"https://www.inaturalist.org/observations/{oid}", "observed_on": observed_on,
            "location": location, "taxon": {"name": "Acropora"},
            "user": user or {"login": "diver", "name": "Dee Diver"}, "photos": list(photo_list)}


def test_photo_record_drops_missing_or_unknown_licences():
    o = obs(1, "0,0", "2024-01-01")
    assert photos.photo_record(o, photo(1, None)) is None
    assert photos.photo_record(o, photo(1, "all-rights-reserved")) is None
    assert photos.photo_record(o, photo(1, "cc-by-nc")) is not None


def test_photo_record_rewrites_urls_and_scales_dimensions():
    pid, rec = photos.photo_record(obs(5, "0,0", "2024-01-01", user={"login": "diver", "name": None}),
                                   photo(9, "cc-by-nc", 2048, 1536))
    assert pid == "9"
    assert rec["url"] == "https://static.test/photos/9/medium.jpg"
    assert rec["large_url"] == "https://static.test/photos/9/large.jpg"
    assert (rec["width"], rec["height"]) == (500, 375)
    assert rec["photographer"] == "diver"
    assert rec["license"] == "cc-by-nc"
    assert rec["observation_url"] == "https://www.inaturalist.org/observations/5"
    _, small = photos.photo_record(obs(5, "0,0", None), photo(9, "cc0", 300, 400))
    assert (small["width"], small["height"]) == (300, 400)


def test_assign_honours_radius_cap_and_one_photo_per_observation():
    near = "0.01,0.0"   # ~1.1 km
    far = "0.2,0.0"     # ~22 km
    observations = [
        obs(1, near, "2024-01-01", photo(11), photo(12)),
        obs(2, far, "2024-06-01", photo(21)),
        obs(3, near, "2024-03-01", photo(31, None), photo(32)),
        obs(4, near, "2024-02-01", photo(41)),
        obs(5, "hidden", "2024-07-01", photo(51)),
    ]
    picks = photos.assign(0.0, 0.0, observations, radius_km=10, per_reef=6)
    assert [p[0] for p in picks] == ["32", "41", "11"]  # newest first, first valid photo of each
    assert all(km <= 10 for _, km, _ in picks)
    assert [p[0] for p in photos.assign(0.0, 0.0, observations, radius_km=10, per_reef=2)] == ["32", "41"]


def test_cells_group_sites_by_tenth_of_a_degree():
    sites = pd.DataFrame({"site_id": ["a", "b", "c", "d"],
                          "lat": [-8.71, -8.79, -8.81, 10.05], "lon": [115.41, 115.49, 115.41, 120.0]})
    groups = photos.cells(sites)
    assert sorted(sorted(g["site_id"]) for g in groups.values()) == [["a", "b"], ["c"], ["d"]]
    lat, lon, radius = photos.cell_query(groups[next(k for k, g in groups.items() if len(g) == 2)], 10)
    assert (lat, lon) == (-8.75, 115.45)
    assert radius == 17  # 10 km + ~6.2 km to the farthest member, rounded up


def test_query_cell_asks_for_open_licences_and_exact_locations_only(monkeypatch):
    seen = {}
    monkeypatch.setattr(photos, "throttle", lambda: None)
    monkeypatch.setattr(photos, "get_json", lambda url, params: seen.update(params) or {"results": []})
    assert photos.query_cell(-8.7, 115.4, 12) == []
    assert (seen["geoprivacy"], seen["taxon_geoprivacy"]) == ("open", "open")
    assert seen["photo_license"].split(",") == list(photos.ALLOWED_LICENSES)


def run_photos(monkeypatch, tmp_path, results, previous=None):
    out = tmp_path / "reef_photos.json"
    if previous is not None:
        out.write_text(json.dumps(previous))
    sites = pd.DataFrame({"site_id": ["A", "B"], "lat": [0.0, 5.0], "lon": [0.0, 5.0]})
    monkeypatch.setattr(photos, "REEF_PHOTOS", out)
    monkeypatch.setattr(photos, "load_site_list", lambda: sites)
    monkeypatch.setattr(photos, "query_cell", lambda lat, lon, r: results.get(round(lat)))
    monkeypatch.setattr(sys, "argv", ["06_fetch_reef_photos.py"])
    photos.main()
    return json.loads(out.read_text())


def test_photos_failed_cell_keeps_previous_entries(monkeypatch, tmp_path):
    previous = {"photos": {"7": {"url": "old"}}, "reefs": {"A": [["8", 1.0]], "B": [["7", 2.0]]}}
    data = run_photos(monkeypatch, tmp_path, {0: [obs(1, "0.01,0", "2024-01-01", photo(11))], 5: None},
                      previous)
    assert data["reefs"] == {"A": [["11", 1.11]], "B": [["7", 2.0]]}
    assert set(data["photos"]) == {"11", "7"}


def test_photos_all_requests_failed_writes_nothing(monkeypatch, tmp_path):
    previous = {"photos": {}, "reefs": {}}
    with pytest.raises(SystemExit) as exc:
        run_photos(monkeypatch, tmp_path, {}, previous)
    assert exc.value.code == 1
    assert json.loads((tmp_path / "reef_photos.json").read_text()) == previous

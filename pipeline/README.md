# ReefSense data pipeline

Scripts are numbered in run order (letters are alternatives or follow-ups to the same step). Run them from the repository root, e.g. `python pipeline/02_fetch_crw.py`; shared settings live in `config.py`, helpers in `common.py`.

| Script | What it does | Writes |
| --- | --- | --- |
| `00_check_feasibility.py` | Counts usable bleaching labels in GCBD | (prints only) |
| `01_fetch_gcbd.py` | Downloads GCBD from the BCO-DMO ERDDAP. This is the 2019 v1 copy, which lacks `Site_ID`, `Site_Name` and `Data_Source`, so `01c` cannot run on it | `data/raw/gcbd.csv` |
| `01b_import_gcbd_sqlite.py` | Flattens the GCBD SQLite release (adds hard coral cover); the source of the current site list | `data/raw/gcbd.csv` |
| `01c_make_gcbd_sites.py` | One site per surveyed GCBD location in Asia (`--gcbd`, `--out` to use other files) | `data/sites/gcbd_asia.csv` |
| `01d_sync_gcbd.py` | Checks BCO-DMO 773466 v2 for a new version; regenerates and validates the site list only when it changed (`--force`, `--baseline`) | `data/sites/gcbd_asia.csv`, `data/sites/gcbd_source.json` |
| `02_fetch_crw.py` | NOAA Coral Reef Watch daily series for the demo sites (`--days`, `--only`) | `data/processed/crw_timeseries.csv` |
| `02b_fetch_crw_grid.py` | NOAA CRW heat summaries for the GCBD Asia sites from regional grids (`--refresh`), plus each site's daily DHW series for the heat timeline (`GET /api/reefs/{id}/heat-history`) | `data/processed/crw_heat_grid.csv`, `data/processed/crw_heat_grid_series.json` |
| `03_train_bleaching.py` | Trains the bleaching model | `data/processed/bleaching_model.joblib` (gitignored), `model_metrics.json` |
| `04_score_sites.py` | Scores every site with the model and live heat stress; the API serves this file | `data/processed/sites_scored.json` |
| `05_reef_area_tiles.py` | Renders UNEP-WCMC reef extent tiles (local only, not redistributable) | `data/processed/reef_area_tiles/` (gitignored) |
| `05_fetch_mermaid.py` | Nearest MERMAID survey hard coral cover within 10 km of each reef (`--radius-km`) | `data/processed/mermaid_sites.json` |
| `06_fetch_reef_photos.py` | Openly licensed iNaturalist coral photos within 10 km of each reef, from observations with an exact (not obscured) location (`--radius-km`, `--per-reef`, `--only`); served by `GET /api/reefs/{id}/photos` and shown in the ReefSense panel ([`../reefsense/README.md`](../reefsense/README.md)) | `data/processed/reef_photos.json` |
| `06_validate_model.py` | Stress tests: later years, held-out countries and the cyclone check, against DHW alone (local, not part of the scheduled sync); served by `GET /api/model` | `data/processed/model_validation.json` |

Every fetcher is fail-soft: sites, cells or sources that fail keep their previous data, and a script that gets nothing at all exits 1 without writing.

Tests (offline): `cd pipeline; python -m pytest -q test_data_sync.py`.

## Scheduled data sync

`.github/workflows/data-sync.yml` ("Data sync") refreshes the data on GitHub Actions and commits any changed files back to the branch.

| Job | Cron (UTC) | WIB (UTC+7) | Runs |
| --- | --- | --- | --- |
| `daily` | `30 22 * * *` | 05:30 every day | `02_fetch_crw.py --days 180`, `02b_fetch_crw_grid.py --refresh`, then `04_score_sites.py` if the model is available |
| `weekly` | `0 0 * * 1` | Monday 07:00 | `01d_sync_gcbd.py`, `05_fetch_mermaid.py`, `06_fetch_reef_photos.py` (~55 min) |

Why 22:30 UTC: NOAA CRW publishes the daily 5 km product around 13:30 US Eastern (17:30 UTC in summer, 18:30 UTC in winter), and the CoastWatch ERDDAP mirror the scripts read from picks it up afterwards. 22:30 UTC leaves a 4-5 hour buffer, and the half hour avoids GitHub's top-of-hour load spikes.

Each source step may fail without stopping the others. Every source step has its own `timeout-minutes` (daily: 02 35, 02b 60, 04 15; weekly: 01d 10, 05 MERMAID 15, 06 photos 85; jobs 120), so a hanging server only fails that step and the commit and summary steps still run. Requests also give up on a connection after 15 s. The job summary lists every source's outcome, and a job fails only when all of its sources failed. Commits are made as `github-actions[bot]` (`data: daily NOAA sync YYYY-MM-DD`, `data: weekly sync YYYY-MM-DD`) by `.github/scripts/commit-data.sh`, and only when a file actually changed. The GCBD check rewrites nothing unless the upstream file changed; if only the ETag or date changed but the downloaded file has the same sha256, it refreshes the fingerprint in `gcbd_source.json` and leaves `gcbd_asia.csv` alone.

Things to know:

- Scheduled workflows run only from the default branch, `main`. The schedule starts once this workflow is merged there.
- GitHub may delay scheduled runs at busy times, and in public repositories it disables schedules after 60 days without repository activity. Re-enable it in the Actions tab.
- Manual run: Actions → Data sync → Run workflow, choose `all`, `daily` or `weekly`. Or from the CLI: `gh workflow run data-sync.yml -f sync=weekly --ref main`. With `all`, the weekly job waits for the daily one so the two never push at the same time.
- No secrets are needed. All sources are public, and the push uses the automatic `GITHUB_TOKEN` (`permissions: contents: write`).
- Branch protection on `main` that requires pull requests or reviews would block the bot's push. Allow GitHub Actions to bypass it, or point the workflow at another branch.
- Scoring is skipped in CI. `04_score_sites.py` needs `data/processed/bleaching_model.joblib` and `data/raw/gcbd.csv`, and both are gitignored. The daily job refreshes the NOAA inputs and posts a "Scoring skipped" notice. The map only changes after someone rescores locally: `python pipeline/03_train_bleaching.py`, then `python pipeline/04_score_sites.py`, then commit `data/processed/sites_scored.json`.

## Sources and licences

- NOAA Coral Reef Watch v3.1 daily 5 km heat stress, via the CoastWatch ERDDAP: US Government work, public domain.
- Global Coral-Bleaching Database (van Woesik & Kratochwill 2022), BCO-DMO dataset 773466: CC BY 4.0.
- MERMAID (datamermaid.org) public sample-event summaries: cite each project's `suggested_citation`, stored per project in `mermaid_sites.json`.
- iNaturalist observations: each photo keeps its own Creative Commons licence and attribution (`license`, `attribution`, `photographer`, `observation_url` in `reef_photos.json`). Photos without a CC licence are never stored, and the credit has to be shown wherever a photo is displayed.
- Satellite view in the app: Esri World Imagery. Show the attribution "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community".

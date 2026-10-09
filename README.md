# ReefSense

**AI early warning for coral bleaching, and a transparent guide to where restoration will last. Built for Indonesian reefs.**

- **Live site:** https://www.reefsense.online (backup: https://reefsense.fly.dev)
- **Case study, Crystal Bay (Nusa Penida, Bali):** https://www.reefsense.online/?reef=NP01
- **Track:** ForgeHacks 2026, AI + Climate. Built in 7 days by Antonio Owen Putra Amadeus and Glenn Putra Laymando.

> The model is trained on the Global Coral-Bleaching Database (Nov 2021 SQLite release); every number below comes from `data/processed/model_metrics_*.json` and `data/processed/model_validation.json`. The web app lives in `reefsense/`.

## Problem statement

Coral reefs bleach when the ocean stays too hot for too long. The world's standard warning system, NOAA Coral Reef Watch, measures that heat in **degree heating weeks (DHW)**: heat above a reef's usual warmest month, added up over the last 12 weeks. Its alerts start escalating at 4 DHW.

In our own data, 23,186 labelled dive surveys, the rule "DHW ≥ 4" caught only about **1 in 4** bleaching events (26% globally, 22% in the Coral Triangle). Most reefs bleach before the alarm sounds.

That gap hurts most in Indonesia, at the heart of the Coral Triangle. People protecting reefs there have small budgets, and restoring a reef takes years, so they need answers to two questions that heat alerts alone cannot give:

1. Which reefs are at risk **now**, even when there is no alert?
2. Where is restoration effort **most likely to last**?

## Target users

| User | Decision ReefSense helps with |
|---|---|
| **Reef restoration teams** (NGOs, community groups) | *A Nusa Penida team choosing which 5 sites to plant this season:* rank reefs by low bleaching risk and healthy coral cover, with weights they set. |
| **Marine-park managers and rangers** | Which reefs to survey first this month, including the 851 at-risk reefs where NOAA's alerts stayed silent. |
| **Dive operators and local communities** | Understand what is happening to "their" reef in plain language, see past bleaching nearby, and find local groups to support. |
| **Researchers and students** | Inspect the model's reasons for every estimate, and its validation, including where it fails. |

## What ReefSense does

1. **Bleaching outlook per reef.** For 3,780 surveyed reefs, mostly across Asia (635 in Indonesia), a model estimates the chance of avoiding significant bleaching (10% or more of colonies) under the last 12 weeks of live satellite heat stress.
2. **The NOAA gap.** One click highlights the 851 reefs at elevated risk where NOAA's alerts did not reach Alert Level 1 in 12 weeks.
3. **Every estimate explains itself.** A *Plain language* view for everyone; an *Expert* view with the satellite heat record, a what-if heat slider that re-runs the model live, and the model's reasons (which factors pushed the estimate up or down).
4. **The full reef report.** Past bleaching surveys nearby, coral news from the region, a satellite view, openly licensed iNaturalist photos, and hand-picked local conservation groups with their own donation pages (ReefSense never handles money).
5. **Where to restore first.** A transparent ranking of low bleaching risk and healthy coral cover, with user-set weights. Reefs without a dive survey are left out, not guessed. Climate refugia (50 Reefs+) and larval connectivity are **planned** criteria: the scoring supports them, but their data is not loaded yet.
6. **Shareable links** to any reef, e.g. `?reef=NP01`.

## Technical approach

The AI is a model we trained and validated ourselves, not a call to a chatbot API.

```
NOAA Coral Reef Watch (daily 5 km DHW, SST anomaly)  ─┐
Global Coral-Bleaching Database (labelled surveys)  ──┼─> LightGBM bleaching model ─> site scores ─> FastAPI ─> React + Leaflet
MERMAID coral cover / UNEP-WCMC reef extent         ──┘         │                                   └─> transparent ranking
                                                                └─> per-feature contributions (explanations), /api/predict (what-if)
```

- **Label:** bleaching of 10% or more of colonies, from survey records (see below).
- **Model:** class-balanced LightGBM classifier over 16 features: accumulated heat (DHW, max and mean DHW, SST anomaly and their frequencies) plus each reef's conditions (turbidity, depth, distance to shore, wave exposure, cyclone frequency, wind speed). Reported as "probability of high climate resilience" = 1 − P(bleaching ≥ 10%).
- **Explainable AI:** LightGBM's exact per-feature contributions (SHAP-equivalent), which sum to the prediction in log-odds. The reasons on screen come straight from the trained model.
- **Live inference:** every reef is rescored from the last 12 weeks of NOAA heat stress; the what-if slider calls `POST /api/predict`.
- **Reefs without their own survey:** site conditions come from the nearest surveyed reefs (BallTree, haversine distance).
- **Validation:** 5-fold cross-validation **grouped by ecoregion** (each fold tests on places the model never saw), then stress tests on later years, the 2016 global bleaching event and whole countries held out, always against heat alone on the same surveys (see Results).

## Technical components

| Layer | Components |
|---|---|
| Data pipeline | Python, pandas, NumPy, scikit-learn, LightGBM, joblib, GeoPandas (`pipeline/`) |
| Data sources | NOAA Coral Reef Watch v3.1 (ERDDAP), Global Coral-Bleaching Database, MERMAID, iNaturalist, Mongabay, UNEP-WCMC reef extent |
| API | FastAPI + Uvicorn (`backend/`): scores, explanations, heat and survey history, news, photos, support links, `/api/predict` |
| Web app | React + TypeScript + Vite, Tailwind CSS + shadcn/ui, Leaflet maps, Recharts charts (`reefsense/`) |
| Automation | GitHub Actions: daily NOAA heat refresh and rescoring, weekly coral cover, photos and donation-link check |
| Deployment | One Docker image (web app + API on one URL) on Fly.io, custom domain with HTTPS |
| Demo video | Remotion + Playwright recordings of the live site, Kokoro narration, music generated in code (`video/`) |

## Real-world impact

- **Earlier warning.** Highlights reefs at elevated risk that heat-only alerts miss, so rangers and divers can check them before bleaching spreads.
- **Budgets go further.** Restoration teams can see where effort is most likely to last, instead of planting coral on a reef likely to bleach next season.
- **Trust through transparency.** Every estimate shows its reasons, every ranking shows its weights, and the validation shows where the model fails (Japan). Users can judge the tool rather than take it on faith.
- **Awareness that leads to action.** Plain-language summaries, nearby news and community photos make reef change understandable to non-scientists, and the reef report links to local conservation groups people can support.
- **Kept fresh automatically.** Scheduled jobs refresh heat stress daily, so the map reflects the ocean now, not a static snapshot.

ReefSense supports decisions; it does not replace field surveys. Every estimate is labelled a prediction, not an observation.

## Results and method details

| Component | Approach |
|---|---|
| Label | Bleaching ≥ 10% of colonies (GCBD survey records; see below) |
| Model | LightGBM classifier, class-balanced |
| Validation | Grouped k-fold by ecoregion (spatial), not a random split |
| Baseline | DHW alone, plus NOAA-style DHW ≥ 4 and ≥ 8 rules |
| Explanations | LightGBM per-feature contributions (SHAP-equivalent) |
| Ranking | Weighted score of low bleaching risk and coral cover; missing criteria excluded per site (refugia and connectivity planned) |

Percent bleaching per survey is taken, in order of preference, from the recorded percent of colonies bleached (8,947 surveys), the mean of Reef Check's four population-level transect segments (11,297), or the midpoint of a coarse severity code (2,942). See `pipeline/01b_import_gcbd_sqlite.py`.

### Results

Out-of-fold scores from 5-fold cross-validation grouped by ecoregion (each fold tests on ecoregions the model never saw).

| Model | Training rows | Bleached | ROC AUC | PR AUC | DHW alone, ROC AUC | Indonesia, ROC AUC |
|---|---|---|---|---|---|---|
| Global (served by the API) | 23,186 | 27.8% | **0.754** | 0.563 | 0.677 | 0.715 (n = 937) |
| Coral Triangle | 3,778 | 11.5% | **0.724** | 0.373 | 0.675 | 0.733 (n = 937) |

The NOAA-style rule "DHW ≥ 4" catches only 26% of bleaching events globally (22% in the Coral Triangle), which is the "1 in 4" in the problem statement: most recorded bleaching happens below the heat level at which standard alerts escalate.

#### Stress tests (`pipeline/06_validate_model.py`)

The ecoregion split above holds out places but not time. These tests hold out later years, and whole countries, and compare against heat alone (DHW) on exactly the same surveys.

| Test | Test surveys | Bleached | Model ROC AUC | DHW alone |
|---|---|---|---|---|
| Train on surveys to 2012, test on 2013–2020 | 5,822 | 21% | **0.822** | 0.778 |
| Train on surveys to 2015, test on the 2016 global bleaching event | 1,159 | 42% | **0.771** | 0.726 |
| Indonesia never seen in training | 937 | 15% | **0.744** | 0.680 |
| Japan never seen in training | 842 | 34% | 0.759 | **0.767** |

The model beats heat alone on later years, on the 2016 event and on an unseen Indonesia. In Japan, heat alone does as well: there the extra site information does not add skill.

**Cyclone frequency is not a stand-in for "Japan".** Japan's cyclone values are shared widely (only 11% of surveys in Japan's range are Japanese), though the model leans on the feature more there (16% of a Japanese prediction's explanation vs 6% elsewhere). Removing it changes little: spatial cross-validation ROC AUC 0.763 without it vs 0.754 with it, and the NOAA-gap map flags 861 reefs instead of 851, still led by Japan (386 vs 425). The Japanese flags therefore come from several site conditions together, not from that one feature.

## Data sources

| Dataset | Use | License |
|---|---|---|
| [NOAA Coral Reef Watch v3.1](https://coralreefwatch.noaa.gov/) daily 5 km | Live heat stress, model input | Public domain |
| [Global Coral-Bleaching Database](https://www.bco-dmo.org/dataset/773466) (van Woesik & Kratochwill 2022) | Training labels and features | CC BY 4.0 |
| [Allen Coral Atlas](https://allencoralatlas.org/) | Reef habitat layers | CC BY 4.0 |
| [MERMAID](https://datamermaid.org/) public summaries | Coral cover per site | Per project |
| [50 Reefs+](https://zenodo.org/records/18729043) climate refugia layer | Planned ranking criterion (not loaded yet) | See record |
| [UNEP-WCMC Global Distribution of Coral Reefs](https://data.unep-wcmc.org/datasets/1) v4.1 (2021) | Reef-area map layer | UNEP-WCMC General Data License: non-commercial; may be shown online only if not downloadable, with citation |

## Run it locally

```bash
# 1. Pipeline (Python 3.11+)
python -m venv .venv && source .venv/bin/activate
pip install -r pipeline/requirements.txt
python pipeline/01b_import_gcbd_sqlite.py # labels, from the GCBD SQLite placed in data/raw/
#   (or: python pipeline/01_fetch_gcbd.py  # ERDDAP download, when the BCO-DMO server is up)
python pipeline/00_check_feasibility.py   # go/no-go on Indonesian label counts
python pipeline/02_fetch_crw.py --days 180  # demo sites: ~30 s per site via the NOAA/PacIOOS ERDDAP mirror
python pipeline/01c_make_gcbd_sites.py     # every surveyed reef in Asia: 3,756 sites, 26 countries
#   (or --country Indonesia for one country)
python pipeline/02b_fetch_crw_grid.py       # their heat stress as regional grids (~11 min for 3,756 sites, not ~33 h)
python pipeline/03_train_bleaching.py --region global
python pipeline/04_score_sites.py         # writes data/processed/sites_scored.json
python pipeline/05_reef_area_tiles.py     # optional reef-area map layer for Asia (~6 min); needs the UNEP-WCMC
#   coral reef zip in data/raw/wcmc/ (https://data.unep-wcmc.org/datasets/1)
python pipeline/06_validate_model.py      # optional stress tests (~35 s): later years, held-out countries, cyclone check

# 2. API
pip install -r backend/requirements.txt
cd backend && uvicorn main:app --reload --port 8000

# 3. Frontend (Node 18+)
cd reefsense && npm install && npm run dev   # http://localhost:5173
# The original single-panel UI is still in frontend/ and uses the same API.
```

API endpoints: `GET /api/reefs`, `GET /api/reefs/{id}`, `GET /api/reefs/{id}/explanation`, `GET /api/reefs/{id}/heat-history` (daily DHW, 12 weeks), `GET /api/reefs/{id}/survey-history` (past GCBD surveys within 10 km, by year), `GET /api/reefs/{id}/news` (coral stories from Mongabay that name the reef's province or country; about the region, not the specific reef), `GET /api/reefs/{id}/photos` (cached iNaturalist coral photos within 10 km; refreshed weekly by the GitHub Actions data sync, see `pipeline/README.md`), `GET /api/reefs/{id}/support` (curated reef conservation organisations near the reef from `data/sites/support_links.json`: site, then region, then country, then a global fallback; ReefSense does not handle donations), `GET /api/noaa-gap`, `GET /api/bleaching-history` (every observed bleaching survey since 1998, per location and year, for the replay map), `POST /api/predict`, `GET /api/model`, plus the original `GET /api/sites` and `GET /api/ranking`.

Edit `data/sites/demo_sites.csv` to add reefs or fill `coral_cover_pct`, `refugia_50reefs_plus` (0/1), `connectivity` and `in_mpa` (0/1).

### Support links

The "Support reef conservation" links in the reef panel come from `data/sites/support_links.json`, curated by hand. To add or update an organisation, put it under `organisations` (the https URL of its own donate, support or membership page, a one-line `description`, the page `language` and `verified_on`), then reference it from a `scopes` entry: `tier` (`site`, `region` or `country`), `match` labels as they appear in the site's `region` (e.g. `Kochi` for "Kochi, Japan") or site ids for `site`, a per-entry `scope` place name and `reach` (`local`, `national` or `global`), with 1-3 organisations per scope. The first matching scope at the most specific tier wins; the single `global` scope is the fallback. Verification rule: only add a page you opened yourself (https, HTTP 200, genuinely that organisation's own page), never guess a URL path, and run `python pipeline/07_check_support_links.py` before committing. The API refuses to serve the file (503) if a URL is not https or a reference is broken.

## Deploy

One Docker image (`Dockerfile`) serves the web app and the API from the same URL. There are three step-by-step guides (the live site runs on Fly.io):
- [DEPLOY-AZURE.md](DEPLOY-AZURE.md): Azure Container Apps with Azure for Students, no credit card needed.
- [DEPLOY-CLOUD-RUN.md](DEPLOY-CLOUD-RUN.md): Google Cloud Run, free with the Google Cloud trial.
- [DEPLOY.md](DEPLOY.md): Fly.io (`fly.toml`), about $2 a week. It also covers cost and alternatives.

## What's next

Built in 7 days, so we kept the scope honest. Next, in rough order:

- **Close the loop: from forecast to field and back.** Today ReefSense predicts; next it should also learn from what people see underwater.
  - An **AI survey planner** that tells divers and rangers where to look this week: reefs where one survey would improve the forecast most (high predicted risk, high uncertainty, few past surveys, reachable by boat).
  - A **photo model** that turns divers' and tourists' reef photos into bleaching estimates, asking for a human check when unsure.
  - Each confirmed photo becomes a new label at that reef, the map shows predicted vs observed, and the model retrains on the new data, so the system gets better the more it is used.
- **Climate refugia and larval connectivity in the ranking.** The scoring already supports extra criteria; we left these out rather than fake data we have not loaded yet (50 Reefs+ and a connectivity model).
- **Bahasa Indonesia.** The plain-language view, the ranking and the reef report in Indonesian, for local communities, rangers and dive operators.
- **Grounded Q&A per reef.** Ask questions about a reef and get answers written only from that reef's own model output, explanation, survey history and news, with sources shown, and "we don't know" when the data does not cover it.
- **Feedback from restoration teams** working in Nusa Penida and the wider Coral Triangle on whether the ranking helps them choose sites.
- **Coverage beyond Asia,** and an alert when a reef's predicted risk rises.


## Limitations

- Training heat metrics in GCBD come from CoRTAD; live inputs come from NOAA CRW. Both measure accumulated heat stress, but they are different products.
- Satellite pixels are 5 km; individual reefs vary within a pixel. When a coastal reef's pixel is masked as land, the nearest ocean pixel within 0.25° is used.
- ReefSense reports "probability of high climate resilience" as 1 − P(bleaching ≥ 10%) under the past 12 weeks of heat stress. It is a near-term resistance estimate, not a long-term projection.
- Labels mix three survey methods; severity-code labels are coarse (banded) values.
- Non-heat conditions come from the reef's own GCBD survey when one exists at its location (every Asian survey site); otherwise they are borrowed from the nearest surveyed reefs.
- The Asian sites are GCBD survey locations, so the model was trained on their past surveys. Their map values are predictions under current heat stress, not a test of the model; see the cross-validated results above for skill.
- "Asia" follows the UN geoscheme (East, Southeast, South and West Asia; see `ASIA_COUNTRIES` in `pipeline/config.py`). Egypt's Sinai reefs are therefore excluded, and the reef-area boxes also take in some neighbouring coasts.
- GCBD records cluster around the 2015–2016 global bleaching event, and end in 2020.
- In Japan the model does not beat heat alone when Japan is held out of training (see stress tests).
- The ranking supports decisions; it does not replace field assessment by restoration teams.
- The reef-area layer is served as image tiles because its license forbids making the data downloadable; the tiles are derived data and are git-ignored. Commercial use needs written permission from UNEP-WCMC.

## Repository layout

```
pipeline/   data download, feasibility check, training, scoring
backend/    FastAPI service (sites, model metrics, ranking)
reefsense/  ReefSense web app (React + TypeScript + Leaflet + Recharts)
frontend/   original React + Leaflet app
data/       raw (git-ignored), processed outputs, demo site list
Dockerfile, fly.toml, DEPLOY.md   deployment (one image: web app + API)
```

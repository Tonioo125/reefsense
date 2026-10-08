# ReefCast

**Near-term coral bleaching outlook and restoration priorities for Indonesian reefs.**

**Live demo:** _(add the service URL after deploying)_

> Status: hackathon build. The model is trained on the Global Coral-Bleaching Database (Nov 2021 SQLite release); results below come from `data/processed/model_metrics_*.json`. The ReefSense web app in `reefsense/` is the main frontend.

## The problem

Indonesia sits at the heart of the Coral Triangle, but its reefs often bleach under heat stress that standard alerts treat as mild: recent work on 8,424 Indonesian reef observations found that about 64% of bleaching occurred below 4 degree heating weeks (DHW), the level at which NOAA's alerts begin to escalate. Restoration teams also have limited budgets and need to know where their effort will last.

## What ReefCast does

1. **Bleaching outlook per reef.** A machine-learning model estimates how likely a reef is to bleach given the past 12 weeks of satellite heat stress plus local conditions such as turbidity, depth and exposure.
2. **Explanations.** Each estimate shows the factors that pushed it up or down, taken directly from the model's feature contributions.
3. **Restoration priorities.** A transparent, adjustable ranking combines near-term bleaching risk with coral cover, long-term climate refugia (50 Reefs+) and larval connectivity. Users set the weights; nothing is hidden in a black box.

Case study: Bali and Nusa Penida.

## How it works

```
NOAA Coral Reef Watch (daily 5 km DHW, SST anomaly)  ─┐
Global Coral-Bleaching Database (labelled surveys)  ──┼─> LightGBM bleaching model ─> site scores ─> FastAPI ─> React + Leaflet
Allen Coral Atlas / MERMAID / 50 Reefs+ (context)   ──┘                                   └─> multi-criteria ranking
```

| Component | Approach |
|---|---|
| Label | Bleaching ≥ 10% of colonies (GCBD survey records; see below) |
| Model | LightGBM classifier, class-balanced |
| Validation | Grouped k-fold by ecoregion (spatial), not a random split |
| Baseline | DHW alone, plus NOAA-style DHW ≥ 4 and ≥ 8 rules |
| Explanations | LightGBM per-feature contributions (SHAP-equivalent) |
| Ranking | Weighted multi-criteria score; missing criteria excluded per site |

Percent bleaching per survey is taken, in order of preference, from the recorded percent of colonies bleached (8,947 surveys), the mean of Reef Check's four population-level transect segments (11,297), or the midpoint of a coarse severity code (2,942). See `pipeline/01b_import_gcbd_sqlite.py`.

### Results

Out-of-fold scores from 5-fold cross-validation grouped by ecoregion (each fold tests on ecoregions the model never saw).

| Model | Training rows | Bleached | ROC AUC | PR AUC | DHW alone, ROC AUC | Indonesia, ROC AUC |
|---|---|---|---|---|---|---|
| Global (served by the API) | 23,186 | 27.8% | **0.754** | 0.563 | 0.677 | 0.715 (n = 937) |
| Coral Triangle | 3,778 | 11.5% | **0.724** | 0.373 | 0.675 | 0.733 (n = 937) |

The NOAA-style rule "DHW ≥ 4" catches only 26% of bleaching events globally (22% in the Coral Triangle), which supports the premise above: most recorded bleaching happens below the heat level at which standard alerts escalate.

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
| [50 Reefs+](https://zenodo.org/records/18729043) climate refugia layer | Ranking criterion and external check | See record |
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

API endpoints: `GET /api/reefs`, `GET /api/reefs/{id}`, `GET /api/reefs/{id}/explanation`, `GET /api/reefs/{id}/heat-history` (daily DHW, 12 weeks), `GET /api/reefs/{id}/survey-history` (past GCBD surveys within 10 km, by year), `GET /api/reefs/{id}/news` (coral stories from Mongabay that name the reef's province or country; about the region, not the specific reef), `GET /api/reefs/{id}/photos` (cached iNaturalist coral photos within 10 km; refreshed weekly by the GitHub Actions data sync, see `pipeline/README.md`), `GET /api/noaa-gap`, `GET /api/bleaching-history` (every observed bleaching survey since 1998, per location and year, for the replay map), `POST /api/predict`, `GET /api/model`, plus the original `GET /api/sites` and `GET /api/ranking`.

Edit `data/sites/demo_sites.csv` to add reefs or fill `coral_cover_pct`, `refugia_50reefs_plus` (0/1), `connectivity` and `in_mpa` (0/1).

## Deploy

One Docker image (`Dockerfile`) serves the web app and the API from the same URL. There are two step-by-step guides:
- [DEPLOY-AZURE.md](DEPLOY-AZURE.md): Azure Container Apps with Azure for Students, no credit card needed.
- [DEPLOY-CLOUD-RUN.md](DEPLOY-CLOUD-RUN.md): Google Cloud Run, free with the Google Cloud trial.
- [DEPLOY.md](DEPLOY.md): Fly.io (`fly.toml`), about $2 a week. It also covers cost and alternatives.

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

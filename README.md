# ReefCast

**Near-term coral bleaching outlook and restoration priorities for Indonesian reefs.**

> Status: hackathon build in progress. Numbers marked `TBD` are filled in from `data/processed/model_metrics.json` once the model is trained on real data.

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
| Label | Bleaching ≥ 10% of colonies (GCBD survey records) |
| Model | LightGBM classifier, class-balanced |
| Validation | Grouped k-fold by ecoregion (spatial), not a random split |
| Baseline | DHW alone, plus NOAA-style DHW ≥ 4 and ≥ 8 rules |
| Explanations | LightGBM per-feature contributions (SHAP-equivalent) |
| Ranking | Weighted multi-criteria score; missing criteria excluded per site |

### Results

| | ROC AUC | PR AUC |
|---|---|---|
| ReefCast model | TBD | TBD |
| Heat stress (DHW) alone | TBD | n/a |
| Indonesia subset | TBD | n/a |

## Data sources

| Dataset | Use | License |
|---|---|---|
| [NOAA Coral Reef Watch v3.1](https://coralreefwatch.noaa.gov/) daily 5 km | Live heat stress, model input | Public domain |
| [Global Coral-Bleaching Database](https://www.bco-dmo.org/dataset/773466) (van Woesik & Kratochwill 2022) | Training labels and features | CC BY 4.0 |
| [Allen Coral Atlas](https://allencoralatlas.org/) | Reef habitat layers | CC BY 4.0 |
| [MERMAID](https://datamermaid.org/) public summaries | Coral cover per site | Per project |
| [50 Reefs+](https://zenodo.org/records/18729043) climate refugia layer | Ranking criterion and external check | See record |

## Run it locally

```bash
# 1. Pipeline (Python 3.11+)
python -m venv .venv && source .venv/bin/activate
pip install -r pipeline/requirements.txt
python pipeline/01_fetch_gcbd.py          # labels
python pipeline/00_check_feasibility.py   # go/no-go on Indonesian label counts
python pipeline/02_fetch_crw.py --days 180
python pipeline/03_train_bleaching.py --region coral_triangle
python pipeline/04_score_sites.py         # writes data/processed/sites_scored.json

# 2. API
pip install -r backend/requirements.txt
cd backend && uvicorn main:app --reload --port 8000

# 3. Frontend (Node 18+)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Edit `data/sites/demo_sites.csv` to add reefs or fill `coral_cover_pct`, `refugia_50reefs_plus` (0/1), `connectivity` and `in_mpa` (0/1).

## Limitations

- Training heat metrics in GCBD come from CoRTAD; live inputs come from NOAA CRW. Both measure accumulated heat stress, but they are different products.
- Satellite pixels are 5 km; individual reefs vary within a pixel. Coastal sites may need nudging offshore to avoid land-masked pixels.
- Non-heat conditions for each site are borrowed from the nearest surveyed reefs.
- GCBD records cluster around the 2015–2016 global bleaching event.
- The ranking supports decisions; it does not replace field assessment by restoration teams.

## Repository layout

```
pipeline/   data download, feasibility check, training, scoring
backend/    FastAPI service (sites, model metrics, ranking)
frontend/   React + Leaflet app
data/       raw (git-ignored), processed outputs, demo site list
```

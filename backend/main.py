"""ReefCast API: serves precomputed site scores, an adjustable restoration-priority ranking,
and the ReefResilience contract (/api/reefs, /api/predict).

uvicorn main:app --reload --port 8000   (run from the backend/ folder)

ReefResilience framing: the model predicts bleaching (>= 10% of colonies) under the past 12 weeks of
satellite heat stress. "Probability of high climate resilience" is reported as 1 - P(bleaching), and
feature contributions are sign-flipped so that positive values raise predicted resilience.
"""
import json
import os
import sys
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = Path(os.getenv("REEFCAST_DATA", ROOT / "data/processed/sites_scored.json"))
sys.path.insert(0, str(ROOT / "pipeline"))

app = FastAPI(title="ReefCast API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("REEFCAST_CORS", "http://localhost:5173").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

CRITERIA = {
    "heat_safety": "Low near-term bleaching risk",
    "coral_cover": "Healthy coral cover today",
    "refugia": "Long-term climate refuge (50 Reefs+)",
    "connectivity": "Larval connectivity to nearby reefs",
}

# NOAA Coral Reef Watch Bleaching Alert Area levels.
ALERT_LABELS = ["No stress", "Watch", "Warning", "Alert level 1", "Alert level 2",
                "Alert level 3", "Alert level 4", "Alert level 5"]
TOP_CONTRIBUTIONS = 6


def load_data():
    if not DATA_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=f"No scored sites at {DATA_PATH}. Run the pipeline (pipeline/04_score_sites.py) first.",
        )
    return json.loads(DATA_PATH.read_text())


@lru_cache(maxsize=1)
def scorer():
    try:
        from inference import Scorer
        return Scorer()
    except (SystemExit, FileNotFoundError) as err:
        raise HTTPException(status_code=503, detail=f"Model not available: {err}")


def criterion_values(site, conn_range):
    values = {}
    if site.get("bleaching_probability") is not None:
        values["heat_safety"] = 1 - site["bleaching_probability"]
    if site.get("coral_cover_pct") is not None:
        values["coral_cover"] = min(site["coral_cover_pct"] / 100, 1.0)
    if site.get("refugia_50reefs_plus") is not None:
        values["refugia"] = 1.0 if site["refugia_50reefs_plus"] else 0.0
    if site.get("connectivity") is not None:
        lo, hi = conn_range
        values["connectivity"] = 0.5 if hi == lo else (site["connectivity"] - lo) / (hi - lo)
    return values


# --- ReefResilience helpers ---------------------------------------------------

def category(resilience):
    if resilience >= 0.66:
        return "High"
    return "Medium" if resilience >= 0.4 else "Low"


def heat_stress_level(dhw):
    """Qualitative accumulated heat stress from peak 12-week DHW (4 DHW = NOAA Alert Level 1).

    Deliberately not NOAA's alert level: that tracks *current* HotSpots and resets to "No stress"
    once water cools, even while 12 weeks of accumulated stress (what the model uses) remain.
    """
    if dhw is None:
        return None
    return "Low" if dhw < 2 else "Moderate" if dhw < 4 else "High"


def resilience_contributions(contributions, limit=None):
    flipped = [{"feature": c["label"], "contribution": round(-c["contribution"], 4)} for c in contributions]
    return flipped[:limit] if limit else flipped


def lower_first(label):
    """Lowercase a label for mid-sentence use without mangling acronyms like DHW."""
    return label[:1].lower() + label[1:]


def insight(resilience, contributions, dhw_max):
    up = next((c for c in contributions if c["contribution"] > 0), None)
    down = next((c for c in contributions if c["contribution"] < 0), None)
    text = (f"Under the past 12 weeks of satellite heat stress (peak {dhw_max:.1f} DHW), the model estimates "
            f"a {resilience:.0%} chance this reef avoids significant bleaching.")
    if up:
        text += f" {up['feature']} contributes most to raising this estimate"
        text += f", while {lower_first(down['feature'])} contributes most to lowering it." if down else "."
    elif down:
        text += f" {down['feature']} contributes most to lowering it."
    return text


def to_reef(site):
    p = site["bleaching_probability"]
    resilience = round(1 - p, 4)
    heat = site["heat"]
    contributions = resilience_contributions(site.get("contributions", []), TOP_CONTRIBUTIONS)
    alert = heat.get("alert_level")
    site_cover = site.get("coral_cover_pct")
    return {
        "id": site["site_id"],
        "name": site["name"],
        "region": site["region"],
        "latitude": site["lat"],
        "longitude": site["lon"],
        "resilienceProbability": resilience,
        "bleachingProbability": p,
        "category": category(resilience),
        "metrics": {
            "seaSurfaceTemp": heat.get("sst_mean_30d"),
            "sstAnomaly": heat.get("ssta_mean_30d"),
            "coralCover": site_cover if site_cover is not None else site.get("survey_coral_cover_pct"),
            "coralCoverSource": "site" if site_cover is not None else "nearby surveys",
            "depth": site.get("depth_m"),
            "dhwNow": heat.get("dhw_now"),
            "dhwMax12w": heat.get("dhw_max_12w"),
            "heatStress": heat_stress_level(heat.get("dhw_max_12w")),
            "alertLevel": None if alert is None else f"NOAA: {ALERT_LABELS[int(alert)].lower()} now",
        },
        "contributions": contributions,
        "insight": insight(resilience, contributions, heat.get("dhw_max_12w") or 0.0),
        "nearestSurveyKm": site.get("nearest_survey_km"),
        "asOf": heat.get("as_of"),
    }


def scored_sites():
    return [s for s in load_data()["sites"] if s.get("bleaching_probability") is not None]


def find_site(reef_id):
    site = next((s for s in scored_sites() if s["site_id"] == reef_id), None)
    if site is None:
        raise HTTPException(status_code=404, detail=f"No scored reef with id {reef_id!r}.")
    return site


# --- Original ReefCast endpoints -----------------------------------------------

@app.get("/api/health")
def health():
    ready = DATA_PATH.exists()
    unscored = [] if not ready else [s["site_id"] for s in load_data()["sites"]
                                     if s.get("bleaching_probability") is None]
    return {"status": "ok", "data_ready": ready, "sites_without_heat_data": unscored}


@app.get("/api/sites")
def sites():
    return load_data()["sites"]


@app.get("/api/model")
def model():
    return {"metrics": load_data().get("model", {}), "criteria": CRITERIA}


@app.get("/api/ranking")
def ranking(
    heat_safety: float = Query(0.45, ge=0),
    coral_cover: float = Query(0.25, ge=0),
    refugia: float = Query(0.20, ge=0),
    connectivity: float = Query(0.10, ge=0),
):
    """Transparent multi-criteria score. Missing criteria are excluded per site and weights renormalised."""
    weights = {"heat_safety": heat_safety, "coral_cover": coral_cover,
               "refugia": refugia, "connectivity": connectivity}
    data = load_data()["sites"]
    conns = [s["connectivity"] for s in data if s.get("connectivity") is not None]
    conn_range = (min(conns), max(conns)) if conns else (0, 0)

    ranked = []
    for site in data:
        values = criterion_values(site, conn_range)
        used = {k: w for k, w in weights.items() if k in values and w > 0}
        total = sum(used.values())
        score = None if total == 0 else round(100 * sum(values[k] * w for k, w in used.items()) / total, 1)
        ranked.append({
            "site_id": site["site_id"], "name": site["name"], "region": site["region"],
            "score": score,
            "components": {k: round(v, 3) for k, v in values.items()},
            "missing": [CRITERIA[k] for k, w in weights.items() if w > 0 and k not in values],
        })
    ranked.sort(key=lambda r: (r["score"] is None, -(r["score"] or 0)))
    return {"weights": weights, "sites": ranked}


# --- ReefResilience endpoints ----------------------------------------------------

@app.get("/api/reefs")
def list_reefs():
    return [to_reef(s) for s in scored_sites()]


@app.get("/api/reefs/{reef_id}")
def get_reef(reef_id: str):
    return to_reef(find_site(reef_id))


@app.get("/api/reefs/{reef_id}/explanation")
def get_explanation(reef_id: str):
    site = find_site(reef_id)
    reef = to_reef(site)
    return {
        "reefId": reef["id"],
        "category": reef["category"],
        "probability": reef["resilienceProbability"],
        "contributions": resilience_contributions(site.get("contributions", [])),
        "units": "log-odds of avoiding bleaching",
        "summary": reef["insight"],
    }


class PredictInput(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    dhwMax12w: float = Field(ge=0, description="Peak Degree Heating Weeks over the past 12 weeks")
    sstAnomaly: float | None = Field(None, description="Mean sea temperature anomaly, last 30 days (°C)")
    depth: float | None = Field(None, ge=0, description="Reef depth (m)")


@app.post("/api/predict")
def predict(body: PredictInput):
    """Score any location under a given heat-stress scenario. Non-heat conditions come from nearby surveys."""
    s = scorer()
    heat = {"dhw_max_12w": body.dhwMax12w, "ssta_mean_30d": body.sstAnomaly}
    row, _, nearest_km = s.feature_row(body.latitude, body.longitude, heat, {"Depth_m": body.depth})
    p, contributions = s.explain(row)
    resilience = round(1 - p, 4)
    return {
        "probability": resilience,
        "bleachingProbability": round(p, 4),
        "category": category(resilience),
        "contributions": resilience_contributions(contributions, TOP_CONTRIBUTIONS),
        "nearestSurveyKm": round(nearest_km, 1),
    }

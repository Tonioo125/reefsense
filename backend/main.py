"""ReefCast API: serves precomputed site scores and an adjustable restoration-priority ranking.

uvicorn main:app --reload --port 8000   (run from the backend/ folder)
"""
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

DATA_PATH = Path(os.getenv("REEFCAST_DATA", Path(__file__).resolve().parents[1] / "data/processed/sites_scored.json"))

app = FastAPI(title="ReefCast API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("REEFCAST_CORS", "http://localhost:5173").split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)

CRITERIA = {
    "heat_safety": "Low near-term bleaching risk",
    "coral_cover": "Healthy coral cover today",
    "refugia": "Long-term climate refuge (50 Reefs+)",
    "connectivity": "Larval connectivity to nearby reefs",
}


def load_data():
    if not DATA_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=f"No scored sites at {DATA_PATH}. Run the pipeline (pipeline/04_score_sites.py) first.",
        )
    return json.loads(DATA_PATH.read_text())


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


@app.get("/api/health")
def health():
    return {"status": "ok", "data_ready": DATA_PATH.exists()}


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

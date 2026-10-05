"""Shared inference: build a reef's feature row and explain the model's prediction.

Used by 04_score_sites.py (batch) and the FastAPI backend (/api/predict), so both score reefs identically.
"""
import joblib
import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

from common import filter_region, load_gcbd, to_json_safe
from config import CRW_OVERRIDES, FEATURE_LABELS, MODEL_PATH

EARTH_RADIUS_KM = 6371.0
NEIGHBOURS = 5
# Reported from nearby surveys for context; not model features.
CONTEXT_COLUMNS = ["Percent_Hard_Coral"]


class Scorer:
    def __init__(self, model_path=MODEL_PATH):
        bundle = joblib.load(model_path)
        self.model, self.features, self.region = bundle["model"], bundle["features"], bundle["region"]
        gcbd = filter_region(load_gcbd(), self.region)
        columns = self.features + [c for c in CONTEXT_COLUMNS if c in gcbd.columns]
        self.survey = gcbd.groupby(["lat", "lon"])[columns].median().reset_index()
        self.tree = BallTree(np.radians(self.survey[["lat", "lon"]].to_numpy()), metric="haversine")

    def feature_row(self, lat, lon, heat=None, overrides=None):
        """Static features from the nearest surveyed reefs, thermal features from live heat stress.

        Returns (row, context, nearest_survey_km).
        """
        dist, idx = self.tree.query(np.radians([[lat, lon]]), k=min(NEIGHBOURS, len(self.survey)))
        neighbours = self.survey.iloc[idx[0]]
        row = {f: neighbours[f].median() for f in self.features}
        context = {c: neighbours[c].median() for c in CONTEXT_COLUMNS if c in neighbours}
        for feat, key in CRW_OVERRIDES.items():
            if feat in row and heat and heat.get(key) is not None:
                row[feat] = heat[key]
        for feat, value in (overrides or {}).items():
            if feat in row and value is not None:
                row[feat] = value
        return row, context, float(dist[0][0] * EARTH_RADIUS_KM)

    def explain(self, row):
        """Bleaching probability plus every feature's log-odds contribution, largest first."""
        X = pd.DataFrame([row])[self.features]
        prob = float(self.model.predict_proba(X)[0, 1])
        contrib = self.model.predict(X, pred_contrib=True)[0][:-1]
        drivers = [
            {"feature": f, "label": FEATURE_LABELS.get(f, f), "value": to_json_safe(row[f]),
             "contribution": round(float(c), 4)}
            for f, c in zip(self.features, contrib)
        ]
        drivers.sort(key=lambda d: -abs(d["contribution"]))
        return prob, drivers

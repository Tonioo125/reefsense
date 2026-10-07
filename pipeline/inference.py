"""Shared inference: build a reef's feature row and explain the model's prediction.

Used by 04_score_sites.py (batch) and the FastAPI backend (/api/predict), so both score reefs identically.
"""
import joblib
import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

from common import filter_region, load_gcbd, to_json_safe
from config import BLEACH_THRESHOLD, CRW_OVERRIDES, FEATURE_LABELS, MODEL_PATH

EARTH_RADIUS_KM = 6371.0
NEIGHBOURS = 5
# A survey this close is the reef's own: its values are used directly, neighbours only fill gaps.
OWN_SURVEY_KM = 0.5
# Coral cover is reported from the latest survey at the reef, or the nearest one within this radius.
COVER_RADIUS_KM = 10.0
# Past bleaching surveys are reported for every surveyed location within this radius.
HISTORY_RADIUS_KM = 10.0


class Scorer:
    def __init__(self, model_path=MODEL_PATH):
        bundle = joblib.load(model_path)
        self.model, self.features, self.region = bundle["model"], bundle["features"], bundle["region"]
        gcbd = filter_region(load_gcbd(), self.region)
        self.survey = gcbd.groupby(["lat", "lon"])[self.features].median().reset_index()
        self.tree = BallTree(np.radians(self.survey[["lat", "lon"]].to_numpy()), metric="haversine")

        # Latest hard coral cover per surveyed location (mean over that year's samples), with its year.
        cover = gcbd.loc[gcbd.get("Hard_Coral_Cover", pd.Series(dtype=float)).notna()
                         & gcbd["year"].notna(), ["lat", "lon", "year", "Hard_Coral_Cover"]]
        cover = cover[cover["year"] == cover.groupby(["lat", "lon"])["year"].transform("max")]
        self.cover = cover.groupby(["lat", "lon", "year"], as_index=False)["Hard_Coral_Cover"].mean()
        self.cover_tree = (BallTree(np.radians(self.cover[["lat", "lon"]].to_numpy()), metric="haversine")
                           if len(self.cover) else None)

        # Every dated survey sample with a bleaching or coral cover record, for a reef's survey history.
        cols = [c for c in ["lat", "lon", "year", "bleach", "label_source", "Data_Source", "Hard_Coral_Cover", "country"]
                if c in gcbd.columns]
        samples = gcbd.loc[gcbd["year"].notna(), cols]
        has_record = samples["bleach"].notna()
        if "Hard_Coral_Cover" in samples:
            has_record |= samples["Hard_Coral_Cover"].notna()
        self.samples = samples[has_record].reset_index(drop=True)
        self.samples_tree = BallTree(np.radians(self.samples[["lat", "lon"]].to_numpy()), metric="haversine")

    def coral_cover(self, lat, lon):
        """Latest surveyed hard coral cover at or near a reef: {pct, year, km}, or None beyond the radius."""
        if self.cover_tree is None:
            return None
        dist, idx = self.cover_tree.query(np.radians([[lat, lon]]), k=1)
        km = float(dist[0][0] * EARTH_RADIUS_KM)
        if km > COVER_RADIUS_KM:
            return None
        hit = self.cover.iloc[idx[0][0]]
        return {"pct": round(float(hit["Hard_Coral_Cover"]), 1), "year": int(hit["year"]), "km": round(km, 1)}

    def survey_history(self, lat, lon, radius_km=HISTORY_RADIUS_KM):
        """Past GCBD surveys within radius_km of a reef, summarised per year (oldest first).

        Bleaching is the percent of colonies bleached, as derived in 01b_import_gcbd_sqlite.py.
        """
        idx, dist = self.samples_tree.query_radius(np.radians([[lat, lon]]), r=radius_km / EARTH_RADIUS_KM,
                                                   return_distance=True)
        near = self.samples.iloc[idx[0]].assign(km=dist[0] * EARTH_RADIUS_KM)
        years = []
        for year, g in near.groupby("year"):
            bleach = g["bleach"].dropna()
            cover = g["Hard_Coral_Cover"].dropna() if "Hard_Coral_Cover" in g else pd.Series(dtype=float)
            years.append({
                "year": int(year),
                "samples": len(g),
                "locations": int(g.groupby(["lat", "lon"]).ngroups),
                "bleachingSamples": len(bleach),
                "meanBleachedPct": round(float(bleach.mean()), 1) if len(bleach) else None,
                "maxBleachedPct": round(float(bleach.max()), 1) if len(bleach) else None,
                "bleachedShare": round(float((bleach >= BLEACH_THRESHOLD).mean()), 3) if len(bleach) else None,
                "coralCoverPct": round(float(cover.mean()), 1) if len(cover) else None,
            })
        source = near["label_source"] if "label_source" in near else pd.Series(dtype=object)
        return {
            "radiusKm": radius_km,
            "nearestKm": round(float(near["km"].min()), 1) if len(near) else None,
            "samples": len(near),
            "locations": int(near.groupby(["lat", "lon"]).ngroups) if len(near) else 0,
            # Bleaching taken from a severity band's midpoint rather than a measured percent.
            "coarseSamples": int((source == "severity_code").sum()),
            "sources": sorted(near["Data_Source"].dropna().unique().tolist()) if "Data_Source" in near else [],
            "thresholdPct": BLEACH_THRESHOLD,
            "years": years,
        }

    def feature_row(self, lat, lon, heat=None, overrides=None):
        """Static features from the reef's own survey (or the nearest surveyed reefs), thermal features
        from live heat stress.

        Returns (row, nearest_survey_km).
        """
        dist, idx = self.tree.query(np.radians([[lat, lon]]), k=min(NEIGHBOURS, len(self.survey)))
        neighbours = self.survey.iloc[idx[0]]
        nearest_km = float(dist[0][0] * EARTH_RADIUS_KM)

        def value(col):
            median = neighbours[col].median()
            if nearest_km <= OWN_SURVEY_KM:
                own = neighbours[col].iloc[0]
                return median if pd.isna(own) else own
            return median

        row = {f: value(f) for f in self.features}
        for feat, key in CRW_OVERRIDES.items():
            if feat in row and heat and heat.get(key) is not None:
                row[feat] = heat[key]
        for feat, override in (overrides or {}).items():
            if feat in row and override is not None:
                row[feat] = override
        return row, nearest_km

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

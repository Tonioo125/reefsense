"""Stress-test the bleaching model beyond the ecoregion cross-validation in 03_train_bleaching.py.

python pipeline/06_validate_model.py   (after 03 and 04; writes data/processed/model_validation.json)

1. Time: train on earlier surveys only, test on later years (incl. "train to 2015, predict the 2016 event").
2. Place: leave a whole country out of training (Indonesia, Japan) and test on it.
3. Confound check: is Cyclone_Frequency standing in for "this is Japan"? Compares the model with and
   without it (spatial CV accuracy, per-country accuracy, and how many NOAA-gap reefs each would flag).

Every comparison is against the same heat-only baseline (Degree Heating Weeks) on the same test rows.
"""
import importlib
import json

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import GroupKFold

from common import load_gcbd, usable_features
from config import BLEACH_THRESHOLD, MODEL_PATH, PROCESSED, SITES_SCORED

PARAMS = importlib.import_module("03_train_bleaching").PARAMS  # same hyperparameters as the served model
OUT = PROCESSED / "model_validation.json"
DHW = "TSA_DHW"
CONFOUND = "Cyclone_Frequency"
# Mirrors backend/main.py: NOAA Alert Level 1 at 4 DHW; "elevated risk" = resilience below the High band.
NOAA_ALERT1_DHW, HIGH_RESILIENCE = 4.0, 0.66


def auc(y, score):
    return round(float(roc_auc_score(y, score)), 3) if len(np.unique(y)) == 2 else None


def compare(y, model_score, dhw):
    """Model vs heat-only baseline on one test set."""
    return {
        "n": int(len(y)),
        "bleached_rate": round(float(np.mean(y)), 3),
        "model_roc_auc": auc(y, model_score),
        "dhw_roc_auc": auc(y, dhw),
        "model_pr_auc": round(float(average_precision_score(y, model_score)), 3) if np.sum(y) else None,
    }


def fit_predict(X_tr, y_tr, X_te):
    return lgb.LGBMClassifier(**PARAMS).fit(X_tr, y_tr).predict_proba(X_te)[:, 1]


def spatial_oof(df, X, y):
    """Out-of-fold predictions grouped by ecoregion, exactly as in 03_train_bleaching.py."""
    cells = df["lat"].round(0).astype(str) + "_" + df["lon"].round(0).astype(str)
    groups = df["group"].astype(str).fillna("cell_" + cells)
    oof = np.zeros(len(df))
    for tr, te in GroupKFold(n_splits=5).split(X, y, groups):
        oof[te] = fit_predict(X.iloc[tr], y.iloc[tr], X.iloc[te])
    return oof


def time_splits(df, X, y):
    out = []
    for train_to, test_from, test_to, label in [
        (2012, 2013, 2020, "Train on surveys to 2012, test on 2013–2020"),
        (2015, 2016, 2016, "Train on surveys to 2015, test on the 2016 global bleaching event"),
    ]:
        tr = df["year"] <= train_to
        te = df["year"].between(test_from, test_to)
        score = fit_predict(X[tr], y[tr], X[te])
        out.append({"split": label, "train_n": int(tr.sum()), **compare(y[te], score, df.loc[te, DHW].fillna(0))})
    return out


def country_holdouts(df, X, y, countries=("Indonesia", "Japan")):
    out = []
    for country in countries:
        te = df["country"].astype(str).str.lower() == country.lower()
        score = fit_predict(X[~te], y[~te], X[te])
        out.append({"country": country, **compare(y[te], score, df.loc[te, DHW].fillna(0))})
    return out


def site_probabilities(features, model):
    """Re-score the mapped reefs with an alternative model, from the same heat and survey inputs as 04."""
    from inference import Scorer

    scorer = Scorer()
    scorer.model, scorer.features = model, features
    sites = json.loads(SITES_SCORED.read_text())["sites"]
    rows = []
    for s in sites:
        if s.get("bleaching_probability") is None:
            continue
        row, _ = scorer.feature_row(s["lat"], s["lon"], s["heat"])
        p = float(model.predict_proba(pd.DataFrame([row])[features])[0, 1])
        rows.append({"site_id": s["site_id"], "country": s["region"].rsplit(", ", 1)[-1],
                     "dhw": s["heat"].get("dhw_max_12w"), "p": p})
    return pd.DataFrame(rows)


def gap_summary(sites, p_col):
    flagged = sites[(sites["dhw"] < NOAA_ALERT1_DHW) & (1 - sites[p_col] < HIGH_RESILIENCE)]
    return {"flagged": int(len(flagged)),
            "by_country": {k: int(v) for k, v in flagged["country"].value_counts().head(6).items()}}


def confound_check(df, X, y, features, oof_full):
    japan = df["country"].astype(str).str.lower() == "japan"
    cyc = df[CONFOUND]
    # How distinctive are Japan's cyclone values? Share of all rows in Japan's value range that are Japanese.
    lo, hi = cyc[japan].quantile([0.1, 0.9])
    in_range = cyc.between(lo, hi)
    reduced = [f for f in features if f != CONFOUND]
    oof_reduced = spatial_oof(df, X[reduced], y)

    full_model = lgb.LGBMClassifier(**PARAMS).fit(X, y)
    contrib = full_model.predict(X, pred_contrib=True)[:, :-1]
    share = np.abs(contrib) / np.abs(contrib).sum(axis=1, keepdims=True)
    cyc_share = share[:, features.index(CONFOUND)]

    reduced_model = lgb.LGBMClassifier(**PARAMS).fit(X[reduced], y)
    sites = site_probabilities(features, full_model).merge(
        site_probabilities(reduced, reduced_model)[["site_id", "p"]], on="site_id", suffixes=("", "_reduced"))

    by_country = {}
    for name, mask in [("Japan", japan), ("Indonesia", df["country"].astype(str).str.lower() == "indonesia"),
                       ("Everywhere else", ~japan)]:
        by_country[name] = {"with_cyclone_roc_auc": auc(y[mask], oof_full[mask]),
                            "without_cyclone_roc_auc": auc(y[mask], oof_reduced[mask])}
    return {
        "japan_rows": int(japan.sum()),
        "japan_cyclone_range_p10_p90": [round(float(lo), 3), round(float(hi), 3)],
        "share_of_rows_in_that_range_that_are_japanese": round(float(japan[in_range].mean()), 3),
        "cyclone_share_of_explanation_japan": round(float(cyc_share[japan].mean()), 3),
        "cyclone_share_of_explanation_elsewhere": round(float(cyc_share[~japan].mean()), 3),
        "spatial_cv_roc_auc_with": auc(y, oof_full),
        "spatial_cv_roc_auc_without": auc(y, oof_reduced),
        "by_country": by_country,
        "noaa_gap_with": gap_summary(sites, "p"),
        "noaa_gap_without": gap_summary(sites, "p_reduced"),
    }


def main():
    df = load_gcbd()
    df = df[df["bleach"].notna() & df["year"].notna()].reset_index(drop=True)
    y = (df["bleach"] >= BLEACH_THRESHOLD).astype(int)
    features = usable_features(df)
    X = df[features]
    print(f"{len(df):,} labelled surveys, {len(features)} features")

    served = joblib.load(MODEL_PATH)
    assert served["features"] == features, "feature set differs from the served model; re-run 03 first"

    oof_full = spatial_oof(df, X, y)
    results = {
        "time_splits": time_splits(df, X, y),
        "country_holdouts": country_holdouts(df, X, y),
        "cyclone_confound": confound_check(df, X, y, features, oof_full),
    }
    OUT.write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()

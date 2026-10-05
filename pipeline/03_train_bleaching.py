"""Train the bleaching classifier and compare it with the DHW threshold baseline.

python pipeline/03_train_bleaching.py --region coral_triangle
Label: bleaching >= 10% of colonies. Validation: GroupKFold by ecoregion (spatial), never a random split.
"""
import argparse
import json

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GroupKFold

from common import filter_region, load_gcbd, usable_features
from config import BLEACH_THRESHOLD, METRICS_PATH, MODEL_PATH

PARAMS = dict(
    n_estimators=400, learning_rate=0.03, num_leaves=31, min_child_samples=30,
    subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
    class_weight="balanced", random_state=42, verbose=-1,
)


def safe_auc(y, score):
    return float(roc_auc_score(y, score)) if len(np.unique(y)) == 2 else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", default="coral_triangle", choices=["coral_triangle", "indo_pacific", "global"])
    args = parser.parse_args()

    df = filter_region(load_gcbd(), args.region)
    df = df[df["bleach"].notna()].reset_index(drop=True)
    y = (df["bleach"] >= BLEACH_THRESHOLD).astype(int)
    features = usable_features(df)
    if not features:
        raise SystemExit("No usable features found; check column names in config.py.")
    X = df[features]

    cells = df["lat"].round(0).astype(str) + "_" + df["lon"].round(0).astype(str)
    if "group" in df and df["group"].nunique() >= 5:
        # Rows without an ecoregion fall back to their 1-degree cell (pandas 3 keeps NaN through astype(str)).
        groups = df["group"].astype(str).fillna("cell_" + cells)
        group_desc = "ecoregion"
    else:
        groups = cells
        group_desc = "1-degree cell"
    n_splits = min(5, groups.nunique())
    print(f"{len(df):,} labelled rows, {y.mean():.1%} bleached, {len(features)} features, "
          f"{n_splits}-fold grouped by {group_desc}")

    oof = np.zeros(len(df))
    for fold, (tr, te) in enumerate(GroupKFold(n_splits=n_splits).split(X, y, groups)):
        model = lgb.LGBMClassifier(**PARAMS).fit(X.iloc[tr], y.iloc[tr])
        oof[te] = model.predict_proba(X.iloc[te])[:, 1]
        print(f"  fold {fold + 1}: AUC {safe_auc(y.iloc[te], oof[te])}")

    dhw_col = next((c for c in ["TSA_DHW", "TSA_DHWMax", "SSTA_DHW"] if c in features), None)
    metrics = {
        "region": args.region,
        "n_rows": int(len(df)),
        "positive_rate": float(y.mean()),
        "features": features,
        "validation": f"GroupKFold ({n_splits} folds) by {group_desc}",
        "model": {"roc_auc": safe_auc(y, oof), "pr_auc": float(average_precision_score(y, oof))},
    }
    if dhw_col:
        dhw = df[dhw_col].fillna(0)
        metrics["baseline_dhw"] = {"feature": dhw_col, "roc_auc": safe_auc(y, dhw)}
        for thr in (4, 8):
            pred = (dhw >= thr).astype(int)
            metrics["baseline_dhw"][f"dhw_ge_{thr}"] = {
                "recall": float(recall_score(y, pred, zero_division=0)),
                "precision": float(precision_score(y, pred, zero_division=0)),
            }
    if "country" in df:
        mask = df["country"].astype(str).str.lower() == "indonesia"
        if mask.sum() >= 30:
            metrics["indonesia_subset"] = {"n_rows": int(mask.sum()), "roc_auc": safe_auc(y[mask], oof[mask])}

    final = lgb.LGBMClassifier(**PARAMS).fit(X, y)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": final, "features": features, "region": args.region}, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()

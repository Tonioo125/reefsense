"""Pre-deploy check: are the files the live site needs present, and does the model load and score?

python backend/check_deploy.py        (also run by the Dockerfile, so a broken image fails to build)

Several of these files are git-ignored (the model, the GCBD survey table, the reef-area tiles), so they
only reach the image from the folder you deploy from. Exits non-zero if anything required is missing.
"""
import sys
import warnings
from importlib.metadata import version

import main
from config import GCBD_RAW, MODEL_PATH, REEF_AREA_TILES

REQUIRED = {
    "scored reefs (pipeline/04_score_sites.py)": main.DATA_PATH,
    "trained model (pipeline/03_train_bleaching.py)": MODEL_PATH,
    "GCBD survey table (pipeline/01b_import_gcbd_sqlite.py)": GCBD_RAW,
    "built web app (npm run build in reefresilience/)": main.WEB_DIST / "index.html",
}
OPTIONAL = {
    "daily heat series for the heat chart (pipeline/02b_fetch_crw_grid.py)": main.HEAT_SERIES_PATH,
    "model stress tests (pipeline/06_validate_model.py)": main.VALIDATION_PATH,
    "reef-area map tiles (pipeline/05_reef_area_tiles.py)": REEF_AREA_TILES,
}
NUSA_PENIDA = {"latitude": -8.7155, "longitude": 115.456, "dhwMax12w": 2.0}


def main_check():
    missing = [f"  {name}: {path}" for name, path in REQUIRED.items() if not path.exists()]
    if missing:
        sys.exit("Missing files the deployed site needs:\n" + "\n".join(missing))
    for name, path in OPTIONAL.items():
        if not path.exists():
            print(f"Note: no {name}; that part of the site will be empty. ({path})")

    print("Versions:", ", ".join(f"{p} {version(p)}" for p in ("lightgbm", "scikit-learn", "pandas", "numpy")))
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        scorer = main.scorer()
    for w in caught:
        if "version" in str(w.message).lower():
            print(f"WARNING: {w.message}\n  Pin these packages in backend/requirements-deploy.txt to the "
                  "versions that trained the model (DEPLOY.md, step 2).")

    reefs = main.scored_sites()
    result = main.predict(main.PredictInput(**NUSA_PENIDA))
    history = main.bleaching_history_payload()
    print(f"OK: {len(reefs):,} scored reefs; model region {scorer.region!r}; "
          f"Nusa Penida at 2 DHW -> resilience {result['probability']:.2f} ({result['category']}); "
          f"{len(history['points']):,} bleaching-history points.")


if __name__ == "__main__":
    main_check()

"""Hour-one go/no-go check: how many usable bleaching labels exist for Indonesia?

Run after 01_fetch_gcbd.py:  python pipeline/00_check_feasibility.py
"""
from common import filter_region, load_gcbd, usable_features
from config import BLEACH_THRESHOLD


def describe(df, title):
    labelled = df[df["bleach"].notna()]
    positives = (labelled["bleach"] >= BLEACH_THRESHOLD).sum()
    print(f"\n== {title} ==")
    print(f"rows: {len(df):,}   labelled rows: {len(labelled):,}")
    if len(labelled):
        print(f"bleached (>= {BLEACH_THRESHOLD:.0f}%): {positives:,} ({positives / len(labelled):.1%})")
        if "year" in labelled:
            print(f"years: {int(labelled['year'].min())}-{int(labelled['year'].max())}")
        print(f"unique locations: {labelled[['lat', 'lon']].drop_duplicates().shape[0]:,}")
    return len(labelled), positives


def main():
    df = load_gcbd()
    print(f"Loaded {len(df):,} rows. Usable features (>=50% filled): {usable_features(df)}")

    describe(filter_region(df, "global"), "Global")
    ct_n, _ = describe(filter_region(df, "coral_triangle"), "Coral Triangle box")

    if "country" not in df:
        print("\nNo country column found; skipping the Indonesia breakdown.")
        return
    indo = df[df["country"].astype(str).str.lower() == "indonesia"]
    n, pos = describe(indo, "Indonesia")
    if "province" in indo and len(indo):
        print("\nTop provinces/islands by labelled rows:")
        print(indo[indo["bleach"].notna()]["province"].value_counts().head(10).to_string())

    print("\n== Decision ==")
    if n >= 300 and 0.05 <= pos / max(n, 1) <= 0.95:
        print("GO: train on the Coral Triangle/Indo-Pacific, evaluate on Indonesia.")
    elif ct_n >= 300:
        print("GO (adjusted): Indonesia labels are thin. Train on the wider region, use Indonesia as a "
              "test set, and lean on the DHW forecast as the headline ML component.")
    else:
        print("CAUTION: too few labels in the region. Train globally and be explicit about it in the README.")


if __name__ == "__main__":
    main()

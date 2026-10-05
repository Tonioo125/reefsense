"""Flatten the relational GCBD SQLite release into data/raw/gcbd.csv (alternative to 01_fetch_gcbd.py).

python pipeline/01b_import_gcbd_sqlite.py [--db path/to/Global_Coral_Bleaching_Database_SQLite.db]

One output row per survey sample (Sample_Event_tbl), joined to its site, environment and bleaching
records. Percent bleaching is taken, in order of preference, from:
  1. Percent_Bleached (direct percent of colonies bleached)
  2. Reef Check population-level segments: mean of S1-S4 (percent of the coral population bleached).
     Colony-level segments describe how bleached a colony is, not how many colonies, so are not used.
  3. Severity_Code, mapped to the midpoint of its band (coarse; recorded in label_source).
"""
import argparse
import sqlite3

import pandas as pd

from config import GCBD_RAW, RAW

SEVERITY_MIDPOINT = {0: 0.0, 1: 5.0, 2: 30.0, 3: 75.0}  # -1 ("% unknown") -> missing
POPULATION_LEVEL = 1

SITE_SQL = """
SELECT s.Site_ID, d.Data_Source, s.Latitude_Degrees, s.Longitude_Degrees,
       o.Ocean_Name, r.Realm_Name, e.Ecoregion_Name, c.Country_Name, p.State_Island_Province_Name,
       s.Site_Name, s.Distance_to_Shore, x.Exposure, s.Turbidity, s.Cyclone_Frequency
FROM Site_Info_tbl s
LEFT JOIN Data_Source_LUT d ON d.Data_Source_ID = s.Data_Source
LEFT JOIN Ocean_Name_LUT o ON o.Ocean_ID = s.Ocean_Name
LEFT JOIN Realm_Name_LUT r ON r.Realm_ID = s.Realm_Name
LEFT JOIN Ecoregion_Name_LUT e ON e.Ecoregion_ID = s.Ecoregion_Name
LEFT JOIN Country_Name_LUT c ON c.Country_ID = s.Country_Name
LEFT JOIN State_Island_Province_Name_LUT p ON p.State_Island_Province_ID = s.State_Island_Province_Name
LEFT JOIN Exposure_LUT x ON x.Exposure_ID = s.Exposure
"""


def find_db():
    found = sorted(p for ext in ("*.db", "*.sqlite", "*.sqlite3") for p in RAW.glob(ext))
    if not found:
        raise SystemExit(f"No .db/.sqlite file in {RAW}. Pass --db explicitly.")
    return found[0]


def bleaching_per_sample(con):
    b = pd.read_sql("SELECT Sample_ID, Bleaching_Level, S1, S2, S3, S4, Percent_Bleached, "
                    "Percent_Bleaching_Old_Method, Severity_Code FROM Bleaching_tbl", con)
    for col in ["S1", "S2", "S3", "S4", "Percent_Bleached", "Percent_Bleaching_Old_Method", "Severity_Code"]:
        b[col] = pd.to_numeric(b[col], errors="coerce")

    direct = b["Percent_Bleached"].fillna(b["Percent_Bleaching_Old_Method"])
    segments = b[["S1", "S2", "S3", "S4"]].mean(axis=1)
    segments = segments.where(b["Bleaching_Level"] == POPULATION_LEVEL)
    severity = b["Severity_Code"].map(SEVERITY_MIDPOINT)

    out = pd.DataFrame({"Sample_ID": b["Sample_ID"], "direct": direct,
                        "segments": segments, "severity": severity})
    per = out.groupby("Sample_ID")[["direct", "segments", "severity"]].mean()
    per["Percent_Bleaching"] = per["direct"].fillna(per["segments"]).fillna(per["severity"])
    per["label_source"] = (per["direct"].notna().map({True: "percent", False: None})
                           .fillna(per["segments"].notna().map({True: "reef_check_population", False: None}))
                           .fillna(per["severity"].notna().map({True: "severity_code", False: None})))
    return per[["Percent_Bleaching", "label_source"]].reset_index()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=None)
    args = parser.parse_args()
    db = args.db or find_db()
    print(f"Reading {db}")
    con = sqlite3.connect(db)

    sites = pd.read_sql(SITE_SQL, con)
    samples = pd.read_sql("SELECT Sample_ID, Site_ID, Date_Day, Date_Month, Date_Year, Depth_m "
                          "FROM Sample_Event_tbl", con)
    env = pd.read_sql("SELECT * FROM Environmental_tbl", con).drop(columns=["Environmental_ID", "TRIAL501"])
    env = env.apply(pd.to_numeric, errors="coerce").groupby("Sample_ID").mean().reset_index()
    cover = pd.read_sql("SELECT Sample_ID, Percent_Hard_Coral, Percent_Macroalgae FROM Cover_tbl", con)
    cover = cover.apply(pd.to_numeric, errors="coerce").groupby("Sample_ID").mean().reset_index()
    bleach = bleaching_per_sample(con)

    df = (samples.merge(sites, on="Site_ID", how="left")
                 .merge(env, on="Sample_ID", how="left")
                 .merge(cover, on="Sample_ID", how="left")
                 .merge(bleach, on="Sample_ID", how="left"))

    GCBD_RAW.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(GCBD_RAW, index=False)

    labelled = df["Percent_Bleaching"].notna()
    print(f"Saved {len(df):,} samples x {df.shape[1]} columns to {GCBD_RAW}")
    print(f"Labelled samples: {labelled.sum():,}")
    print(df.loc[labelled, "label_source"].value_counts().to_string())


if __name__ == "__main__":
    main()

"""Central configuration for the ReefCast data and model pipeline."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
SITES_DIR = ROOT / "data" / "sites"

# --- Sources -------------------------------------------------------------
# Global Coral-Bleaching Database (van Woesik & Kratochwill 2022), BCO-DMO dataset 773466, CC-BY-4.0.
# The ERDDAP copy may be a subset; if so, download the full CSV from https://www.bco-dmo.org/dataset/773466
GCBD_ERDDAP_CSV = "https://erddap.bco-dmo.org/erddap/tabledap/bcodmo_dataset_773466.csv"
GCBD_RAW = RAW / "gcbd.csv"

# NOAA Coral Reef Watch v3.1 daily 5 km (1985-present) via ERDDAP griddap
CRW_ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW"
CRW_VARIABLES = ["CRW_DHW", "CRW_SSTANOMALY", "CRW_BAA", "CRW_SST"]

# --- Files produced by the pipeline -------------------------------------
SITES_CSV = SITES_DIR / "demo_sites.csv"
CRW_TIMESERIES = PROCESSED / "crw_timeseries.csv"
MODEL_PATH = PROCESSED / "bleaching_model.joblib"
METRICS_PATH = PROCESSED / "model_metrics.json"
SITES_SCORED = PROCESSED / "sites_scored.json"

# --- Modelling choices ---------------------------------------------------
BLEACH_THRESHOLD = 10.0  # % of colonies bleached -> label 1 (same convention as CRESI-Mamba, 2026)

REGIONS = {
    "coral_triangle": dict(lat_min=-15, lat_max=10, lon_min=90, lon_max=160),
    "indo_pacific": dict(lat_min=-35, lat_max=35, lon_min=30, lon_max=-120),  # wraps the antimeridian
    "global": None,
}

# GCBD column names differ slightly between the ERDDAP and file versions, so we try candidates.
COLUMN_CANDIDATES = {
    "country": ["Country_Name", "country_name"],
    "lat": ["Latitude_Degrees", "latitude", "Latitude"],
    "lon": ["Longitude_Degrees", "longitude", "Longitude"],
    "bleach": ["Percent_Bleaching", "Average_Bleaching", "percent_bleaching"],
    "year": ["Date_Year", "date_year"],
    "site": ["Site_ID", "site_id"],
    "group": ["Ecoregion_Name", "ecoregion_name", "Realm_Name"],
    "province": ["State_Island_Province_Name", "state_island_province_name"],
}

# Candidate predictors present in GCBD. Only those with >=50% coverage are used.
FEATURE_CANDIDATES = [
    "TSA_DHW", "TSA_DHWMax", "TSA_DHWMean", "SSTA", "SSTA_DHW", "TSA",
    "SSTA_Frequency", "TSA_Frequency", "ClimSST", "Temperature_Mean",
    "Turbidity", "Depth_m", "Distance_to_Shore", "Exposure",
    "Cyclone_Frequency", "Windspeed",
]
KELVIN_COLUMNS = ["ClimSST", "Temperature_Kelvin", "Temperature_Mean",
                  "Temperature_Minimum", "Temperature_Maximum"]

# At inference time these model features are filled from live NOAA CRW data;
# everything else comes from the nearest GCBD survey sites.
# NOTE: GCBD thermal metrics come from CoRTAD, not CRW. Same concept, different product -> documented limitation.
CRW_OVERRIDES = {
    "TSA_DHW": "dhw_max_12w",
    "TSA_DHWMax": "dhw_max_12w",
    "SSTA_DHW": "dhw_max_12w",
    "SSTA": "ssta_mean_30d",
}

FEATURE_LABELS = {
    "TSA_DHW": "Accumulated heat stress (DHW)",
    "TSA_DHWMax": "Peak accumulated heat stress",
    "TSA_DHWMean": "Typical accumulated heat stress",
    "SSTA": "Sea temperature anomaly",
    "SSTA_DHW": "Accumulated temperature anomaly",
    "TSA": "Heat above the bleaching threshold",
    "SSTA_Frequency": "How often the sea runs hot",
    "TSA_Frequency": "How often heat stress occurs",
    "ClimSST": "Long-term average sea temperature",
    "Temperature_Mean": "Mean sea temperature",
    "Turbidity": "Water clarity (turbidity)",
    "Depth_m": "Reef depth",
    "Distance_to_Shore": "Distance to shore",
    "Exposure": "Wave exposure",
    "Cyclone_Frequency": "Cyclone frequency",
    "Windspeed": "Wind speed",
}

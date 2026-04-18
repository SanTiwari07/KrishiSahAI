"""
config.py — Central configuration for the Vegetation Index Engine
==================================================================
All GEE settings, spatial parameters, index band mappings, CVI weights,
confidence scoring, and interpretation thresholds are stored here.

Modify this file to tune the engine — no changes to core logic needed.
"""
import os

# ─────────────────────────────────────────────────────────────────────────────
# Google Earth Engine
# ─────────────────────────────────────────────────────────────────────────────
GEE_PROJECT_ID = os.getenv("GEE_PROJECT_ID", "gee-agriculture-492004")

# Sentinel-2 Surface Reflectance (NOT TOA)
DATASET = "COPERNICUS/S2_SR_HARMONIZED"

# ─────────────────────────────────────────────────────────────────────────────
# Spatial Parameters
# ─────────────────────────────────────────────────────────────────────────────
# Outer buffer around point of interest (metres)
BUFFER_M = 250

# Inward shrink before reduction — removes mixed edge pixels
INWARD_BUFFER_M = 10

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Filtering
# ─────────────────────────────────────────────────────────────────────────────
# Image-level cloud cover filter (strict — keeps only clear scenes)
MAX_CLOUD_COVER_PCT = 10

# SCL band values to mask (per-pixel cloud/shadow removal)
# 3=Cloud Shadow, 8=Medium Cloud, 9=High Cloud, 10=Cirrus
SCL_MASK_VALUES = [3, 8, 9, 10]

# ─────────────────────────────────────────────────────────────────────────────
# Temporal Compositing
# ─────────────────────────────────────────────────────────────────────────────
# Window size in days for sliding-window time-series composites
TEMPORAL_WINDOW_DAYS = 15

# ─────────────────────────────────────────────────────────────────────────────
# Sentinel-2 Band Aliases
# ─────────────────────────────────────────────────────────────────────────────
BANDS = {
    "BLUE":  "B2",   # ~490 nm
    "GREEN": "B3",   # ~560 nm
    "RED":   "B4",   # ~665 nm
    "NIR":   "B8",   # ~842 nm  (10 m)
    "SWIR":  "B11",  # ~1610 nm (20 m — resampled by GEE on-the-fly)
    "SCL":   "SCL",  # Scene Classification Layer
}

# ─────────────────────────────────────────────────────────────────────────────
# Composite Vegetation Index (CVI) Weights
# ─────────────────────────────────────────────────────────────────────────────
# Weights must sum to 1.0
# Adjust here for dynamic weighting in future upgrades
CVI_WEIGHTS = {
    "NDVI":  0.35,   # Normalised Difference Vegetation Index  (primary signal)
    "EVI":   0.25,   # Enhanced Vegetation Index               (atmospheric + saturation fix)
    "SAVI":  0.15,   # Soil-Adjusted Vegetation Index          (soil background fix)
    "NDMI":  0.15,   # Normalised Difference Moisture Index    (moisture intelligence)
    "GNDVI": 0.10,   # Green NDVI                              (nutrient sensitivity)
}

# ─────────────────────────────────────────────────────────────────────────────
# CVI Interpretation Thresholds
# ─────────────────────────────────────────────────────────────────────────────
CVI_THRESHOLDS = {
    0.7:  "🌿 Excellent vegetation",
    0.5:  "🌱 Moderate vegetation",
    0.3:  "🌾 Weak vegetation",
    -1.0: "🏜️  Poor / no vegetation",
}

# ─────────────────────────────────────────────────────────────────────────────
# Individual Index Interpretation Thresholds
# ─────────────────────────────────────────────────────────────────────────────
NDVI_THRESHOLDS = {
    0.6:  "Dense, healthy vegetation",
    0.4:  "Moderate vegetation",
    0.2:  "Sparse / stressed vegetation",
    0.0:  "Bare soil",
    -1.0: "Water / non-vegetated",
}
EVI_THRESHOLDS = {
    0.5:  "Dense vegetation",
    0.3:  "Moderate vegetation",
    0.1:  "Sparse vegetation",
    -1.0: "Bare / non-vegetated",
}
SAVI_THRESHOLDS = {
    0.5:  "High vegetation + low soil effect",
    0.3:  "Moderate vegetation",
    0.1:  "Low vegetation",
    -1.0: "Bare soil dominant",
}
NDMI_THRESHOLDS = {
    0.4:  "High moisture",
    0.2:  "Moderate moisture",
    0.0:  "Low moisture",
    -1.0: "Dry / drought stress",
}
NDWI_THRESHOLDS = {
    0.3:  "High water presence",
    0.0:  "Water likely present",
    -1.0: "No significant water",
}
GNDVI_THRESHOLDS = {
    0.6:  "Excellent chlorophyll / nutrient status",
    0.4:  "Good chlorophyll",
    0.2:  "Moderate",
    -1.0: "Low chlorophyll",
}

# ─────────────────────────────────────────────────────────────────────────────
# Confidence Score Parameters
# ─────────────────────────────────────────────────────────────────────────────
# Number of scenes for full scene-availability score
CONFIDENCE_SCENE_TARGET = 5

# CVI std-dev above which spatial consistency score drops to 0
CONFIDENCE_STD_MAX = 0.3

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
LOG_LEVEL  = "INFO"
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
LOG_DATE   = "%Y-%m-%d %H:%M:%S"
LOG_FILE   = "ndvi_pipeline.log"

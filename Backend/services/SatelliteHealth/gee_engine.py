"""
gee_engine.py — Production-Grade Vegetation Index Engine
=========================================================
Core computation module for the Satellite Agronomy Intelligence Platform.

Architecture (call order):
    initialize_gee()
        └─ build_composite()
              ├─ mask_clouds_scl()     (per-image cloud/shadow masking)
              └─ [scale + median]
                    └─ compute_vegetation_indices()
                          └─ compute_cvi()
                                ├─ extract_statistics()
                                └─ compute_confidence()
                                      └─ run_vegetation_engine()  ◄─ public API

Optional:
    generate_time_series()             (sliding-window CVI over a date range)

All heavy GEE computation is lazy (server-side) until .getInfo() is called.
"""

import logging
import os
import ee

from config import (
    BANDS,
    BUFFER_M,
    CONFIDENCE_SCENE_TARGET,
    CONFIDENCE_STD_MAX,
    CVI_WEIGHTS,
    CVI_THRESHOLDS,
    DATASET,
    GEE_PROJECT_ID,
    INWARD_BUFFER_M,
    MAX_CLOUD_COVER_PCT,
    NDVI_THRESHOLDS,
    EVI_THRESHOLDS,
    SAVI_THRESHOLDS,
    NDMI_THRESHOLDS,
    NDWI_THRESHOLDS,
    GNDVI_THRESHOLDS,
    SCL_MASK_VALUES,
    TEMPORAL_WINDOW_DAYS,
)

logger = logging.getLogger(__name__)


# ═════════════════════════════════════════════════════════════════════════════
# 1. GEE INITIALISATION
# ═════════════════════════════════════════════════════════════════════════════

def initialize_gee() -> bool:
    """
    Authenticate and initialise the Google Earth Engine Python API.

    Returns:
        bool: True on success, False on failure.
    """
    if not GEE_PROJECT_ID:
        logger.error("GEE initialization failed: GEE_PROJECT_ID is empty.")
        return False

    cred_path = os.path.expanduser("~/.config/earthengine/credentials")
    try:
        logger.info("Initializing Google Earth Engine (project: %s)…", GEE_PROJECT_ID)

        # Prefer non-interactive startup for server environments.
        ee.Initialize(project=GEE_PROJECT_ID)
        _ = ee.Number(1).getInfo()
        logger.info("GEE initialized successfully using existing credentials.")
        return True
    except Exception as first_exc:
        if not os.path.exists(cred_path):
            logger.error(
                "GEE initialization failed: no credentials found at %s. "
                "Run `earthengine authenticate` in backend venv.",
                cred_path,
            )
            logger.error("GEE initialization error details: %s", first_exc)
            return False

        # Credentials exist but initialization failed (usually IAM/project issue).
        logger.error(
            "GEE initialization failed with existing credentials. "
            "Likely project IAM/Service Usage permission issue for project '%s'. "
            "Ensure this account has `roles/serviceusage.serviceUsageConsumer` "
            "and Earth Engine access.",
            GEE_PROJECT_ID,
        )
        logger.error("GEE initialization error details: %s", first_exc)
        return False


# ═════════════════════════════════════════════════════════════════════════════
# 2. CLOUD + SHADOW MASKING (SCL BAND)
# ═════════════════════════════════════════════════════════════════════════════

def mask_clouds_scl(image: ee.Image) -> ee.Image:
    """
    Per-pixel cloud and cloud-shadow masking using Sentinel-2 SCL band.

    SCL classes removed:
        3  → Cloud Shadow
        8  → Medium Cloud
        9  → High Cloud
        10 → Cirrus

    Args:
        image: Raw Sentinel-2 SR ee.Image with SCL band.

    Returns:
        ee.Image with cloudy/shadowed pixels masked out.
    """
    scl = image.select(BANDS["SCL"])

    # Start with a "keep everything" mask, then remove bad classes
    mask = ee.Image.constant(1)
    for bad_class in SCL_MASK_VALUES:
        mask = mask.And(scl.neq(bad_class))

    # updateMask preserves the original band stack, just hides invalid pixels
    return image.updateMask(mask)


# ═════════════════════════════════════════════════════════════════════════════
# 3. MEDIAN COMPOSITE BUILDER
# ═════════════════════════════════════════════════════════════════════════════

def build_composite(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    cloud_pct: int = MAX_CLOUD_COVER_PCT,
) -> tuple[ee.Image | None, ee.ImageCollection | None, ee.Geometry, int]:
    """
    Fetch a Sentinel-2 cloud-free median composite for a buffered point.

    Pipeline:
        1. Create 250 m buffer around the point → bounding box region
        2. Filter S2 collection by region, date, CLOUDY_PIXEL_PERCENTAGE
        3. Apply per-pixel SCL mask to every image
        4. Scale reflectance: DN ÷ 10000 → real reflectance [0, 1]
        5. Reduce to median composite (robust against residual noise)

    Args:
        lat        : Latitude (decimal degrees, WGS-84)
        lon        : Longitude (decimal degrees, WGS-84)
        start_date : ISO date string, e.g. "2024-01-01"
        end_date   : ISO date string, e.g. "2024-01-31"
        cloud_pct  : Maximum allowed CLOUDY_PIXEL_PERCENTAGE per image

    Returns:
        Tuple of (composite_image, raw_collection, region_geometry, scene_count)
        composite_image is None if no clean scenes are found.
    """
    # ── Region of interest ─────────────────────────────────────────────────
    point  = ee.Geometry.Point([lon, lat])
    region = point.buffer(BUFFER_M).bounds()   # square bounding box

    logger.info(
        "Building composite | lat=%.6f lon=%.6f | %s → %s | cloud<=%d%%",
        lat, lon, start_date, end_date, cloud_pct,
    )

    # ── Collection filter ──────────────────────────────────────────────────
    collection = (
        ee.ImageCollection(DATASET)
        .filterBounds(region)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_pct))
        .map(mask_clouds_scl)                         # per-pixel SCL masking
        .map(lambda img: img.divide(10000))           # scale to [0, 1]
    )

    scene_count: int = collection.size().getInfo()
    logger.info("Scenes after filtering: %d", scene_count)

    if scene_count == 0:
        logger.warning(
            "No clean Sentinel-2 scenes found. "
            "Try widening the date range or increasing cloud_pct threshold."
        )
        return None, None, region, 0

    # Median composite → reduces shadows, noise, and residual clouds
    composite = collection.median()
    logger.info("Median composite built from %d scene(s).", scene_count)

    return composite, collection, region, scene_count


# ═════════════════════════════════════════════════════════════════════════════
# 4. VEGETATION INDEX ENGINE
# ═════════════════════════════════════════════════════════════════════════════

def compute_vegetation_indices(image: ee.Image) -> ee.Image:
    """
    Compute six vegetation indices and attach them as new bands.

    Formulae (applied to scaled reflectance — values in [0, 1]):
        NDVI  = (NIR - RED) / (NIR + RED)
        EVI   = 2.5 * (NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1)
        SAVI  = ((NIR - RED) / (NIR + RED + 0.5)) * 1.5
        NDMI  = (NIR - SWIR) / (NIR + SWIR)
        NDWI  = (GREEN - NIR) / (GREEN + NIR)
        GNDVI = (NIR - GREEN) / (NIR + GREEN)

    Args:
        image: Scaled Sentinel-2 composite (bands in real reflectance).

    Returns:
        ee.Image with original bands + 6 index bands appended.
    """
    B   = BANDS["BLUE"]
    G   = BANDS["GREEN"]
    R   = BANDS["RED"]
    NIR = BANDS["NIR"]
    SW  = BANDS["SWIR"]

    # ── NDVI ──────────────────────────────────────────────────────────────
    ndvi = image.normalizedDifference([NIR, R]).rename("NDVI")

    # ── EVI (with atmospheric correction + anti-saturation) ───────────────
    evi = (
        image.expression(
            "2.5 * (NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0)",
            {
                "NIR":  image.select(NIR),
                "RED":  image.select(R),
                "BLUE": image.select(B),
            },
        )
        .rename("EVI")
    )

    # ── SAVI (soil-adjusted) ───────────────────────────────────────────────
    savi = (
        image.expression(
            "((NIR - RED) / (NIR + RED + 0.5)) * 1.5",
            {
                "NIR": image.select(NIR),
                "RED": image.select(R),
            },
        )
        .rename("SAVI")
    )

    # ── NDMI (moisture) ────────────────────────────────────────────────────
    ndmi = image.normalizedDifference([NIR, SW]).rename("NDMI")

    # ── NDWI (water) ───────────────────────────────────────────────────────
    ndwi = image.normalizedDifference([G, NIR]).rename("NDWI")

    # ── GNDVI (green channel — chlorophyll/nutrients) ─────────────────────
    gndvi = image.normalizedDifference([NIR, G]).rename("GNDVI")

    logger.info("Vegetation indices computed: NDVI, EVI, SAVI, NDMI, NDWI, GNDVI")
    return image.addBands([ndvi, evi, savi, ndmi, ndwi, gndvi])


# ═════════════════════════════════════════════════════════════════════════════
# 5. COMPOSITE VEGETATION INDEX (CVI)
# ═════════════════════════════════════════════════════════════════════════════

def compute_cvi(image: ee.Image) -> ee.Image:
    """
    Fuse multiple vegetation indices into a single Composite Vegetation Index.

    CVI = 0.35×NDVI + 0.25×EVI + 0.15×SAVI + 0.15×NDMI + 0.10×GNDVI

    Design rationale:
        - NDVI alone saturates above LAI ≈ 3 and is biased by atmosphere.
        - EVI corrects atmospheric + canopy saturation errors.
        - SAVI removes soil brightness bias in low-vegetation areas.
        - NDMI injects moisture intelligence (drought detection).
        - GNDVI is more sensitive to chlorophyll (crop health signal).

    Weights are configurable via CVI_WEIGHTS in config.py.

    Args:
        image: ee.Image already containing NDVI, EVI, SAVI, NDMI, GNDVI bands.

    Returns:
        ee.Image with an additional "CVI" band.
    """
    w = CVI_WEIGHTS

    cvi = (
        image.select("NDVI").multiply(w["NDVI"])
        .add(image.select("EVI").multiply(w["EVI"]))
        .add(image.select("SAVI").multiply(w["SAVI"]))
        .add(image.select("NDMI").multiply(w["NDMI"]))
        .add(image.select("GNDVI").multiply(w["GNDVI"]))
        .rename("CVI")
    )

    logger.info(
        "CVI computed with weights: %s",
        " | ".join(f"{k}={v}" for k, v in w.items()),
    )
    return image.addBands(cvi)


# ═════════════════════════════════════════════════════════════════════════════
# 6. STATISTICAL FEATURE EXTRACTION
# ═════════════════════════════════════════════════════════════════════════════

def extract_statistics(
    image: ee.Image,
    region: ee.Geometry,
    band: str = "CVI",
    scale: int = 10,
) -> dict:
    """
    Extract spatial statistics for a single band over the region of interest.

    Applies an inward buffer (INWARD_BUFFER_M) before sampling to avoid
    mixed pixels at the edge of the buffered area.

    Statistics computed:
        mean, median, std, p25, p75

    Args:
        image  : ee.Image with the target band.
        region : The geometry to sample over.
        band   : Band name to analyse (default "CVI").
        scale  : Spatial resolution in metres (default 10 for Sentinel-2).

    Returns:
        dict with keys: mean, median, std, p25, p75  (floats or None)
    """
    # Shrink region inward to avoid edge mixed-pixels
    inner_region = region.buffer(-INWARD_BUFFER_M)
    img_band     = image.select(band)

    common_args = {
        "geometry":  inner_region,
        "scale":     scale,
        "maxPixels": 1e9,
    }

    try:
        # ── Mean ────────────────────────────────────────────────────────────
        mean_val = (
            img_band
            .reduceRegion(reducer=ee.Reducer.mean(), **common_args)
            .getInfo()
            .get(band)
        )

        # ── Median ──────────────────────────────────────────────────────────
        median_val = (
            img_band
            .reduceRegion(reducer=ee.Reducer.median(), **common_args)
            .getInfo()
            .get(band)
        )

        # ── Standard Deviation ──────────────────────────────────────────────
        std_val = (
            img_band
            .reduceRegion(reducer=ee.Reducer.stdDev(), **common_args)
            .getInfo()
            .get(band)
        )

        # ── Percentiles ─────────────────────────────────────────────────────
        pct_result = (
            img_band
            .reduceRegion(reducer=ee.Reducer.percentile([25, 75]), **common_args)
            .getInfo()
        )
        p25 = pct_result.get(f"{band}_p25")
        p75 = pct_result.get(f"{band}_p75")

        stats = {
            "mean":   round(mean_val,   4) if mean_val   is not None else None,
            "median": round(median_val, 4) if median_val is not None else None,
            "std":    round(std_val,    4) if std_val    is not None else None,
            "p25":    round(p25,        4) if p25        is not None else None,
            "p75":    round(p75,        4) if p75        is not None else None,
        }

        logger.info(
            "%s stats — mean=%.4f  median=%.4f  std=%.4f  p25=%.4f  p75=%.4f",
            band,
            stats["mean"]   or 0,
            stats["median"] or 0,
            stats["std"]    or 0,
            stats["p25"]    or 0,
            stats["p75"]    or 0,
        )
        return stats

    except Exception as exc:
        logger.error("Failed to extract stats for band '%s': %s", band, exc)
        return {"mean": None, "median": None, "std": None, "p25": None, "p75": None}


# ═════════════════════════════════════════════════════════════════════════════
# 7. CONFIDENCE SCORE
# ═════════════════════════════════════════════════════════════════════════════

def compute_confidence(
    scene_count: int,
    avg_cloud_pct: float,
    cvi_stats: dict,
) -> float:
    """
    Compute a composite confidence score (0–1) for the vegetation analysis.

    Confidence is a weighted average of three factors:
        1. Scene availability  (0.50 weight)
           → How many clean scenes contributed to the composite?
             Saturates at CONFIDENCE_SCENE_TARGET (config).

        2. Cloud quality       (0.30 weight)
           → Lower cloud cover → higher confidence.

        3. Spatial consistency (0.20 weight)
           → Low CVI std-dev → uniform vegetation → reliable signal.
             Saturates at CONFIDENCE_STD_MAX (config).

    Args:
        scene_count   : Number of scenes used for compositing.
        avg_cloud_pct : Mean CLOUDY_PIXEL_PERCENTAGE across the collection.
        cvi_stats     : Dict from extract_statistics() for the CVI band.

    Returns:
        float: Confidence score in [0.0, 1.0], rounded to 4 decimals.
    """
    # ── Factor 1: Scene availability ────────────────────────────────────────
    scene_score = min(scene_count / CONFIDENCE_SCENE_TARGET, 1.0)

    # ── Factor 2: Cloud quality (invert cloud pct) ───────────────────────────
    cloud_score = max(0.0, 1.0 - avg_cloud_pct / 100.0)

    # ── Factor 3: Spatial consistency (lower std = more consistent) ──────────
    cvi_std = cvi_stats.get("std") or 0.0
    std_score = max(0.0, 1.0 - cvi_std / CONFIDENCE_STD_MAX)

    # ── Weighted combination ─────────────────────────────────────────────────
    confidence = (
        0.50 * scene_score
        + 0.30 * cloud_score
        + 0.20 * std_score
    )

    confidence = round(min(max(confidence, 0.0), 1.0), 4)
    logger.info(
        "Confidence: %.4f  [scene=%.3f, cloud=%.3f, spatial=%.3f]",
        confidence, scene_score, cloud_score, std_score,
    )
    return confidence


# ═════════════════════════════════════════════════════════════════════════════
# 8. INTERPRETATION HELPER
# ═════════════════════════════════════════════════════════════════════════════

def interpret_value(value: float | None, thresholds: dict) -> str:
    """
    Map a numeric index value to a human-readable description.

    The threshold dict is keyed by the lower bound of each bracket.
    Keys are evaluated largest-first; the first matching key is returned.
    """
    if value is None:
        return "N/A — data unavailable"
    for threshold in sorted(thresholds.keys(), reverse=True):
        if value >= threshold:
            return thresholds[threshold]
    return "Unknown"


# ═════════════════════════════════════════════════════════════════════════════
# 9. OPTIONAL — CVI TIME SERIES
# ═════════════════════════════════════════════════════════════════════════════

def generate_time_series(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    window_days: int = TEMPORAL_WINDOW_DAYS,
) -> list[dict]:
    """
    Generate a CVI time series using a sliding temporal window.

    For each window, a composite is built, indices computed, CVI extracted,
    and the mean CVI value returned with its window midpoint date.

    A 3-point centred moving average is applied for smoothing.

    Args:
        lat         : Latitude (decimal degrees)
        lon         : Longitude (decimal degrees)
        start_date  : ISO date for the beginning of the analysis period
        end_date    : ISO date for the end of the analysis period
        window_days : Width of each compositing window in days

    Returns:
        list[dict]: Each entry has:
            - "date"       : ISO date of window midpoint
            - "cvi_mean"   : Mean CVI over the region (or None)
            - "cvi_smooth" : 3-point moving average of cvi_mean
    """
    import datetime

    logger.info(
        "Generating CVI time series | %s → %s | window=%d days",
        start_date, end_date, window_days,
    )

    point  = ee.Geometry.Point([lon, lat])
    region = point.buffer(BUFFER_M).bounds()

    # Build sliding window boundaries
    start_dt = datetime.date.fromisoformat(start_date)
    end_dt   = datetime.date.fromisoformat(end_date)
    delta    = datetime.timedelta(days=window_days)

    raw_series: list[dict] = []
    cursor = start_dt
    while cursor + delta <= end_dt:
        win_start = cursor.isoformat()
        win_end   = (cursor + delta).isoformat()
        midpoint  = (cursor + datetime.timedelta(days=window_days // 2)).isoformat()
        cursor   += delta

        # Build composite for this window
        composite, _, _, count = build_composite(lat, lon, win_start, win_end)
        if composite is None or count == 0:
            raw_series.append({"date": midpoint, "cvi_mean": None, "cvi_smooth": None})
            continue

        # Compute indices and CVI
        composite = compute_vegetation_indices(composite)
        composite = compute_cvi(composite)

        # Extract single mean value
        try:
            inner_region = region.buffer(-INWARD_BUFFER_M)
            cvi_mean = (
                composite.select("CVI")
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=inner_region,
                    scale=10,
                    maxPixels=1e9,
                )
                .getInfo()
                .get("CVI")
            )
            cvi_mean = round(cvi_mean, 4) if cvi_mean is not None else None
        except Exception as exc:
            logger.warning("Time-series window %s failed: %s", midpoint, exc)
            cvi_mean = None

        raw_series.append({"date": midpoint, "cvi_mean": cvi_mean, "cvi_smooth": None})
        logger.info("  [%s] CVI mean = %s", midpoint, cvi_mean)

    # ── 3-point centred moving average ──────────────────────────────────────
    values = [e["cvi_mean"] for e in raw_series]
    for i, entry in enumerate(raw_series):
        neighbours = [
            v for v in values[max(0, i - 1): i + 2] if v is not None
        ]
        entry["cvi_smooth"] = round(sum(neighbours) / len(neighbours), 4) if neighbours else None

    logger.info("Time series complete: %d windows.", len(raw_series))
    return raw_series


# ═════════════════════════════════════════════════════════════════════════════
# 10. PUBLIC API — TOP-LEVEL ORCHESTRATOR
# ═════════════════════════════════════════════════════════════════════════════

def run_vegetation_engine(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
) -> dict:
    """
    Full pipeline orchestrator — the single public entry point.

    Pipeline steps:
        1. Build a cloud-free, SCL-masked, scaled median composite
        2. Compute 6 vegetation indices
        3. Compute CVI (multi-index fusion)
        4. Extract spatial statistics (mean/median/std/p25/p75) per-band
        5. Compute confidence score
        6. Format and return structured JSON-ready payload

    Args:
        lat        : Latitude (decimal degrees, WGS-84)
        lon        : Longitude (decimal degrees, WGS-84)
        start_date : Start of analysis period (ISO date string)
        end_date   : End of analysis period   (ISO date string)

    Returns:
        dict: Full structured payload (see schema below), or error dict.

    Output schema:
    {
      "location": { "lat": ..., "lon": ... },
      "date_range": { "start": ..., "end": ... },
      "scene_count": ...,
      "vegetation": {
        "CVI": { "mean": ..., "median": ..., "std": ..., "p25": ..., "p75": ..., "status": "..." },
        "NDVI":  { "mean": ..., "interpretation": "..." },
        "EVI":   { "mean": ..., "interpretation": "..." },
        "SAVI":  { "mean": ..., "interpretation": "..." },
        "NDMI":  { "mean": ..., "interpretation": "..." },
        "NDWI":  { "mean": ..., "interpretation": "..." },
        "GNDVI": { "mean": ..., "interpretation": "..." },
      },
      "confidence": 0.0–1.0
    }
    """
    logger.info(
        "=== Vegetation Engine START | lat=%.6f  lon=%.6f | %s → %s ===",
        lat, lon, start_date, end_date,
    )

    # ── Step 1: Build composite ──────────────────────────────────────────────
    composite, collection, region, scene_count = build_composite(
        lat, lon, start_date, end_date
    )

    if composite is None:
        logger.error("Pipeline aborted — no usable imagery.")
        return {
            "error": "No cloud-free Sentinel-2 imagery found for the given inputs.",
            "location":   {"lat": lat, "lon": lon},
            "date_range": {"start": start_date, "end": end_date},
        }

    # ── Step 2: Vegetation indices ───────────────────────────────────────────
    composite = compute_vegetation_indices(composite)

    # ── Step 3: CVI ─────────────────────────────────────────────────────────
    composite = compute_cvi(composite)

    # ── Step 4: Statistics ───────────────────────────────────────────────────
    logger.info("Extracting spatial statistics…")
    cvi_stats = extract_statistics(composite, region, "CVI")

    individual_stats = {}
    for idx, thresholds in {
        "NDVI":  NDVI_THRESHOLDS,
        "EVI":   EVI_THRESHOLDS,
        "SAVI":  SAVI_THRESHOLDS,
        "NDMI":  NDMI_THRESHOLDS,
        "NDWI":  NDWI_THRESHOLDS,
        "GNDVI": GNDVI_THRESHOLDS,
    }.items():
        stats  = extract_statistics(composite, region, idx)
        interp = interpret_value(stats.get("mean"), thresholds)
        individual_stats[idx] = {"mean": stats.get("mean"), "interpretation": interp}

    # ── Step 5: Confidence ───────────────────────────────────────────────────
    try:
        avg_cloud = (
            collection
            .aggregate_mean("CLOUDY_PIXEL_PERCENTAGE")
            .getInfo()
        )
    except Exception:
        avg_cloud = MAX_CLOUD_COVER_PCT   # conservative fallback

    confidence = compute_confidence(scene_count, avg_cloud or 0, cvi_stats)

    # ── Step 6: Status label for CVI ────────────────────────────────────────
    cvi_status = interpret_value(cvi_stats.get("mean"), CVI_THRESHOLDS)

    # ── Assemble payload ─────────────────────────────────────────────────────
    payload = {
        "location":   {"lat": lat, "lon": lon},
        "date_range": {"start": start_date, "end": end_date},
        "scene_count": scene_count,
        "vegetation": {
            "CVI": {**cvi_stats, "status": cvi_status},
            **individual_stats,
        },
        "confidence": confidence,
    }

    logger.info(
        "=== Vegetation Engine COMPLETE | CVI=%.4f | confidence=%.4f ===",
        cvi_stats.get("mean") or 0,
        confidence,
    )
    return payload

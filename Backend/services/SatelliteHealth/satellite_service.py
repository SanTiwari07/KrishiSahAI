"""
Satellite vegetation analysis wrapper: GEE engine + Ollama advisory.
Does not modify gee_engine.py / config.py — imports them from this package directory.
"""

from __future__ import annotations

import logging
import os
import sys
import threading
import datetime as _dt
from datetime import datetime, timezone
from typing import Any

# Ensure local gee_engine / config resolve before any other package named gee_engine
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if _THIS_DIR not in sys.path:
    sys.path.insert(0, _THIS_DIR)

import ee

from langchain_core.prompts import PromptTemplate
from langchain_ollama import OllamaLLM

from gee_engine import (
    initialize_gee as authenticate_gee,
    build_composite,
    compute_vegetation_indices as calculate_all_indices,
    compute_cvi,
    extract_statistics,
    generate_time_series as get_time_series,
    interpret_value,
    compute_confidence,
)
from config import (
    CVI_THRESHOLDS,
    NDVI_THRESHOLDS,
    EVI_THRESHOLDS,
    SAVI_THRESHOLDS,
    NDMI_THRESHOLDS,
    NDWI_THRESHOLDS,
    GNDVI_THRESHOLDS,
    MAX_CLOUD_COVER_PCT,
)

logger = logging.getLogger(__name__)

# Per-request context (build_composite geometry/collection for downstream stats)
_ctx = threading.local()

_INDEX_ORDER = [
    ("NDVI", NDVI_THRESHOLDS),
    ("EVI", EVI_THRESHOLDS),
    ("SAVI", SAVI_THRESHOLDS),
    ("NDMI", NDMI_THRESHOLDS),
    ("NDWI", NDWI_THRESHOLDS),
    ("GNDVI", GNDVI_THRESHOLDS),
]

_INDEX_BANDS = ["NDVI", "EVI", "SAVI", "NDMI", "NDWI", "GNDVI", "CVI"]
_GRID_SCALE_M = 10
_GRID_SCALE_STEP_M = 5
_MAX_GRID_CELLS = 1600

_NDVI_PALETTE = [
    "#ad0028",
    "#c5142a",
    "#e02d2c",
    "#ef4c3a",
    "#fe6c4a",
    "#ff8d5a",
    "#ffab69",
    "#ffc67d",
    "#ffe093",
    "#ffefab",
    "#fdfec2",
    "#eaf7ac",
    "#d5ef94",
    "#b9e383",
    "#9bd873",
    "#77ca6f",
    "#53bd6b",
    "#14aa60",
    "#009755",
    "#007e47",
]
_CVI_PALETTE = ["#ef4444", "#f59e0b", "#22c55e"]
_last_indexed_image: ee.Image | None = None
_last_ee_geometry: ee.Geometry | None = None


def get_composite_image(lat: float, lon: float, start_date: str, end_date: str):
    composite, collection, region, scene_count = build_composite(
        lat, lon, start_date, end_date
    )
    _ctx.collection = collection
    _ctx.region = region
    _ctx.scene_count = scene_count
    return composite


def get_cvi_stats(index_image, lat: float, lon: float) -> dict:
    """Build CVI band stats + status + confidence using region/collection from last get_composite_image."""
    region = getattr(_ctx, "region", None)
    collection = getattr(_ctx, "collection", None)
    scene_count = int(getattr(_ctx, "scene_count", 0) or 0)
    if region is None:
        raise RuntimeError("Internal error: no GEE region context — call get_composite_image first.")

    img_with_cvi = compute_cvi(index_image)
    cvi_stats = extract_statistics(img_with_cvi, region, "CVI")
    cvi_status = interpret_value(cvi_stats.get("mean"), CVI_THRESHOLDS)

    try:
        if collection is not None:
            avg_cloud = collection.aggregate_mean("CLOUDY_PIXEL_PERCENTAGE").getInfo()
        else:
            avg_cloud = MAX_CLOUD_COVER_PCT
    except Exception:
        avg_cloud = MAX_CLOUD_COVER_PCT

    confidence = compute_confidence(scene_count, avg_cloud or 0, cvi_stats)

    return {
        "mean": cvi_stats.get("mean"),
        "median": cvi_stats.get("median"),
        "stdDev": cvi_stats.get("std"),
        "interpretation": cvi_status,
        "status": cvi_status,
        "confidence": confidence,
    }


def _lang_instruction(language: str) -> str:
    code = (language or "en").lower()
    if code == "hi":
        return "केवल हिंदी में उत्तर दें। अंग्रेजी का प्रयोग बिल्कुल न करें।"
    if code == "mr":
        return "फक्त मराठीत उत्तर द्या. इंग्रजी अजिबात वापरू नका."
    return "Respond ONLY in English."


def _generate_advisory(
    stats: dict,
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    crop: str,
    language: str,
) -> str:
    """LLM crop advisory from CVI + index statistics (Iron Curtain language lock)."""
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    llm = OllamaLLM(model="llama3.2", base_url=base_url, temperature=0.35)

    index_lines = []
    for name, th in _INDEX_ORDER:
        st = stats.get("indices", {}).get(name, {})
        m = st.get("mean")
        interp = st.get("interpretation", "")
        index_lines.append(f"- {name} mean: {m} — {interp}")

    cvi_mean = stats.get("cvi", {}).get("mean")
    cvi_status = stats.get("cvi", {}).get("status", "")
    conf = stats.get("cvi", {}).get("confidence", 0)

    prompt = PromptTemplate.from_template(
        """You are an agronomy assistant for Indian farmers.

Vegetation analysis (satellite-derived):
- CVI mean: {cvi_mean}
- CVI status: {cvi_status}
- Confidence (0–1): {confidence}

Spectral indices (means + interpretations):
{index_block}

Farm context:
- Crop: {crop}
- Location: lat {lat}, lon {lon}
- Date range: {start_date} to {end_date}

LANGUAGE (mandatory): {lang_rule}

Produce a practical crop advisory in at most 200 words total:
(1) A 2–3 sentence plain-language summary of crop/field condition implied by these signals.
(2) Exactly three numbered actionable recommendations; each must include approximate quantities or rates where sensible AND timing (when to act in the next few weeks).
(3) One clear warning sign to watch for in the next 2 weeks if stress or moisture issues may develop.

Do not repeat raw numbers in a table; integrate them naturally. Stay practical and conservative."""
    )

    chain = prompt | llm
    text = chain.invoke(
        {
            "cvi_mean": cvi_mean,
            "cvi_status": cvi_status,
            "confidence": conf,
            "index_block": "\n".join(index_lines),
            "crop": crop or "crop",
            "lat": lat,
            "lon": lon,
            "start_date": start_date,
            "end_date": end_date,
            "lang_rule": _lang_instruction(language),
        }
    )
    if not isinstance(text, str):
        text = getattr(text, "content", None) or str(text)
    return (text or "").strip()


def get_satellite_analysis(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    crop: str = "crop",
    language: str = "en",
) -> dict:
    if not authenticate_gee():
        raise RuntimeError("Google Earth Engine initialization failed.")

    composite = get_composite_image(lat, lon, start_date, end_date)
    if composite is None:
        raise ValueError(
            "No cloud-free Sentinel-2 imagery found for the given location and date range."
        )

    index_image = calculate_all_indices(composite)
    stats_block = get_cvi_stats(index_image, lat, lon)

    indices_out: dict = {}
    region = _ctx.region
    for band, thresholds in _INDEX_ORDER:
        st = extract_statistics(index_image, region, band)
        interp = interpret_value(st.get("mean"), thresholds)
        indices_out[band] = {
            "mean": st.get("mean"),
            "median": st.get("median"),
            "stdDev": st.get("std"),
            "interpretation": interp,
        }

    cvi_payload = {
        "mean": stats_block.get("mean"),
        "median": stats_block.get("median"),
        "stdDev": stats_block.get("stdDev"),
        "interpretation": stats_block.get("interpretation", stats_block.get("status", "")),
        "status": stats_block.get("status", ""),
        "confidence": stats_block.get("confidence", 0.0),
    }

    stats_for_llm = {"cvi": cvi_payload, "indices": indices_out}

    try:
        raw_ts = get_time_series(lat, lon, start_date, end_date)
    except Exception as exc:
        logger.warning("Time series failed, using empty list: %s", exc)
        raw_ts = []

    time_series = []
    for row in raw_ts or []:
        d = row.get("date")
        cvi_val = row.get("cvi_smooth")
        if cvi_val is None:
            cvi_val = row.get("cvi_mean")
        if d is not None and cvi_val is not None:
            time_series.append({"date": str(d), "cvi": float(cvi_val)})

    advisory = _generate_advisory(
        stats_for_llm, lat, lon, start_date, end_date, crop, language
    )

    meta = {
        "lat": lat,
        "lon": lon,
        "startDate": start_date,
        "endDate": end_date,
        "crop": crop or "crop",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "cvi": cvi_payload,
        "indices": indices_out,
        "timeSeries": time_series,
        "advisory": advisory,
        "meta": meta,
    }


def _validate_geojson_polygon(geometry: dict[str, Any]) -> None:
    if not isinstance(geometry, dict):
        raise ValueError("Geometry must be a JSON object.")
    if geometry.get("type") != "Polygon":
        raise ValueError("Geometry type must be 'Polygon'.")
    coords = geometry.get("coordinates")
    if not isinstance(coords, list) or not coords:
        raise ValueError("Geometry coordinates must be a non-empty array.")
    ring = coords[0]
    if not isinstance(ring, list) or len(ring) < 4:
        raise ValueError("Polygon outer ring must contain at least 4 points.")
    for idx, point in enumerate(ring):
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            raise ValueError(f"Invalid coordinate at index {idx}.")
        lon, lat = point[0], point[1]
        if not (-180 <= lon <= 180):
            raise ValueError(f"Longitude out of range at index {idx}.")
        if not (-90 <= lat <= 90):
            raise ValueError(f"Latitude out of range at index {idx}.")


def _geometry_to_ee(geometry: dict[str, Any]) -> ee.Geometry:
    _validate_geojson_polygon(geometry)
    return ee.Geometry(geometry)


def _mask_clouds_scl(image: ee.Image) -> ee.Image:
    from config import BANDS, SCL_MASK_VALUES

    scl = image.select(BANDS["SCL"])
    mask = ee.Image.constant(1)
    for bad_class in SCL_MASK_VALUES:
        mask = mask.And(scl.neq(bad_class))
    return image.updateMask(mask)


def _build_composite_for_geometry(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    cloud_pct: int = MAX_CLOUD_COVER_PCT,
) -> tuple[ee.Image | None, ee.ImageCollection | None, int]:
    from config import DATASET

    collection = (
        ee.ImageCollection(DATASET)
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_pct))
        .map(_mask_clouds_scl)
        .map(lambda img: img.divide(10000))
    )

    scene_count = int(collection.size().getInfo())
    if scene_count == 0:
        return None, None, 0
    return collection.median(), collection, scene_count


def _build_single_day_composite(
    geometry: ee.Geometry,
    target_date: str,
    cloud_pct: int = MAX_CLOUD_COVER_PCT,
) -> tuple[ee.Image | None, ee.ImageCollection | None, int]:
    target = _dt.date.fromisoformat(target_date)
    start = target.isoformat()
    end = (target + _dt.timedelta(days=1)).isoformat()
    return _build_composite_for_geometry(geometry, start, end, cloud_pct=cloud_pct)


def _get_smooth_tile_url(
    image: ee.Image,
    geometry: ee.Geometry,
    band: str,
    vis_params: dict[str, Any],
) -> str | None:
    try:
        smooth_image = (
            image.select(band)
            .clip(geometry)
            .updateMask(image.select(band).gte(0))
            .resample("bicubic")
            .reproject(crs="EPSG:4326", scale=10)
            .focal_mean(2, "circle", "pixels")
        )
        map_id = smooth_image.getMapId(vis_params)
        return map_id["tile_fetcher"].url_format
    except Exception as exc:
        logger.warning("Failed to generate tile URL for %s: %s", band, exc)
        return None


def _summarise_indices_for_geometry(
    indexed_image: ee.Image,
    geometry: ee.Geometry,
    collection: ee.ImageCollection | None,
    scene_count: int,
) -> dict[str, Any]:
    cvi_stats = extract_statistics(indexed_image, geometry, "CVI")
    cvi_status = interpret_value(cvi_stats.get("mean"), CVI_THRESHOLDS)
    try:
        avg_cloud = (
            collection.aggregate_mean("CLOUDY_PIXEL_PERCENTAGE").getInfo()
            if collection
            else MAX_CLOUD_COVER_PCT
        )
    except Exception:
        avg_cloud = MAX_CLOUD_COVER_PCT
    confidence = compute_confidence(scene_count, avg_cloud or 0, cvi_stats)

    thresholds_map = {
        "NDVI": NDVI_THRESHOLDS,
        "EVI": EVI_THRESHOLDS,
        "SAVI": SAVI_THRESHOLDS,
        "NDMI": NDMI_THRESHOLDS,
        "NDWI": NDWI_THRESHOLDS,
        "GNDVI": GNDVI_THRESHOLDS,
        "CVI": CVI_THRESHOLDS,
    }
    indices: dict[str, Any] = {}
    for band in _INDEX_BANDS:
        stats = extract_statistics(indexed_image, geometry, band)
        indices[band] = {
            "mean": stats.get("mean"),
            "interpretation": interpret_value(stats.get("mean"), thresholds_map[band]),
        }

    return {
        "confidence": confidence,
        "scene_count": scene_count,
        "indices": indices,
        "cvi": {
            "mean": cvi_stats.get("mean"),
            "median": cvi_stats.get("median"),
            "stdDev": cvi_stats.get("std"),
            "status": cvi_status,
            "interpretation": cvi_status,
            "confidence": confidence,
        },
    }


def _generate_grid_features(
    indexed_image: ee.Image,
    geometry: ee.Geometry,
    scale: int = _GRID_SCALE_M,
) -> list[dict[str, Any]]:
    """
    NDVI-style polygon heatmap data:
    - Build an adaptive regular grid over polygon
    - Reduce each grid cell with mean index values
    - Return GeoJSON Feature list for frontend heatmap rendering
    """
    current_scale = scale
    proj = ee.Projection("EPSG:4326").atScale(current_scale)
    grid = geometry.coveringGrid(proj)
    cell_count = int(grid.size().getInfo())

    while cell_count > _MAX_GRID_CELLS:
        current_scale += _GRID_SCALE_STEP_M
        proj = ee.Projection("EPSG:4326").atScale(current_scale)
        grid = geometry.coveringGrid(proj)
        cell_count = int(grid.size().getInfo())

    image_subset = indexed_image.select(_INDEX_BANDS)

    def _reduce_cell(cell: ee.Feature) -> ee.Feature:
        stats = image_subset.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=cell.geometry(),
            scale=current_scale,
            maxPixels=1e8,
        )
        return cell.set(stats)

    reduced = grid.map(_reduce_cell)
    raw_geojson = reduced.getInfo()
    features: list[dict[str, Any]] = []
    for feat in raw_geojson.get("features", []):
        props = feat.get("properties", {}) or {}
        out_props: dict[str, Any] = {}
        for band in _INDEX_BANDS:
            val = props.get(band)
            out_props[band.lower()] = round(val, 4) if val is not None else None
        out_props["interpretation"] = interpret_value(
            out_props.get("cvi"), CVI_THRESHOLDS
        )
        features.append(
            {
                "type": "Feature",
                "geometry": feat.get("geometry"),
                "properties": out_props,
            }
        )
    return features


def _set_last_analysis(indexed_image: ee.Image, geometry: ee.Geometry) -> None:
    global _last_indexed_image, _last_ee_geometry
    _last_indexed_image = indexed_image
    _last_ee_geometry = geometry


def analyze_satellite_geometry(
    geometry: dict[str, Any],
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    if not authenticate_gee():
        raise RuntimeError("Google Earth Engine initialization failed.")

    ee_geometry = _geometry_to_ee(geometry)
    composite, collection, scene_count = _build_composite_for_geometry(
        ee_geometry, start_date, end_date
    )
    if composite is None:
        return {
            "error": "No cloud-free Sentinel-2 imagery found for this area in the selected date range.",
            "farm_boundary": geometry,
        }

    indexed_image = calculate_all_indices(composite)
    indexed_image = compute_cvi(indexed_image)
    _set_last_analysis(indexed_image, ee_geometry)
    features = _generate_grid_features(indexed_image, ee_geometry)
    summary = _summarise_indices_for_geometry(
        indexed_image, ee_geometry, collection, scene_count
    )
    index_vis = {"min": 0.0, "max": 1.0, "palette": _NDVI_PALETTE}
    cvi_vis = {"min": 0.0, "max": 1.0, "palette": _CVI_PALETTE}
    index_tiles: dict[str, str | None] = {}
    for band in ["NDVI", "EVI", "SAVI", "NDMI", "NDWI", "GNDVI"]:
        index_tiles[f"{band.lower()}_tile_url"] = _get_smooth_tile_url(
            indexed_image, ee_geometry, band, index_vis
        )
    index_tiles["cvi_tile_url"] = _get_smooth_tile_url(
        indexed_image, ee_geometry, "CVI", cvi_vis
    )

    return {
        "type": "FeatureCollection",
        "features": features,
        "farm_boundary": geometry,
        "farm_summary": summary,
        "index_tiles": index_tiles,
        "ndvi_tile_url": index_tiles.get("ndvi_tile_url"),
        "tile_url": index_tiles.get("cvi_tile_url"),
        "startDate": start_date,
        "endDate": end_date,
        "scene_count": scene_count,
    }


def get_satellite_available_dates(
    geometry: dict[str, Any],
    lookback_days: int = 90,
) -> list[str]:
    if not authenticate_gee():
        raise RuntimeError("Google Earth Engine initialization failed.")

    from config import DATASET

    ee_geometry = _geometry_to_ee(geometry)
    end_date = _dt.date.today()
    start_date = end_date - _dt.timedelta(days=lookback_days)

    collection = (
        ee.ImageCollection(DATASET)
        .filterBounds(ee_geometry)
        .filterDate(start_date.isoformat(), end_date.isoformat())
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", MAX_CLOUD_COVER_PCT))
    )

    date_features = collection.map(
        lambda img: ee.Feature(
            None, {"date": ee.Date(img.get("system:time_start")).format("YYYY-MM-dd")}
        )
    )
    dates = date_features.aggregate_array("date").distinct().sort().getInfo()
    return [str(x) for x in (dates or [])]


def analyze_satellite_day(
    geometry: dict[str, Any],
    target_date: str,
) -> dict[str, Any]:
    if not authenticate_gee():
        raise RuntimeError("Google Earth Engine initialization failed.")

    ee_geometry = _geometry_to_ee(geometry)
    composite, collection, scene_count = _build_single_day_composite(
        ee_geometry, target_date
    )
    if composite is None:
        return {
            "error": f"No imagery found for date {target_date}.",
            "farm_boundary": geometry,
            "date": target_date,
        }

    indexed_image = calculate_all_indices(composite)
    indexed_image = compute_cvi(indexed_image)
    _set_last_analysis(indexed_image, ee_geometry)
    features = _generate_grid_features(indexed_image, ee_geometry)
    summary = _summarise_indices_for_geometry(
        indexed_image, ee_geometry, collection, scene_count
    )
    index_vis = {"min": 0.0, "max": 1.0, "palette": _NDVI_PALETTE}
    cvi_vis = {"min": 0.0, "max": 1.0, "palette": _CVI_PALETTE}
    index_tiles: dict[str, str | None] = {}
    for band in ["NDVI", "EVI", "SAVI", "NDMI", "NDWI", "GNDVI"]:
        index_tiles[f"{band.lower()}_tile_url"] = _get_smooth_tile_url(
            indexed_image, ee_geometry, band, index_vis
        )
    index_tiles["cvi_tile_url"] = _get_smooth_tile_url(
        indexed_image, ee_geometry, "CVI", cvi_vis
    )

    return {
        "type": "FeatureCollection",
        "features": features,
        "farm_boundary": geometry,
        "farm_summary": summary,
        "index_tiles": index_tiles,
        "ndvi_tile_url": index_tiles.get("ndvi_tile_url"),
        "tile_url": index_tiles.get("cvi_tile_url"),
        "date": target_date,
        "scene_count": scene_count,
    }


def sample_satellite_point(
    lat: float,
    lng: float,
    band: str = "NDVI",
    scale: int = 10,
) -> float | None:
    if _last_indexed_image is None:
        return None
    target_band = (band or "NDVI").upper()
    if target_band not in _INDEX_BANDS:
        raise ValueError(f"Invalid band '{target_band}'.")
    try:
        point = ee.Geometry.Point([lng, lat])
        result = (
            _last_indexed_image.select(target_band)
            .reduceRegion(
                reducer=ee.Reducer.first(),
                geometry=point,
                scale=scale,
                maxPixels=1,
            )
            .getInfo()
        )
        val = result.get(target_band) if result else None
        return round(float(val), 4) if val is not None else None
    except Exception:
        return None

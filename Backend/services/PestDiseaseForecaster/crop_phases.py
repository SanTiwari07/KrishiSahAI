"""
Crop phase duration tables for major Indian crops.
Used to auto-calculate the current growth phase from a sowing date.

Each crop has:
- total_days: total lifecycle in days
- season: primary cropping season (kharif/rabi/zaid)
- phases: ordered list of growth phases with duration in days
- default_sowing: fallback sowing dates when farmer hasn't provided one
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any

CROP_PHASE_DURATIONS: Dict[str, Dict[str, Any]] = {
    "rice": {
        "total_days": 120,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Sowing & Nursery", "days": 25},
            {"name": "vegetative", "label": "Vegetative Growth (Tillering)", "days": 40},
            {"name": "flowering", "label": "Flowering & Grain Filling", "days": 35},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 20},
        ],
        "default_sowing": {"kharif": "06-15", "rabi": "11-15"},
    },
    "wheat": {
        "total_days": 150,
        "season": "rabi",
        "phases": [
            {"name": "sowing", "label": "Sowing & Establishment", "days": 30},
            {"name": "vegetative", "label": "Tillering & Vegetative Growth", "days": 45},
            {"name": "flowering", "label": "Flowering & Grain Filling", "days": 45},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 30},
        ],
        "default_sowing": {"rabi": "11-01"},
    },
    "cotton": {
        "total_days": 180,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Sowing & Germination", "days": 30},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 50},
            {"name": "flowering", "label": "Flowering & Boll Formation", "days": 60},
            {"name": "harvest", "label": "Boll Opening & Harvest", "days": 40},
        ],
        "default_sowing": {"kharif": "06-01"},
    },
    "tomato": {
        "total_days": 120,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Transplanting & Establishment", "days": 25},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 35},
            {"name": "flowering", "label": "Flowering & Fruit Setting", "days": 35},
            {"name": "harvest", "label": "Harvesting", "days": 25},
        ],
        "default_sowing": {"kharif": "07-01", "rabi": "10-15"},
    },
    "potato": {
        "total_days": 110,
        "season": "rabi",
        "phases": [
            {"name": "sowing", "label": "Planting & Sprouting", "days": 25},
            {"name": "vegetative", "label": "Vegetative Growth & Tuber Initiation", "days": 35},
            {"name": "flowering", "label": "Tuber Bulking", "days": 30},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 20},
        ],
        "default_sowing": {"rabi": "10-15"},
    },
    "sugarcane": {
        "total_days": 360,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Planting & Germination", "days": 45},
            {"name": "vegetative", "label": "Tillering & Vegetative Growth", "days": 120},
            {"name": "flowering", "label": "Grand Growth Phase", "days": 120},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 75},
        ],
        "default_sowing": {"kharif": "02-15"},
    },
    "maize": {
        "total_days": 110,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Sowing & Germination", "days": 20},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 35},
            {"name": "flowering", "label": "Tasseling & Grain Filling", "days": 35},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 20},
        ],
        "default_sowing": {"kharif": "06-20", "rabi": "10-20"},
    },
    "soybean": {
        "total_days": 110,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Sowing & Germination", "days": 20},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 35},
            {"name": "flowering", "label": "Flowering & Pod Formation", "days": 35},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 20},
        ],
        "default_sowing": {"kharif": "06-20"},
    },
    "chickpea": {
        "total_days": 120,
        "season": "rabi",
        "phases": [
            {"name": "sowing", "label": "Sowing & Germination", "days": 25},
            {"name": "vegetative", "label": "Vegetative Growth & Branching", "days": 35},
            {"name": "flowering", "label": "Flowering & Pod Formation", "days": 35},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 25},
        ],
        "default_sowing": {"rabi": "10-15"},
    },
    "groundnut": {
        "total_days": 120,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Sowing & Germination", "days": 20},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 35},
            {"name": "flowering", "label": "Flowering & Pegging", "days": 40},
            {"name": "harvest", "label": "Pod Development & Harvest", "days": 25},
        ],
        "default_sowing": {"kharif": "06-15"},
    },
    "chilli": {
        "total_days": 150,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Transplanting & Establishment", "days": 30},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 40},
            {"name": "flowering", "label": "Flowering & Fruiting", "days": 50},
            {"name": "harvest", "label": "Harvesting", "days": 30},
        ],
        "default_sowing": {"kharif": "06-15", "rabi": "09-15"},
    },
    "onion": {
        "total_days": 130,
        "season": "rabi",
        "phases": [
            {"name": "sowing", "label": "Transplanting & Establishment", "days": 25},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 40},
            {"name": "flowering", "label": "Bulb Development", "days": 40},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 25},
        ],
        "default_sowing": {"rabi": "11-15", "kharif": "06-01"},
    },
    "pigeon pea": {
        "total_days": 180,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Sowing & Germination", "days": 25},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 65},
            {"name": "flowering", "label": "Flowering & Pod Formation", "days": 55},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 35},
        ],
        "default_sowing": {"kharif": "06-15"},
    },
    "mustard": {
        "total_days": 130,
        "season": "rabi",
        "phases": [
            {"name": "sowing", "label": "Sowing & Germination", "days": 25},
            {"name": "vegetative", "label": "Vegetative Growth & Branching", "days": 40},
            {"name": "flowering", "label": "Flowering & Siliqua Formation", "days": 40},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 25},
        ],
        "default_sowing": {"rabi": "10-15"},
    },
    "brinjal": {
        "total_days": 150,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Transplanting & Establishment", "days": 30},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 40},
            {"name": "flowering", "label": "Flowering & Fruiting", "days": 50},
            {"name": "harvest", "label": "Harvesting", "days": 30},
        ],
        "default_sowing": {"kharif": "06-15", "rabi": "10-01"},
    },
    "banana": {
        "total_days": 365,
        "season": "kharif",
        "phases": [
            {"name": "sowing", "label": "Planting & Establishment", "days": 60},
            {"name": "vegetative", "label": "Vegetative Growth", "days": 150},
            {"name": "flowering", "label": "Flowering & Bunch Development", "days": 90},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 65},
        ],
        "default_sowing": {"kharif": "06-01"},
    },
    "grape": {
        "total_days": 150,
        "season": "rabi",
        "phases": [
            {"name": "sowing", "label": "Pruning & Bud Break", "days": 20},
            {"name": "vegetative", "label": "Shoot Growth", "days": 40},
            {"name": "flowering", "label": "Flowering & Berry Development", "days": 55},
            {"name": "harvest", "label": "Veraison & Harvest", "days": 35},
        ],
        "default_sowing": {"rabi": "10-01"},
    },
    "mango": {
        "total_days": 180,
        "season": "rabi",
        "phases": [
            {"name": "sowing", "label": "Flowering Initiation", "days": 30},
            {"name": "vegetative", "label": "Flowering & Fruit Set", "days": 45},
            {"name": "flowering", "label": "Fruit Development", "days": 60},
            {"name": "harvest", "label": "Maturity & Harvest", "days": 45},
        ],
        "default_sowing": {"rabi": "12-01"},
    },
}

# Season inference from current month
SEASON_MAP = {
    1: "rabi", 2: "rabi", 3: "zaid",
    4: "zaid", 5: "zaid", 6: "kharif",
    7: "kharif", 8: "kharif", 9: "kharif",
    10: "rabi", 11: "rabi", 12: "rabi",
}


def get_crop_phase(crop_name: str, sowing_date_str: Optional[str] = None) -> Dict[str, Any]:
    """
    Determine the current crop growth phase.

    Args:
        crop_name: Name of the crop (case-insensitive)
        sowing_date_str: ISO date string (YYYY-MM-DD) of sowing date,
                         or None to use regional calendar defaults.

    Returns:
        Dict with phase info:
        {
            "crop": "rice",
            "phase_name": "vegetative",
            "phase_label": "Vegetative Growth (Tillering)",
            "phase_index": 1,
            "total_phases": 4,
            "day_in_crop": 45,
            "day_in_phase": 20,
            "phase_total_days": 40,
            "phase_progress_pct": 50.0,
            "overall_progress_pct": 37.5,
            "sowing_date": "2026-02-15",
            "source": "farmer_input" | "calendar_default",
            "status": "active" | "pre_sowing" | "post_harvest"
        }
    """
    crop_key = crop_name.lower().strip()

    # Try exact match first, then partial match
    crop_data = CROP_PHASE_DURATIONS.get(crop_key)
    if not crop_data:
        for key in CROP_PHASE_DURATIONS:
            if key in crop_key or crop_key in key:
                crop_data = CROP_PHASE_DURATIONS[key]
                crop_key = key
                break

    if not crop_data:
        # Unknown crop – return a generic phase estimate
        return _unknown_crop_fallback(crop_name)

    today = datetime.now()
    source = "farmer_input"

    if sowing_date_str:
        try:
            sowing_date = datetime.strptime(sowing_date_str, "%Y-%m-%d")
        except ValueError:
            sowing_date = None
            source = "calendar_default"
    else:
        sowing_date = None
        source = "calendar_default"

    # Fallback: use regional calendar default
    if sowing_date is None:
        current_season = SEASON_MAP.get(today.month, "kharif")
        primary_season = crop_data.get("season", "kharif")
        defaults = crop_data.get("default_sowing", {})

        # Pick the best matching season
        sowing_mmdd = defaults.get(primary_season) or defaults.get(current_season)
        if not sowing_mmdd:
            sowing_mmdd = list(defaults.values())[0] if defaults else "06-15"

        # Determine the year: if the default sowing month is ahead of current month,
        # assume the farmer sowed last year
        month_val = int(sowing_mmdd.split("-")[0])
        sow_year = today.year if month_val <= today.month else today.year - 1
        sowing_date = datetime.strptime(f"{sow_year}-{sowing_mmdd}", "%Y-%m-%d")

    days_since_sowing = (today - sowing_date).days

    if days_since_sowing < 0:
        return {
            "crop": crop_key,
            "phase_name": "pre_sowing",
            "phase_label": "Pre-Sowing (Not Yet Planted)",
            "phase_index": -1,
            "total_phases": len(crop_data["phases"]),
            "day_in_crop": days_since_sowing,
            "day_in_phase": 0,
            "phase_total_days": 0,
            "phase_progress_pct": 0.0,
            "overall_progress_pct": 0.0,
            "sowing_date": sowing_date.strftime("%Y-%m-%d"),
            "source": source,
            "status": "pre_sowing",
        }

    if days_since_sowing > crop_data["total_days"]:
        return {
            "crop": crop_key,
            "phase_name": "post_harvest",
            "phase_label": "Post-Harvest",
            "phase_index": len(crop_data["phases"]),
            "total_phases": len(crop_data["phases"]),
            "day_in_crop": days_since_sowing,
            "day_in_phase": 0,
            "phase_total_days": 0,
            "phase_progress_pct": 100.0,
            "overall_progress_pct": 100.0,
            "sowing_date": sowing_date.strftime("%Y-%m-%d"),
            "source": source,
            "status": "post_harvest",
        }

    # Calculate which phase
    accumulated = 0
    for idx, phase in enumerate(crop_data["phases"]):
        if accumulated + phase["days"] > days_since_sowing:
            day_in_phase = days_since_sowing - accumulated
            return {
                "crop": crop_key,
                "phase_name": phase["name"],
                "phase_label": phase["label"],
                "phase_index": idx,
                "total_phases": len(crop_data["phases"]),
                "day_in_crop": days_since_sowing,
                "day_in_phase": day_in_phase,
                "phase_total_days": phase["days"],
                "phase_progress_pct": round((day_in_phase / phase["days"]) * 100, 1),
                "overall_progress_pct": round(
                    (days_since_sowing / crop_data["total_days"]) * 100, 1
                ),
                "sowing_date": sowing_date.strftime("%Y-%m-%d"),
                "source": source,
                "status": "active",
            }
        accumulated += phase["days"]

    # Should not reach here, but safe fallback
    last = crop_data["phases"][-1]
    return {
        "crop": crop_key,
        "phase_name": last["name"],
        "phase_label": last["label"],
        "phase_index": len(crop_data["phases"]) - 1,
        "total_phases": len(crop_data["phases"]),
        "day_in_crop": days_since_sowing,
        "day_in_phase": last["days"],
        "phase_total_days": last["days"],
        "phase_progress_pct": 100.0,
        "overall_progress_pct": 100.0,
        "sowing_date": sowing_date.strftime("%Y-%m-%d"),
        "source": source,
        "status": "active",
    }


def _unknown_crop_fallback(crop_name: str) -> Dict[str, Any]:
    """Fallback for crops not in the database."""
    return {
        "crop": crop_name.lower().strip(),
        "phase_name": "unknown",
        "phase_label": "Growth Phase (General)",
        "phase_index": 0,
        "total_phases": 4,
        "day_in_crop": 0,
        "day_in_phase": 0,
        "phase_total_days": 30,
        "phase_progress_pct": 0.0,
        "overall_progress_pct": 0.0,
        "sowing_date": None,
        "source": "unknown_crop",
        "status": "active",
    }

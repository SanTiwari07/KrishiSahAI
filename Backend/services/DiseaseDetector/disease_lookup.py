"""
Map CNN class output (crop + disease display + raw training label) to rows in
crop_disease_data.csv using fuzzy matching. No static treatment text in code.
"""

from __future__ import annotations

import json
import re
from difflib import SequenceMatcher, get_close_matches
from pathlib import Path
from typing import Any

import pandas as pd

_BASE = Path(__file__).resolve().parent
_OVERRIDES_PATH = _BASE / "crop_name_overrides.json"


def _norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return " ".join(s.split())


def _load_crop_overrides() -> dict[str, str]:
    if not _OVERRIDES_PATH.exists():
        return {}
    try:
        data = json.loads(_OVERRIDES_PATH.read_text(encoding="utf-8"))
        return {str(k).strip().lower(): str(v).strip() for k, v in data.items()}
    except Exception:
        return {}


def _override_csv_crop(model_crop: str) -> str | None:
    return _load_crop_overrides().get(model_crop.strip().lower())


def _pick_csv_crop(df: pd.DataFrame, model_crop: str) -> str | None:
    crops = df["Crop Name"].astype(str).unique().tolist()
    ov = _override_csv_crop(model_crop)
    if ov and ov in crops:
        return ov
    raw = get_close_matches(model_crop.strip(), crops, n=1, cutoff=0.5)
    if raw:
        return raw[0]
    mc = _norm(model_crop)
    best, best_r = None, 0.0
    for c in crops:
        r = SequenceMatcher(None, mc, _norm(c)).ratio()
        if r > best_r:
            best_r, best = r, c
    if best is not None and best_r >= 0.52:
        return best
    return None


def _strip_crop_prefix(crop: str, disease_display: str) -> str:
    d = disease_display.strip()
    c = crop.strip().lower()
    dl = d.lower()
    if dl.startswith(c + " "):
        return d[len(crop.strip()) :].strip()
    return d


def match_extension_metadata(
    df: pd.DataFrame,
    model_crop: str,
    disease_display: str,
    raw_class_label: str | None,
) -> dict[str, Any] | None:
    """
    Return dict with crop, disease, pathogen, home_remedy, chemical_recommendation
    or None if no reasonable CSV row.
    """
    if df is None or df.empty:
        return None

    csv_crop = _pick_csv_crop(df, model_crop)
    if not csv_crop:
        return None

    sub = df[df["Crop Name"] == csv_crop]
    if sub.empty:
        return None

    if raw_class_label and raw_class_label.strip().lower().endswith("___healthy"):
        m = sub[sub["Crop Disease"].astype(str).str.lower() == "healthy"]
        if not m.empty:
            return _row_to_dict(m.iloc[0])

    dkey = _strip_crop_prefix(model_crop, disease_display)
    dk_norm = _norm(dkey)

    best_row: pd.Series | None = None
    best_score = 0.0

    for _, row in sub.iterrows():
        rd = _norm(str(row["Crop Disease"]))
        if not rd:
            continue
        score = SequenceMatcher(None, dk_norm, rd).ratio()
        if rd in dk_norm or dk_norm in rd:
            score = max(score, 0.88)
        kt, rt = set(dk_norm.split()), set(rd.split())
        if kt and rt:
            inter = len(kt & rt)
            union = len(kt | rt)
            if union:
                score = max(score, (inter / union) * 0.95)
        if score > best_score:
            best_score, best_row = score, row

    if best_row is None or best_score < 0.28:
        return None
    return _row_to_dict(best_row)


def _row_to_dict(row: pd.Series) -> dict[str, Any]:
    return {
        "crop": row["Crop Name"],
        "disease": row["Crop Disease"],
        "pathogen": row["Pathogen"],
        "home_remedy": row["Home Remedy"],
        "chemical_recommendation": row["Chemical Recommendation"],
    }

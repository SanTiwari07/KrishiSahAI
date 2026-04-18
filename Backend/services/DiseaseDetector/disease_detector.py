"""
Disease detector: loads TensorFlow weights from `plant_disease_model.h5` and
class names from `plant_disease_labels.txt` (same order as training). CSV
extension metadata is resolved in `disease_lookup.py` / app layer.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import numpy as np

try:
    import tensorflow as tf
except ImportError:
    tf = None
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "plant_disease_model.h5"
LABELS_PATH = BASE_DIR / "plant_disease_labels.txt"

_MODEL: Any | None = None
_CLASS_NAMES: list[str] | None = None


def _read_class_names() -> list[str]:
    if not LABELS_PATH.exists():
        raise FileNotFoundError(
            f"Missing {LABELS_PATH.name}: add one PlantVillage-style label per line "
            f"(same order as the softmax outputs of {MODEL_PATH.name})."
        )
    text = LABELS_PATH.read_text(encoding="utf-8")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        raise ValueError(f"{LABELS_PATH.name} is empty.")
    return lines


def _ensure_labels_match_model(model: Any) -> list[str]:
    global _CLASS_NAMES
    names = _read_class_names()
    try:
        out_dim = int(model.output_shape[-1])
    except Exception:
        out_dim = len(names)
    if out_dim != len(names):
        print(
            f"[DISEASE] Warning: model output dim ({out_dim}) != "
            f"label count ({len(names)}) in {LABELS_PATH.name}"
        )
    _CLASS_NAMES = names
    return names


def _load_model() -> Any:
    """Load and cache the TensorFlow model."""
    global _MODEL
    if _MODEL is None:
        if tf is None:
            print("Warning: TensorFlow not installed. Disease detector will return error messages.")
            return None
        if not MODEL_PATH.exists():
            print(f"Warning: Model file not found at {MODEL_PATH}")
            return None
        try:
            _MODEL = tf.keras.models.load_model(str(MODEL_PATH))
        except Exception as e:
            print(f"Error loading model: {e}")
            return None
    if _MODEL is not None and _CLASS_NAMES is None:
        _ensure_labels_match_model(_MODEL)
    return _MODEL


def init_model():
    """Explicitly load the model to warm it up."""
    print("Preloading Disease Detection Model...")
    m = _load_model()
    if m is not None:
        _ensure_labels_match_model(m)
    print("Disease Detection Model loaded successfully.")


def _preprocess(image_path: str | os.PathLike) -> np.ndarray:
    """Resize and normalize the image for prediction."""
    with Image.open(image_path) as img:
        img = img.convert("RGB")
        img = img.resize((128, 128))
        arr = np.array(img, dtype=np.float32)
    return np.expand_dims(arr, axis=0)


def predict(image_path: str | os.PathLike) -> dict[str, Any]:
    """
    Run detection on the provided image path.

    Returns crop/disease derived from the model's argmax class, raw training
    label, confidence, severity, and a short description tied to that prediction.
    """
    model = _load_model()
    if model is None:
        return {
            "crop": "Error",
            "disease": "Disease detection service is currently unavailable (TensorFlow/Model missing).",
            "confidence": 0.0,
            "severity": "low",
            "raw_class_label": None,
            "class_index": None,
            "description": "Model could not be loaded.",
        }

    class_names = _CLASS_NAMES or _ensure_labels_match_model(model)
    processed = _preprocess(image_path)
    prediction = model.predict(processed, verbose=0)[0]
    class_idx = int(np.argmax(prediction))
    confidence = float(prediction[class_idx])

    if confidence < 0.25:
        return {
            "crop": "Unknown",
            "disease": "Low confidence",
            "confidence": confidence,
            "severity": "low",
            "raw_class_label": None,
            "class_index": class_idx,
            "description": (
                f"The model could not confidently classify this image "
                f"(top score {confidence * 100:.1f}% is below the 25% threshold). "
                "Try a clearer, closer photo of a single affected leaf."
            ),
        }

    if class_idx < 0 or class_idx >= len(class_names):
        return {
            "crop": "Error",
            "disease": "Class index out of range for label file",
            "confidence": confidence,
            "severity": "low",
            "raw_class_label": None,
            "class_index": class_idx,
            "description": f"Label file has {len(class_names)} entries; model returned index {class_idx}.",
        }

    label = class_names[class_idx]
    crop_raw, disease_raw = label.split("___", 1)
    crop = crop_raw.replace("_", " ").strip()
    disease = disease_raw.replace("_", " ").strip()
    is_healthy = disease_raw.lower() == "healthy" or label.lower().endswith("___healthy")

    if is_healthy:
        disease = "Healthy"
        severity = "low"
        description = (
            f"The classifier labels this sample as healthy {crop} "
            f"({confidence * 100:.1f}% confidence)."
        )
    elif confidence > 0.8:
        severity = "high"
        description = (
            f"Predicted class: {label.replace('___', ' › ').replace('_', ' ')} "
            f"({confidence * 100:.1f}% confidence)."
        )
    elif confidence > 0.5:
        severity = "medium"
        description = (
            f"Predicted class: {label.replace('___', ' › ').replace('_', ' ')} "
            f"({confidence * 100:.1f}% confidence)."
        )
    else:
        severity = "low"
        description = (
            f"Predicted class: {label.replace('___', ' › ').replace('_', ' ')} "
            f"({confidence * 100:.1f}% confidence); treat as tentative."
        )

    return {
        "crop": crop,
        "disease": disease,
        "confidence": confidence,
        "severity": severity,
        "raw_class_label": label,
        "class_index": class_idx,
        "description": description,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Detect plant disease from an image.")
    parser.add_argument("image", help="Path to the leaf image")
    args = parser.parse_args()

    result = predict(args.image)
    print(result)

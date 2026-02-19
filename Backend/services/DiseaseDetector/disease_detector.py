"""
Standalone disease detector helper.
Loads the trained TensorFlow model from `plant_disease_model.h5`
and exposes a simple `predict(image_path)` function that returns the
detected crop, disease and confidence score.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, Any

import numpy as np
try:
    import tensorflow as tf
except ImportError:
    tf = None
from PIL import Image

# Resolve paths relative to this file so the script works from anywhere.
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "plant_disease_model.h5"

# Class labels used during model training (must keep ordering intact).
CLASS_NAMES = [
    'Apple___Apple_scab',
    'Apple___Black_rot',
    'Apple___Cedar_apple_rust',
    'Apple___healthy',
    'Blueberry___healthy',
    'Cherry_(including_sour)___Powdery_mildew',
    'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
    'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight',
    'Corn_(maize)___healthy',
    'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot',
    'Peach___healthy',
    'Pepper,_bell___Bacterial_spot',
    'Pepper,_bell___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Raspberry___healthy',
    'Soybean___healthy',
    'Squash___Powdery_mildew',
    'Strawberry___Leaf_scorch',
    'Strawberry___healthy',
    'Tomato___Bacterial_spot',
    'Tomato___Early_blight',
    'Tomato___Late_blight',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite',
    'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
]

_MODEL: Any | None = None


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
    return _MODEL


def init_model():
    """Explicitly load the model to warm it up."""
    print("Preloading Disease Detection Model...")
    _load_model()
    print("Disease Detection Model loaded successfully.")


def _preprocess(image_path: str | os.PathLike) -> np.ndarray:
    """Resize and normalize the image for prediction."""
    with Image.open(image_path) as img:
        img = img.convert("RGB")
        img = img.resize((128, 128))
        arr = np.array(img, dtype=np.float32)
    return np.expand_dims(arr, axis=0)


def predict(image_path: str | os.PathLike) -> Dict[str, Any]:
    """
    Run detection on the provided image path.

    Returns a dict containing crop, disease, confidence and severity.
    """
    model = _load_model()
    if model is None:
        return {
            "crop": "Error",
            "disease": "Disease detection service is currently unavailable (TensorFlow/Model missing).",
            "confidence": 0.0,
            "severity": "low",
        }
    processed = _preprocess(image_path)
    prediction = model.predict(processed, verbose=0)[0]
    class_idx = int(np.argmax(prediction))
    confidence = float(prediction[class_idx])

    if confidence < 0.25:
        return {
            "crop": "Unknown",
            "disease": "Cannot detect disease. Please try another image.",
            "confidence": confidence,
            "severity": "low",
        }

    label = CLASS_NAMES[class_idx]
    crop_raw, disease_raw = label.split("___", 1)
    crop = crop_raw.replace("_", " ").strip()
    disease = disease_raw.replace("_", " ").strip()

    if "healthy" in disease.lower():
        disease = "Healthy leaf (no disease detected)"
        severity = "low"
    elif confidence > 0.8:
        severity = "high"
    elif confidence > 0.5:
        severity = "medium"
    else:
        severity = "low"

    return {
        "crop": crop,
        "disease": disease,
        "confidence": confidence,
        "severity": severity,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Detect plant disease from an image.")
    parser.add_argument("image", help="Path to the leaf image")
    args = parser.parse_args()

    result = predict(args.image)
    print(result)


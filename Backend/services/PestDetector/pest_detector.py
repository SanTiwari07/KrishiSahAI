"""
Pest Detection Module using YOLO
Detects agricultural pests from uploaded images
"""

import os
from pathlib import Path
import numpy as np
from PIL import Image
from ultralytics import YOLO

# Global model instance
_model = None
_classes = []

def load_classes():
    """Load pest class names from classes.txt"""
    global _classes
    classes_file = Path(__file__).parent / 'classes.txt'
    
    if not classes_file.exists():
        print(f"Warning: classes.txt not found at {classes_file}")
        return []
    
    with open(classes_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Parse the format: "1  rice leaf roller"
    classes = []
    for line in lines:
        line = line.strip()
        if line:
            # Split by whitespace and take everything after the first number
            parts = line.split(None, 1)
            if len(parts) >= 2:
                classes.append(parts[1].strip())
    
    _classes = classes
    print(f"Loaded {len(_classes)} pest classes")
    return _classes

def init_model():
    """Initialize the YOLO model"""
    global _model, _classes
    
    if _model is not None:
        return _model
    
    try:
        model_path = Path(__file__).parent / 'krishisahai_yolo_final.pt'
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        print(f"Loading YOLO pest detection model from {model_path}")
        
        # Use ultralytics YOLO for more robust loading
        _model = YOLO(str(model_path))
        
        # Load class names
        if not _classes:
            load_classes()
        
        print("Pest detection model loaded successfully")
        return _model
        
    except Exception as e:
        print(f"Error loading pest detection model: {e}")
        import traceback
        traceback.print_exc()
        raise

def predict(image_path):
    """
    Predict pest from image
    
    Args:
        image_path: Path to the image file
        
    Returns:
        dict with pest_name, confidence, and severity
    """
    global _model, _classes
    
    try:
        # Initialize model if needed
        if _model is None:
            init_model()
        
        # Load and process image
        img = Image.open(image_path)
        
        # Run inference
        results = _model(img, verbose=False)[0]
        
        # Get predictions
        if not results or len(results.boxes) == 0:
            return {
                'pest_name': 'No Pest Detected',
                'confidence': 0.0,
                'severity': 'none',
                'description': 'No pests were detected in the image.'
            }
        
        # Get the detection with highest confidence
        best_detection = results.boxes[0]
        class_id = int(best_detection.cls[0])
        confidence = float(best_detection.conf[0])
        
        # Map class ID to pest name
        if 0 <= class_id < len(_classes):
            pest_name = _classes[class_id]
        else:
            pest_name = f"Unknown Pest (Class {class_id})"
        
        # Determine severity based on confidence
        if confidence > 0.8:
            severity = 'high'
        elif confidence > 0.5:
            severity = 'medium'
        else:
            severity = 'low'
        
        return {
            'pest_name': pest_name,
            'confidence': confidence,
            'severity': severity,
            'description': f"Detected {pest_name} with {confidence*100:.1f}% confidence."
        }
        
    except Exception as e:
        print(f"Error during pest prediction: {e}")
        import traceback
        traceback.print_exc()
        return {
            'pest_name': 'Error',
            'confidence': 0.0,
            'severity': 'unknown',
            'description': f'Error during detection: {str(e)}'
        }

# Warm up the model on import
try:
    print("Initializing pest detection model...")
    init_model()
except Exception as e:
    print(f"Warning: Could not initialize pest detection model: {e}")

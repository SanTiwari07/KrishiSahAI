"""
Pest Detection Module using YOLOv5 (PyTorch Hub) with Custom Local Repository and Weights
"""

import os
import sys
from pathlib import Path
import torch
from PIL import Image

# Global model instance
_model = None

def init_model():
    """Initialize the YOLOv5 model using custom local repository and weights"""
    global _model
    
    if _model is not None:
        return _model
    
    try:
        # EXACT PATHS AS REQUESTED BY USER
        # Path to the best trained weights
        model_path = r'C:\Users\mridu\Downloads\Yolo-Pest-main\Yolo-Pest-main\runs\train\exp16\weights\best.pt'
        
        # Path to the custom YOLOv5 repository containing definitions for CAC3, CNeB, etc.
        local_yolo_repo = r'C:\Users\mridu\Downloads\Yolo-Pest-main\Yolo-Pest-main'
        
        # Validate paths
        if not os.path.exists(model_path):
            print(f"[CRITICAL ERROR] Model weights not found at: {model_path}")
            return None
            
        if not os.path.exists(local_yolo_repo):
            print(f"[CRITICAL ERROR] Local YOLOv5 repo not found at: {local_yolo_repo}")
            return None

        # --- ENVIRONMENT PATCHES START ---
        # These are necessary to make the local repo work in this Python environment
        
        # 1. Mock IPython (used by models/common.py but not needed for inference)
        try:
            import IPython
        except ImportError:
            from unittest.mock import MagicMock
            mock_ipython = MagicMock()
            mock_ipython.version_info = (8, 0, 0, '') # Tuple required for comparison
            sys.modules["IPython"] = mock_ipython
            sys.modules["IPython.display"] = MagicMock()
            # print("Mocked IPython for compatibility")

        # 2. Mock pkg_resources (used by utils/general.py for version checking)
        try:
            import pkg_resources
        except ImportError:
            class MockPkgResources:
                def parse_version(self, v):
                    return v # Return string for simple comparison
                def get_distribution(self, n):
                    return MagicMock() 
            sys.modules["pkg_resources"] = MockPkgResources()
            # print("Mocked pkg_resources for compatibility")

        # --- ENVIRONMENT PATCHES END ---

        # Insert local repo path at the front of sys.path so Python finds the custom models.common.py
        if local_yolo_repo not in sys.path:
            sys.path.insert(0, local_yolo_repo)
            
        print(f"Loading custom model from: {model_path}")
        print(f"Using repo source: {local_yolo_repo}")

        # Patch torch.load to set weights_only=False (PyTorch 2.6+ security fix breaks legacy weights)
        _original_load = torch.load
        def _unsafe_load(*args, **kwargs):
            if 'weights_only' not in kwargs:
                kwargs['weights_only'] = False
            return _original_load(*args, **kwargs)
            
        torch.load = _unsafe_load
        
        try:
            # Load custom YOLOv5 model using local source
            # trust_repo=True is required for loading from github/hub
            # force_reload=True ensures we use the code in local_yolo_repo, not cached standard repo
            _model = torch.hub.load(local_yolo_repo, 'custom', path=model_path, source='local', force_reload=True, trust_repo=True)
            print("Pest detection model loaded successfully")
        except AttributeError as e:
            if "Can't get attribute" in str(e):
                print(f"\n[CRITICAL ERROR] Incompatible Model Weights: {e}")
                _model = None
            else:
                raise e
        except Exception as e:
            print(f"Error during hub load: {e}")
            import traceback
            traceback.print_exc()
            _model = None
        finally:
            torch.load = _original_load # Restore original load
        
        return _model
        
    except Exception as e:
        print(f"Error initializing pest detection model: {e}")
        import traceback
        traceback.print_exc()
        return None

def predict(image_path):
    """
    Predict pest from image using YOLOv5
    
    Args:
        image_path: Path to the image file
        
    Returns:
        dict with pest_name, confidence, and severity
    """
    global _model
    
    try:
        # Initialize model if needed
        if _model is None:
            init_model()
            
        if _model is None:
            return {
                'pest_name': 'Service Unavailable',
                'confidence': 0.0,
                'severity': 'none',
                'description': 'Pest detection model failed to load. Please check server logs.'
            }
        
        # Load image
        try:
            img = Image.open(image_path)
        except Exception as e:
             return {
                'pest_name': 'Error',
                'confidence': 0.0,
                'severity': 'unknown',
                'description': f'Failed to open image: {str(e)}'
            }
        
        # Run inference
        results = _model(img)
        
        # Get predictions as pandas dataframe
        # xyxy[0] contains detections: xmin, ymin, xmax, ymax, confidence, class, name
        df = results.pandas().xyxy[0]
        
        # Check if any detections found
        if df.empty:
            return {
                'pest_name': 'No Pest Detected',
                'confidence': 0.0,
                'severity': 'none',
                'description': 'No pests were detected in the image.'
            }
        
        # Get detection with highest confidence
        df_sorted = df.sort_values('confidence', ascending=False)
        best_detection = df_sorted.iloc[0]
        
        pest_name = best_detection['name']
        confidence = float(best_detection['confidence'])
        
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

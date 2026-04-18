"""
Pest Detection Module using YOLOv5 (PyTorch Hub) with Custom Local Repository and Weights
"""

import sys
from pathlib import Path
import os
from PIL import Image

# Global model instance
_model = None


def init_model():
    """Initialize the YOLOv5 model using the local yolov5_custom repository."""
    global _model

    if _model is not None:
        return _model

    try:
        current_folder = Path(__file__).parent.resolve()
        model_path = current_folder / 'krishisahai_yolo_final.pt'
        local_yolo_repo = current_folder / 'yolov5_custom'

        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")

        if not local_yolo_repo.exists():
            raise FileNotFoundError(f"Missing custom YOLO architecture folder at: {local_yolo_repo}")

        # Add local repo to sys.path so Python finds custom modules
        if str(local_yolo_repo) not in sys.path:
            sys.path.insert(0, str(local_yolo_repo))

        # --- PATCH 1: Mock IPython if not installed (only needed for Jupyter display) ---
        try:
            import IPython  # noqa: F401
        except ImportError:
            from unittest.mock import MagicMock
            mock_ipython = MagicMock()
            mock_ipython.version_info = (8, 0, 0, '')
            sys.modules["IPython"] = mock_ipython
            sys.modules["IPython.display"] = MagicMock()
            sys.modules["IPython.core"] = MagicMock()
            sys.modules["IPython.core.pylabtools"] = MagicMock()

        # --- PATCH 2: Mock pkg_resources if not available (only used for version checks) ---
        try:
            import pkg_resources  # noqa: F401
        except ImportError:
            from unittest.mock import MagicMock
            class MockPkgResources:
                def parse_version(self, v): return v
                def get_distribution(self, n): return MagicMock()
                def require(self, r): return []
                def parse_requirements(self, r): return []
                VersionConflict = Exception
                DistributionNotFound = Exception
            mock_pkg = MockPkgResources()
            sys.modules["pkg_resources"] = mock_pkg

        import torch

        # --- PATCH 3: Force weights_only=False in torch.load (PyTorch 2.6+ breaking change) ---
        # YOLOv5 checkpoints embed numpy arrays which are not allowed under weights_only=True
        _original_load = torch.load
        def _permissive_load(*args, **kwargs):
            kwargs.setdefault('weights_only', False)
            return _original_load(*args, **kwargs)
        torch.load = _permissive_load

        print(f"Loading YOLO pest detection model from {model_path}")

        try:
            _model = torch.hub.load(
                str(local_yolo_repo),
                'custom',
                path=str(model_path),
                source='local',
                force_reload=False,
                verbose=False,
            )
            _model.eval()
            print("Pest detection model loaded successfully")
        except Exception as e:
            print(f"Error during hub load: {e}")
            import traceback
            traceback.print_exc()
            _model = None
        finally:
            torch.load = _original_load  # Always restore original torch.load

        return _model

    except Exception as e:
        print(f"Error initializing pest detection model: {e}")
        import traceback
        traceback.print_exc()
        return None


def predict(image_path):
    """
    Predict pest from image using YOLOv5.

    Args:
        image_path: Path to the image file

    Returns:
        dict with pest_name, confidence, and severity
    """
    global _model

    try:
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

        # Run inference — class names come from the trained weights / model.names only.
        results = _model(img)

        # Convert detections to DataFrame
        df = results.pandas().xyxy[0]  # columns: xmin, ymin, xmax, ymax, confidence, class, name

        names_map = getattr(_model, "names", None) or {}
        if not df.empty and names_map:
            def _resolve_row_name(row):
                cid = row.get("class")
                try:
                    cid_int = int(cid)
                except (TypeError, ValueError):
                    cid_int = None
                if cid_int is not None and cid_int in names_map:
                    return str(names_map[cid_int])
                n = row.get("name")
                return str(n) if n is not None else ""

            df = df.copy()
            df["name"] = df.apply(_resolve_row_name, axis=1)

        if df.empty:
            return {
                'pest_name': 'No Pest Detected',
                'confidence': 0.0,
                'severity': 'none',
                'description': 'No pests were detected in the image.'
            }

        # Get highest-confidence detection
        best = df.sort_values('confidence', ascending=False).iloc[0]
        pest_name = str(best['name']).strip() or "unknown_class"
        confidence = float(best['confidence'])
        try:
            class_id = int(best['class'])
        except (TypeError, ValueError):
            class_id = None

        if confidence > 0.8:
            severity = 'high'
        elif confidence > 0.5:
            severity = 'medium'
        else:
            severity = 'low'

        desc_parts = [
            f"Top YOLO detection: class “{pest_name}”",
            f"confidence {confidence * 100:.1f}%",
            f"severity {severity}",
        ]
        if class_id is not None:
            desc_parts.append(f"class_index={class_id}")
        try:
            x1, y1, x2, y2 = float(best['xmin']), float(best['ymin']), float(best['xmax']), float(best['ymax'])
            desc_parts.append(f"box=({x1:.0f},{y1:.0f})-({x2:.0f},{y2:.0f}) px")
        except (TypeError, ValueError, KeyError):
            pass

        return {
            'pest_name': pest_name,
            'confidence': confidence,
            'severity': severity,
            'class_id': class_id,
            'description': "; ".join(desc_parts) + ".",
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


# Optional warm-up on import.
# Default OFF to avoid startup crashes on low-memory environments.
if os.getenv("PEST_WARMUP_ON_BOOT", "false").lower() == "true":
    try:
        print("Initializing pest detection model...")
        init_model()
        print("Pest detection model initialized successfully")
    except Exception as e:
        print(f"Warning: Could not initialize pest detection model: {e}")

"""
Pest Detection Module using YOLOv5 (PyTorch Hub) with Custom Local Repository and Weights
"""

import sys
from pathlib import Path
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

        # Run inference
        results = _model(img)

        # Convert detections to DataFrame
        df = results.pandas().xyxy[0]  # columns: xmin, ymin, xmax, ymax, confidence, class, name

        ALLOWED_PESTS = {
            "rice leaf roller", "rice leaf caterpillar", "paddy stem maggot", "asiatic rice borer",
            "yellow rice borer", "rice gall midge", "rice stemfly", "brown plant hopper",
            "white backed plant hopper", "small brown plant hopper", "rice water weevil",
            "rice leafhopper", "grain spreader thrips", "grub", "mole cricket", "wireworm",
            "black cutworm", "large cutworm", "yellow cutworm", "red spider", "corn borer",
            "army worm", "aphids", "english grain aphid", "green bug", "bird cherry-oataphid",
            "wheat blossom midge", "longlegged spider mite", "wheat phloeothrips", "wheat sawfly",
            "beet fly", "flea beetle", "cabbage army worm", "beet army worm", "meadow moth",
            "beet weevil", "alfalfa weevil", "alfalfa plant bug", "tarnished plant bug",
            "locustoidea", "thrips", "viteus vitifoliae", "colomerus vitis",
            "polyphagotarsonemus latus", "pseudococcus comstocki kuwana", "panonchus citri mcgregor",
            "phyllocoptes oleiverus ashmead", "aleurocanthus spiniferus", "dacus dorsalis(hendel)",
            "prodenia litura", "phyllocnistis citrella stainton", "toxoptera citricidus",
            "toxoptera aurantii", "aphis citricola vander goot", "scirtothrips dorsalis hood",
            "mango flat beak leafhopper", "sternochetus frigidus"
        }

        # Filter for allowed pests using case-insensitive check
        if not df.empty:
            df = df[df['name'].str.lower().isin(ALLOWED_PESTS)]

        if df.empty:
            return {
                'pest_name': 'No Pest Detected',
                'confidence': 0.0,
                'severity': 'none',
                'description': 'No pests were detected in the image.'
            }

        # Get highest-confidence detection
        best = df.sort_values('confidence', ascending=False).iloc[0]
        pest_name = best['name']
        confidence = float(best['confidence'])

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
            'description': f"Detected {pest_name} with {confidence * 100:.1f}% confidence."
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
    print("Pest detection model initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize pest detection model: {e}")

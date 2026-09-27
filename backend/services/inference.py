import sys
import os
import numpy as np
import cv2
from typing import Optional

# Add the Deploy_AnemiaEyes module to path
_MODEL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models", "Deploy_AnemiaEyes", "deploy"
)
if _MODEL_DIR not in sys.path:
    sys.path.insert(0, _MODEL_DIR)

_eye_model_loaded = False
_nail_model_loaded = False


def load_eye_model() -> None:
    global _eye_model_loaded
    try:
        from inference import predict_from_image as _predict_fn
        _eye_model_loaded = True
        print(f"[AnemiaEyes] Model loaded from {_MODEL_DIR}")
    except Exception as e:
        print(f"[AnemiaEyes] Failed to load model: {e}")
        _eye_model_loaded = False


def load_nail_model() -> None:
    global _nail_model_loaded
    try:
        from services.nail import load_nail_model as _load_nail
        _nail_model_loaded = _load_nail()
    except Exception as e:
        print(f"[Nail] Failed to load nail model: {e}")
        _nail_model_loaded = False


def predict_eye(image_bytes: bytes, gender: str = "F") -> dict:
    if not _eye_model_loaded:
        return {"error": "Eye model not loaded"}

    try:
        from inference import predict_from_image

        buf = np.frombuffer(image_bytes, dtype=np.uint8)
        img_bgr = cv2.imdecode(buf, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return {"error": "Gambar tidak valid / ROI konjungtiva tidak terdeteksi"}

        result = predict_from_image(img_bgr, gender)
        return result

    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}


def predict_nail(image_bytes: bytes, gender: str = "F", nail_box=None) -> Optional[dict]:
    if not _nail_model_loaded:
        return None

    from services.nail import predict_nail as _predict_nail
    return _predict_nail(image_bytes, gender, nail_box=nail_box)

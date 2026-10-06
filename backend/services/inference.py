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

# Why loading failed, kept so /health can explain itself instead of leaving
# "Eye model not loaded" as the only clue. Surfacing the real cause matters most
# on serverless, where a missing env var or an unbundled weight file looks
# identical from the outside.
_eye_error: Optional[str] = None
_nail_error: Optional[str] = None

# Files that must be present for the eye path to work. Checked explicitly: the
# upstream import below can also fail for unrelated reasons (a missing
# TensorFlow, a broken joblib), and the operator needs to know which it was.
_EYE_REQUIRED_FILES = (
    os.path.join("outputs", "models", "model_pipeline.joblib"),
    os.path.join("outputs", "models", "mobilenet_extractor.joblib"),
    os.path.join("outputs", "models", "mobilenet_anemia.joblib"),
    "feature_extraction.py",
)


def _missing_eye_artifacts() -> list[str]:
    return [f for f in _EYE_REQUIRED_FILES if not os.path.exists(os.path.join(_MODEL_DIR, f))]


def load_eye_model() -> None:
    global _eye_model_loaded, _eye_error
    # Checked here as well as at startup: in mock mode the weights are never
    # touched, so this is the only place that notices a deployment missing the
    # model directory. Reporting it is what lets /health explain the failure
    # instead of every request saying "Eye model not loaded".
    missing = _missing_eye_artifacts()
    if missing:
        _eye_error = "missing model files: " + ", ".join(missing)
        _eye_model_loaded = False
        print(f"[AnemiaEyes] {_eye_error}")
        return
    try:
        import inference as _eye_inference  # noqa: F401
        from inference import predict_from_image as _predict_fn  # noqa: F401
        _eye_model_loaded = True
        _eye_error = None
        print(f"[AnemiaEyes] Model loaded from {_MODEL_DIR}")
    except Exception as e:
        _eye_error = f"{type(e).__name__}: {e}"
        _eye_model_loaded = False
        print(f"[AnemiaEyes] Failed to load model: {_eye_error}")


def load_nail_model() -> None:
    global _nail_model_loaded, _nail_error
    try:
        from services.nail import load_nail_model as _load_nail
        _nail_model_loaded = _load_nail()
        _nail_error = None if _nail_model_loaded else "worker did not start (see logs)"
    except Exception as e:
        _nail_model_loaded = False
        _nail_error = f"{type(e).__name__}: {e}"
        print(f"[Nail] Failed to load nail model: {_nail_error}")


def model_status() -> dict:
    """Snapshot of what is loaded, for the health endpoint and the frontend."""
    return {
        "eye_loaded": _eye_model_loaded,
        "eye_error": _eye_error,
        "eye_dir": _MODEL_DIR,
        "eye_dir_exists": os.path.isdir(_MODEL_DIR),
        "nail_loaded": _nail_model_loaded,
        "nail_error": _nail_error,
    }


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

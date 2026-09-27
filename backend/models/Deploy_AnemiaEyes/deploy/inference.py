"""
Real-Time Inference Module (Ridge + MobileNetV2 Info)
=====================================================
Turns a conjunctival eye image into a structured prediction dictionary
ready to be JSON-serialized.

Two models run independently:
  1. Ridge (tabular, on 13 manual color features)  -> predicts Hgb (regression) -> STATUS UTAMA
  2. MobileNetV2 (frozen ImageNet + LogisticRegression) -> predicts anemia prob -> INFO TAMBAHAN

Ridge is the authoritative source for status/decision.
CNN is displayed as supplementary reference only (no voting).

Backend usage (no web framework needed):
    from inference import predict_from_image
    result = predict_from_image(img_bgr, gender="F")

Dependencies: numpy, opencv-python, scikit-learn, joblib, tensorflow/keras
TensorFlow is imported lazily (only when the CNN path is used), so a
Ridge-only call stays lightweight.

Contract fields:
  hgb_predicted, status, status_ridge, status_cnn, confidence,
  threshold_used, margin_ke_threshold, gender, source, disclaimer, eye_heatmap
"""

import os
import base64
import joblib
import numpy as np
import cv2

from feature_extraction import extract_features_advanced_masking

# ---------------------------------------------------------------------------
# Load Ridge artifact (core, always required)
# ---------------------------------------------------------------------------
_ARTIFACT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "outputs", "models", "model_pipeline.joblib")

_ARTIFACT = joblib.load(_ARTIFACT_PATH)
MODEL = _ARTIFACT["pipeline"]
FEATURE_ORDER = list(_ARTIFACT["feature_order"])
THRESHOLDS = _ARTIFACT["thresholds"]  # {"female": 12.0, "male": 13.0}

DISCLAIMER = ("Hasil ini untuk skrining edukatif, bukan pengganti "
              "diagnosis medis")

# CNN artifact paths (lazy-loaded)
_CNN_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "outputs", "models")
_CNN_CLF_PATH = os.path.join(_CNN_DIR, "mobilenet_anemia.joblib")
_CNN_EXTRACTOR_PATH = os.path.join(_CNN_DIR, "mobilenet_extractor.joblib")

# CNN lazy-load cache
_cnn_cache = None


def _load_cnn():
    """Lazy-load CNN extractor + classifier. Returns None if unavailable or fails."""
    global _cnn_cache
    if _cnn_cache is not None:
        return _cnn_cache

    try:
        import tensorflow as tf
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

        art = joblib.load(_CNN_CLF_PATH)
        ext = joblib.load(_CNN_EXTRACTOR_PATH)
        _cnn_cache = {
            "preprocess_input": preprocess_input,
            "extractor": ext["model"],
            "scaler": art["scaler"],
            "classifier": art["classifier"],
            "img_size": int(art["img_size"]),
            "threshold": float(art["threshold"]),
            "cnn_ok": True,
        }
        return _cnn_cache
    except Exception:
        _cnn_cache = {"cnn_ok": False}
        return _cnn_cache


def _gender_info(gender):
    gender_str = str(gender).strip().upper()
    is_female = gender_str.startswith(("F", "P"))
    return is_female, ("Wanita" if is_female else "Pria")


def _predict_ridge(feats, is_female):
    """Ridge path: feature vector -> Hgb -> status."""
    try:
        x = np.array([[float(feats[k]) for k in FEATURE_ORDER
                       if k != "is_female"] + [1 if is_female else 0]],
                     dtype=np.float64)
    except KeyError as exc:
        return {"error": f"Fitur tidak lengkap dari ekstraksi: {exc}"}
    assert x.shape[1] == len(FEATURE_ORDER), "Feature-order mismatch!"

    hgb_pred = float(MODEL.predict(x)[0])
    threshold = THRESHOLDS["female"] if is_female else THRESHOLDS["male"]
    status = "Anemia" if hgb_pred < threshold else "Normal"
    return {
        "hgb_predicted": round(hgb_pred, 2),
        "status": status,
        "threshold_used": threshold,
        "margin_ke_threshold": round(hgb_pred - threshold, 2),
    }


def _predict_cnn(img_bgr):
    """CNN path: raw image -> MobileNetV2 features -> anemia probability."""
    cnn = _load_cnn()
    if not cnn.get("cnn_ok", False):
        return None

    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (cnn["img_size"], cnn["img_size"]))
    arr = np.expand_dims(img.astype(np.float32), axis=0)
    arr = cnn["preprocess_input"](arr)

    feat = cnn["extractor"].predict(arr, verbose=0).flatten().reshape(1, -1)
    feat_scaled = cnn["scaler"].transform(feat)
    prob = float(cnn["classifier"].predict_proba(feat_scaled)[0][1])
    status = "Anemia" if prob >= cnn["threshold"] else "Normal"
    return {"probability": prob, "status": status}


def _generate_heatmap(img_bgr):
    """Generate attention heatmap focused on conjunctiva tissue. Returns base64 PNG string."""
    try:
        heatmap_rgb, tissue_mask = extract_features_advanced_masking(
            img_bgr, return_masks=True)
        heatmap_bgr = cv2.cvtColor(heatmap_rgb, cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode('.png', heatmap_bgr)
        return base64.b64encode(buffer).decode('utf-8')
    except Exception:
        return None


def predict_from_image(img_bgr, gender):
    """
    Predict Hemoglobin + anemia status from a conjunctival image.

    Ridge is the authoritative source for the final status.
    CNN is displayed as supplementary reference only.

    Args:
        img_bgr (numpy.ndarray): BGR image (cv2.imread/decoded upload).
        gender (str): "F"/"Female"/"Perempuan" -> wanita; else pria.

    Returns:
        dict (JSON-serializable), or {"error": ...} on invalid image.
    """
    # 1) Guard invalid input
    if img_bgr is None or (isinstance(img_bgr, np.ndarray) and img_bgr.size == 0):
        return {"error": "Gambar tidak valid / ROI konjungtiva tidak terdeteksi"}

    # 2) Masking features for Ridge
    feats = extract_features_advanced_masking(img_bgr)
    if feats is None:
        return {"error": "Gambar tidak valid / ROI konjungtiva tidak terdeteksi"}

    is_female, gender_label = _gender_info(gender)

    # 3) Ridge path (authoritative)
    ridge = _predict_ridge(feats, is_female)
    if "error" in ridge:
        return ridge

    # 4) CNN path (supplementary, best-effort)
    cnn = _predict_cnn(img_bgr)
    cnn_ok = cnn is not None

    # 5) Confidence from Ridge only — bounded & honest. A base of 0.50 plus a
    #    margin term capped at 0.35 keeps the value clearly below 1.0: no model
    #    with this MSE band can ever be "100% sure" of its point estimate, and
    #    showing 100% would overclaim to users who may act on the result.
    margin_factor = min(abs(float(ridge["margin_ke_threshold"])) / 9.0, 0.35)
    confidence = round(min(0.50 + margin_factor, 0.85), 3)

    # 6) Generate heatmap
    eye_heatmap = _generate_heatmap(img_bgr)

    source = "ensemble_Ridge+MobileNetV2" if cnn_ok else "Ridge_only"

    output = {
        "hgb_predicted": ridge["hgb_predicted"],
        "status": ridge["status"],
        "status_ridge": ridge["status"],
        "threshold_used": ridge["threshold_used"],
        "margin_ke_threshold": ridge["margin_ke_threshold"],
        "gender": gender_label,
        "source": source,
        "confidence": confidence,
        "disclaimer": DISCLAIMER,
        "eye_heatmap": eye_heatmap,
    }
    if cnn_ok:
        output["status_cnn"] = cnn["status"]
        raw_prob = cnn["probability"]
        output["cnn_raw_probability"] = round(raw_prob, 3)
        # Cap extreme probabilities for display (LogisticRegression overconfident on small data)
        display_prob = round(min(max(raw_prob, 1 - raw_prob), 0.95), 3)
        output["cnn_probability"] = display_prob

    return output


if __name__ == "__main__":
    import json
    sample = ("/mnt/d/Downloads/ICONFEST/dataset anemia/India/1/"
              "20200118_164733_forniceal.png")
    img = cv2.imread(sample)
    if img is not None:
        print("[SELF-TEST] predict_from_image(img, 'F')\n")
        result = predict_from_image(img, "F")
        # Don't print the full heatmap base64
        display = {k: v for k, v in result.items() if k != "eye_heatmap"}
        display["eye_heatmap"] = "(base64, {} bytes)".format(
            len(result.get("eye_heatmap", "") or ""))
        print(json.dumps(display, indent=2))
    else:
        print("Sample image not found — self-test skipped.")

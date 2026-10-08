"""Standalone nail-prediction worker (runs inside .venv_nail).

Line-protocol on stdin/stdout:
    in :  {"type": "ping"}
    out:  {"type": "pong", "loaded": true}
    in :  {"type": "predict", "image_b64": "...", "gender": "F"}
    out:  prediction dict, or {"error": "..."}

Runs in the separate .venv_nail (mediapipe 0.10.21 + protobuf 4.x) so its
protobuf dependency never conflicts with TensorFlow in the main venv.
"""

from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path

import numpy as np

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_NAIL_DIR = _BACKEND_DIR / "models" / "Kuku-Anemia"
for _p in (str(_NAIL_DIR), str(_BACKEND_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from services.calibration import (  # noqa: E402
    NAIL_BIAS_G_DL,
    calibrate_nail,
)

NAIL_MODEL_MAE_G_DL = 1.359  # overridden from model metadata at load (CNN default)
NAIL_MODEL_R2 = 0.312        # overridden from model metadata at load (CNN default)
WHITE_SOURCE_LOCKED = "auto"  # ElasticNet: white reference; CNN: colornorm

_nail_model = None
_hand_landmarker = None
_seg_detector = None
_enhanced_scaler = None
_enhanced_model = None
_ainailsys_s1 = None
_ainailsys_s2 = None
_ainailsys_s1_meta = None
_ainailsys_s2_meta = None


def _load():
    global _nail_model, _hand_landmarker, _seg_detector
    global _enhanced_scaler, _enhanced_model
    global _ainailsys_s1, _ainailsys_s2, _ainailsys_s1_meta, _ainailsys_s2_meta
    global NAIL_MODEL_MAE_G_DL, NAIL_MODEL_R2, WHITE_SOURCE_LOCKED
    from core import config as cfg
    try:
        from core.hand_landmarks import HandLandmarkExtractor
    except Exception as _e:
        HandLandmarkExtractor = None
        print(f"[nail_worker] HandLandmarkExtractor import failed: {_e}", file=sys.stderr)
    from core.seg_detector import Yolo26SegDetector as _Yolo26SegDetector

    # Utama: CNN ResNet18 (ONNX) — pengganti ElasticNet sesuai domain sewa
    # (export_cnn_onnx.py). Fallback: ElasticNet seg_runtime bila ONNX tidak
    # ada / gagal load, supaya /predict tetap hidup.
    try:
        from core.cnn_inference import NailHbCnnModel

        _nail_model = NailHbCnnModel()
        NAIL_MODEL_MAE_G_DL = round(
            float(_nail_model.meta.get("per_patient_mae_g_dl")
                  or _nail_model.meta.get("test_mae_g_dl") or 1.359), 3)
        NAIL_MODEL_R2 = round(float(_nail_model.meta.get("test_r2", 0.312)), 3)
        WHITE_SOURCE_LOCKED = "auto"  # colornorm CNN menggantikan white reference
        # stdout dipakai protokol baris -> log ke stderr saja
        print(f"[nail_worker] CNN ONNX siap: {_nail_model.onnx_path.name} "
              f"MAE {NAIL_MODEL_MAE_G_DL} g/dL", file=sys.stderr, flush=True)
    except Exception as _cnn_exc:
        print(f"[nail_worker] CNN ONNX tidak bisa dimuat ({_cnn_exc}); "
              "fallback ke ElasticNet seg_runtime", file=sys.stderr, flush=True)
        from core.inference import NailHbModel

        # GitHub canonical runtime: NailHbModel() auto-resolves to
        # core/models/seg_runtime (seg26-mask features + white=auto) when present.
        _nail_model = NailHbModel()
        NAIL_MODEL_MAE_G_DL = round(float(_nail_model.meta.get("cv_mae_g_dl", 1.596)), 3)
        NAIL_MODEL_R2 = round(float(_nail_model.meta.get("cv_r2", 0.399)), 3)
        WHITE_SOURCE_LOCKED = _nail_model.meta.get("white_source", "auto")
    try:
        _hand_landmarker = HandLandmarkExtractor(num_hands=2) if HandLandmarkExtractor else None
    except Exception as _e:
        _hand_landmarker = None
        print(f"[nail_worker] HandLandmarkExtractor init failed: {_e}", file=sys.stderr)
    # YOLO26-seg detector: two-pass runtime (conf 0.30 @ 640 -> fallback 0.10 @ 1280),
    # per-pixel nail masks + layout skin box (2.3x nail width) = GitHub canonical.
    try:
        _seg_detector = _Yolo26SegDetector(
            device="cpu", conf=0.30, imgsz=640, fallback=True,
        )
    except Exception as _seg_exc:
        # seg26 (ultralytics/torch) is heavy and can crash on low-memory hosts.
        # Without it we still work via mediapipe-only / auto-plate detection.
        _seg_detector = None
        print(f"[nail_worker] seg26 detector unavailable ({_seg_exc}); "
              "using mediapipe/auto detection", file=sys.stderr)

    # Load enhanced model (with AINailSys feature) if available
    enhanced_dir = cfg.MODELS_DIR / "ainailsys_enhanced"
    if (enhanced_dir / "elasticnet_model.joblib").exists():
        import joblib as _jl
        _enhanced_scaler = _jl.load(enhanced_dir / "scaler.joblib")
        _enhanced_model = _jl.load(enhanced_dir / "elasticnet_model.joblib")

    # Load AINailSys ONNX models
    ainailsys_dir = _NAIL_DIR.parent / "AINailSys" / "models" / "deployment"
    s1_path = ainailsys_dir / "stage1_binary.onnx"
    s2_path = ainailsys_dir / "stage2_multiclass.onnx"
    if s1_path.exists() and s2_path.exists():
        try:
            import onnxruntime as _ort
            import json as _json
            _ainailsys_s1 = _ort.InferenceSession(str(s1_path))
            _ainailsys_s2 = _ort.InferenceSession(str(s2_path))
            with open(ainailsys_dir / "stage1_binary.json") as f:
                _ainailsys_s1_meta = _json.load(f)
            with open(ainailsys_dir / "stage2_multiclass.json") as f:
                _ainailsys_s2_meta = _json.load(f)
        except Exception:
            _ainailsys_s1 = _ainailsys_s2 = None


def _manual_finger(img_rgb, nail_box_norm):
    """Build a DetectedFinger from a user-drawn (normalized l,t,r,b) box.

    Nail box = the user's box. Skin box is derived direction-agnostically from
    skin-coloured pixels around the nail (so finger orientation does not matter).
    Returns (DetectedFinger, None) or (None, error_message).
    """
    import cv2
    from core.detectors import DetectedFinger

    h, w = img_rgb.shape[:2]
    parts = [float(v) for v in nail_box_norm]
    if len(parts) != 4:
        return None, "Format nail_box tidak valid."
    x0, y0, x1, y1 = parts
    l = int(round(x0 * w)); t = int(round(y0 * h))
    r = int(round(x1 * w)); b = int(round(y1 * h))
    l, t = max(0, l), max(0, t)
    r, b = min(w, r), min(h, b)
    pw, ph = r - l, b - t
    if pw < 25 or ph < 25:
        return None, "Area kuku terlalu kecil. Beri tanda ulang lebih besar pada kuku."

    # context region ~1.8x expanded around the nail
    ctx = (
        max(0, t - ph), max(0, l - pw),
        min(h, b + ph), min(w, r + pw),
    )
    crop = img_rgb[ctx[0]:ctx[2], ctx[1]:ctx[3]]
    if crop.size == 0:
        return None, "Area kuku berada di luar gambar."
    hsv = cv2.cvtColor(crop, cv2.COLOR_RGB2HSV)
    skin = cv2.inRange(hsv, (0, 40, 60), (35, 255, 255))
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
    n0 = (l - ctx[1], t - ctx[0], r - ctx[1], b - ctx[0])
    skin[n0[1]:n0[3], n0[0]:n0[2]] = 0  # exclude the nail itself
    ys, xs = np.where(skin > 0)
    if len(xs) < 30:
        return None, "Kotak kuku terlalu sempit — sertakan sedikit kulit di sekitar kuku lalu coba lagi."

    s_t, s_l = int(ys.min()) + ctx[0], int(xs.min()) + ctx[1]
    s_b, s_r = int(ys.max()) + ctx[0], int(xs.max()) + ctx[1]
    finger = DetectedFinger(
        finger_id=12,
        nail_box=[t, l, b, r],
        skin_box=[s_t, s_l, s_b, s_r],
        confidence=0.6,
        source="manual",
    )
    return finger, None


def _find_finger(img_rgb, nail_box=None):
    """Locate the nail region(s) for prediction, GitHub-canonical first.

    Priority:
      1. nail_box (user-drawn, normalized l,t,r,b)  -> source="manual"
      2. YOLO26-seg (canonical seg26 masking + direction) -> source="seg26"
      3. MediaPipe full hand                         -> source="mediapipe"
      4. automatic nail-plate detector (close-ups)   -> source="auto"
    Returns (items, middle, hand_score, source, error).
      items: list of (DetectedFinger, nail_mask|None, skin_mask|None);
             masks are full-frame uint8 1/0 for seg26 (feed the pixel-mask
             feature path that matches the seg_runtime model), else None
             (fall back to box-mask features);
      middle: single finger whose features drive the prediction.
    """
    from core.detectors import DetectedFinger
    from core.hand_landmarks import HandGeometry, derive_all_boxes
    from core.pipeline import select_middle_finger
    from core.seg_detector import nail_skin_masks

    h, w = img_rgb.shape[:2]

    # 1) Manual crop
    if nail_box:
        if isinstance(nail_box, str):
            try:
                parts = [float(v) for v in nail_box.replace(" ", "").split(",")]
            except ValueError:
                parts = []
            if len(parts) == 4 and all(np.isfinite(parts)) and all(0.0 <= p <= 1.0 for p in parts):
                finger, err = _manual_finger(img_rgb, parts)
            else:
                nail_box = None  # malformed: ignore and fall through to detection
        else:
            try:
                parts = [float(v) for v in nail_box]
            except (TypeError, ValueError):
                parts = []
            if len(parts) == 4 and all(np.isfinite(parts)) and all(0.0 <= p <= 1.0 for p in parts):
                finger, err = _manual_finger(img_rgb, parts)
            else:
                nail_box = None
        if nail_box is None:
            pass  # malformed box -> fall through to detection
        elif finger is None:
            return None, None, 0.0, "manual", err or "Area kuku tidak jelas pada foto. Tandai ulang kotak agar tepat mengelilingi kuku."
        else:
            return [(finger, None, None)], finger, 0.6, "manual", None

    # 2) YOLO26-seg (GitHub canonical): per-pixel nail mask + layout skin box
    #    (nail box shifted +2.3x nail width, same y-range -> MSU training layout).
    if _seg_detector is not None:
        try:
            result = _seg_detector.detect(img_rgb)
        except Exception:
            import traceback as _tb
            import sys as _sys
            print(f"[Kuku-Anemia] seg26 detect failed: {_tb.format_exc()}", file=_sys.stderr)
            result = None
        if result is not None and result.instances:
            fingers = result.as_detected_fingers()
            items = []
            for inst, f in zip(result.instances, fingers):
                nm, sm = nail_skin_masks(inst, h, w)
                items.append((f, nm, sm))
            middle = select_middle_finger(fingers) or fingers[0]
            hand_score = max(float(i.confidence) for i in result.instances)
            return items, middle, hand_score, "seg26", None

    # 3) MediaPipe full hand
    landmarks, hand_score = _hand_landmarker.detect_ranked(img_rgb)
    if landmarks is not None:
        nail_skin_boxes = derive_all_boxes(landmarks, w, h, HandGeometry())
        if nail_skin_boxes:
            fingers = [
                DetectedFinger(nsb.finger_id, nsb.nail_box, nsb.skin_box, hand_score, "mediapipe")
                for nsb in nail_skin_boxes
            ]
            ordered = sorted(fingers, key=lambda d: (d.nail_box[0] + d.nail_box[2]) / 2)
            middle = ordered[len(ordered) // 2]
            items = [(f, None, None) for f in ordered]
            return items, middle, hand_score, "mediapipe", None

    # 4) Automatic nail-plate detection (no full hand needed)
    finger = _auto_plate_finger(img_rgb)
    if finger is not None:
        return [(finger, None, None)], finger, 0.55, "auto", None

    return None, None, 0.0, "none", (
        "Tidak dapat mendeteksi jari pada foto ini. "
        "Coba: (1) pastikan seluruh tangan terlihat dalam frame, "
        "(2) pencahayaan merata tanpa bayangan kuat, "
        "(3) kuku menghadap ke kamera. "
        "Atau tandai area kuku secara manual pada foto."
    )


def _auto_plate_finger(img_rgb):
    """Locate a nail plate automatically on a close-up / any hand photo.

    Strategy (tuned on the Kuku-Anemia dataset): bright, low-saturation plates
    fully wrapped in skin (calibration cards / knuckles are NOT), square-ish,
    farthest from the hand centroid (the middle finger tip usually is longest).
    Returns a DetectedFinger (nail plate box + skin ring box) or None.
    """
    import cv2
    from core.detectors import DetectedFinger

    h, w = img_rgb.shape[:2]
    hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)

    skin = cv2.inRange(hsv, (0, 40, 60), (35, 255, 255))
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8), iterations=2)
    skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=3)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(skin, 8)
    if n <= 1:
        return None
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    blob = (labels == big).astype(np.uint8)
    ys, xs = np.where(blob > 0)
    cx, cy = float(xs.mean()), float(ys.mean())

    wht = cv2.bitwise_and(cv2.inRange(hsv, (0, 0, 130), (255, 65, 255)), blob)
    wht = cv2.morphologyEx(wht, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    cn, la, st, _ = cv2.connectedComponentsWithStats(wht, 8)

    cands = []
    for i in range(1, cn):
        x, y, ww, hh = st[i, cv2.CC_STAT_LEFT], st[i, cv2.CC_STAT_TOP], st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]
        a = ww * hh
        mx, my = int(w * 0.03), int(h * 0.03)
        if x < mx or y < my or x + ww > w - mx or y + hh > h - my:
            continue  # plate touching the image border is background, not a nail
        if not (600 < a < h * w * 0.05) or ww > 200 or hh > 200:
            continue  # nail-like size
        comp = (la == i).astype(np.uint8)
        dil = cv2.dilate(comp, np.ones((9, 9), np.uint8), 1)
        ring = dil - comp
        ring_skin = float((skin & ring).sum()) / max(1.0, float(ring.sum()))
        if ring_skin < 0.30:
            continue
        pcx, pcy = x + ww / 2.0, y + hh / 2.0
        d = float(np.hypot(pcx - cx, pcy - cy))
        ar = min(ww / max(1, hh), hh / max(1, ww))
        cands.append((x, y, ww, hh, d, ar))
    if not cands:
        return None

    sq_pool = [c for c in cands if c[5] >= 0.5]
    pool = sq_pool if sq_pool else cands
    x, y, ww, hh, _, _ = max(pool, key=lambda c: c[4])  # farthest square-ish plate

    t, l = y, x
    b, r = y + hh, x + ww
    pad = max(8, int(min(ww, hh) * 0.2))
    t, l = max(0, t - pad), max(0, l - pad)
    b, r = min(h, b + pad), min(w, r + pad)

    comp = (labels == big).astype(np.uint8)
    ring = cv2.dilate(comp, np.ones((25, 25), np.uint8), 1) - comp
    ctx = (max(0, t - hh), max(0, l - ww), min(h, b + hh), min(w, r + ww))
    crop = img_rgb[ctx[0]:ctx[2], ctx[1]:ctx[3]]
    if crop.size == 0:
        return None
    skin_c = cv2.inRange(cv2.cvtColor(crop, cv2.COLOR_RGB2HSV), (0, 40, 60), (35, 255, 255))
    n0 = (l - ctx[1], t - ctx[0], r - ctx[1], b - ctx[0])
    skin_c[n0[1]:n0[3], n0[0]:n0[2]] = 0
    ys2, xs2 = np.where(skin_c > 0)
    if len(xs2) < 30:
        b2 = min(h, b + pad)
        s_t, s_l, s_b, s_r = b, l, b2, r
        if s_b - s_t < 20:
            return None
    else:
        s_t, s_l = int(ys2.min()) + ctx[0], int(xs2.min()) + ctx[1]
        s_b, s_r = int(ys2.max()) + ctx[0], int(xs2.max()) + ctx[1]
    return DetectedFinger(12, [t, l, b, r], [s_t, s_l, s_b, s_r], 0.55, "auto")


def _predict(image_bytes: bytes, gender: str, nail_box=None):
    import cv2
    from core.categorize import categorize_hb

    img_bgr = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img_bgr is None:
        return {"error": "Gambar kuku tidak valid"}
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    items, middle, hand_score, det_source, err = _find_finger(img_rgb, nail_box)
    if middle is None or not items:
        return {"error": err}

    gender_str = (gender or "F").lower()
    results = []
    seg_mid_vector = None
    seg_mid_coverage = None
    n_instances = 0
    # CNN tidak punya vektor fitur 42-dim -> guard pakai coverage saja.
    is_cnn = not getattr(_nail_model, "feature_order", None)
    for f, nm, sm in items:
        tb, lb, bb, rb = f.nail_box
        if bb - tb < 25 or rb - lb < 25:
            continue  # too small to feed the model reliably
        n_instances += 1
        try:
            if nm is not None or sm is not None:
                # seg26 path: pixel masks feed segmented features (GitHub canonical).
                out = _nail_model.predict_masks(
                    img_rgb, f, nail_mask=nm, skin_mask=sm,
                    gender=gender_str, white_source=WHITE_SOURCE_LOCKED)
                if f is middle:
                    t, l, b, r = f.nail_box
                    if b > t and r > l:
                        seg_mid_coverage = float((nm[t:b, l:r] > 0).mean())
                    if not is_cnn:
                        seg_mid_vector = _nail_model.features_for_masks(
                            img_rgb, f, nail_mask=nm, skin_mask=sm,
                            white_source=WHITE_SOURCE_LOCKED)[0]
            else:
                out = _nail_model.predict(
                    img_rgb, f, gender=gender_str,
                    white_source=WHITE_SOURCE_LOCKED, use_mask=True)
            results.append(out)
        except ValueError:
            continue
    if not results:
        return {"error": (
            "Kuku terdeteksi tetapi terlalu kecil atau buram untuk dianalisis. "
            "Coba foto ulang dari jarak 15-20 cm dengan kuku menghadap kamera, "
            "atau tandai area kuku secara manual."
        )}

    # Drop individual fingers whose raw Hb is not physiologically plausible so
    # a single bad mask can't drag the median outside the 4-18 band.
    PLAUSIBLE_MIN, PLAUSIBLE_MAX = 3.0, 22.0
    all_hbs = sorted(float(r["estimated_hb_g_dl"]) for r in results)
    kept = [v for v in all_hbs if PLAUSIBLE_MIN <= v <= PLAUSIBLE_MAX]
    dropped = len(all_hbs) - len(kept)
    hbs = kept if kept else all_hbs
    hb_raw = float(np.median(hbs))  # robust across the plausible nails
    outlier_note = (f"{dropped} kuku di luar rentang wajar diabaikan" if dropped else None)

    # Reject entirely when the model is wildly out of range — no calibration
    # or clamping can make a raw output like -8 or +30 meaningful.
    _RAW_MIN, _RAW_MAX = 0.0, 25.0
    if hb_raw < _RAW_MIN or hb_raw > _RAW_MAX:
        return {
            "error": (
                f"Foto kuku ini menghasilkan estimasi di luar rentang wajar "
                f"({hb_raw:.1f} g/dL). Coba ambil ulang dengan pencahayaan "
                f"lebih baik dan pastikan area kuku terlihat jelas."
            )
        }

    hb_cal = calibrate_nail(hb_raw)
    hb_g_dl = hb_raw if hb_cal is None else hb_cal

    # Belt-and-suspenders: guarantee physiological range even if calibration
    # logic changes in the future.
    from services.calibration import HB_MIN_G_DL, HB_MAX_G_DL
    hb_g_dl = max(HB_MIN_G_DL, min(HB_MAX_G_DL, hb_g_dl))
    result = min(results, key=lambda r: abs(float(r["estimated_hb_g_dl"]) - hb_raw))
    threshold = result["threshold_g_dl"]
    # Confidence is intentionally bounded below 1.0. A model with a real
    # MAE of ~1.6 g/dL can never be "100% certain" of its estimate — showing
    # 100% (a) is dishonest and (b) erodes trust the moment the user tests it
    # against a real lab value. Keep confidence a mild, monotone function of
    # the margin to the WHO threshold, capped at 0.85. Cheap-holdout spread
    # ("spread == tiny -> +0.08") is removed: it is a stability proxy, not
    # evidence; inflating confidence on it overclaims.
    # Extreme values get a penalty: any estimate far outside the credible band
    # (hb < 9 / > 15, worse < 8 / > 16) is very likely a measurement artifact,
    # not a trustworthy reading — printing 85% on a nonsense 6.8 g/dL would
    # mislead the user. Penalty scales the margin-based confidence DOWN so a
    # bad value never looks more confident than a plausible one.
    margin = hb_g_dl - threshold
    margin_factor = min(abs(margin) / 5.0, 0.50)
    base_conf = min(NAIL_MODEL_R2 + margin_factor, 0.85)
    if hb_g_dl < 8.0 or hb_g_dl > 16.0:
        base_conf *= 0.5
    elif hb_g_dl < 9.0 or hb_g_dl > 15.0:
        base_conf *= 0.75
    confidence = round(base_conf, 3)

    flags_ok, issues = _guard_nail(
        img_rgb, middle, hb_raw, n_instances,
        seg_coverage=seg_mid_coverage, seg_vector=seg_mid_vector)
    # Peringatan lunak (fitur/Hb di luar band pelatihan) tidak lagi
    # ditampilkan ke pengguna: nail tetap ikut fusi (flags_ok True) tanpa
    # pesan apa pun. Hanya kegagalan keras (flags_ok False) yang
    # mempertahankan pesannya.
    if flags_ok:
        issues = ""
    if outlier_note:
        issues = (issues + "; " if issues else "") + outlier_note

    # AINailSys post-hoc adjustment: if the CNN classifier flags the nail as
    # anemic, subtract the learned coefficient from the Hb estimate (CNN maupun
    # fallback ElasticNet). The adjustment is GATED: it only fires when the
    # classifier is confident (prob >= AINAILSYS_CONF_MIN) AND the estimate is
    # already on the anemic side of the WHO threshold. A low-confidence
    # "anemic" call on an otherwise normal nail must not drag the estimate
    # below the eye.
    ainailsys_label = "unknown"
    ainailsys_stage2 = "N/A"
    ainailsys_confidence = 0.0
    AINAILSYS_ADJUSTMENT = 0.61  # |coefficient| from retraining
    AINAILSYS_CONF_MIN = 0.70

    if _ainailsys_s1 is not None:
        try:
            import cv2 as _cv2
            _MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 3, 1, 1)
            _STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 3, 1, 1)
            img_224 = _cv2.resize(img_rgb, (224, 224))
            tensor = img_224.astype(np.float32) / 255.0
            tensor = tensor.transpose(2, 0, 1)[np.newaxis, ...]
            tensor = (tensor - _MEAN) / _STD

            s1_out = _ainailsys_s1.run(None, {"input": tensor})[0]
            s1_exp = np.exp(s1_out[0] - s1_out[0].max())
            s1_probs = s1_exp / s1_exp.sum()
            s1_idx = int(s1_probs.argmax())
            ainailsys_label = _ainailsys_s1_meta["class_names"][s1_idx]
            ainailsys_confidence = float(s1_probs[s1_idx])

            if ainailsys_label == "anemic":
                apply_adjustment = (
                    ainailsys_confidence >= AINAILSYS_CONF_MIN
                    and hb_g_dl < threshold
                )
                if apply_adjustment:
                    hb_g_dl -= AINAILSYS_ADJUSTMENT
                    hb_g_dl = max(HB_MIN_G_DL, hb_g_dl)
                s2_out = _ainailsys_s2.run(None, {"input": tensor})[0]
                s2_exp = np.exp(s2_out[0] - s2_out[0].max())
                s2_probs = s2_exp / s2_exp.sum()
                s2_idx = int(s2_probs.argmax())
                ainailsys_stage2 = _ainailsys_s2_meta["class_names"][s2_idx]
        except Exception:
            pass  # gracefully degrade to unadjusted prediction

    from core.categorize import categorize_hb
    status = categorize_hb(hb_g_dl, gender_str)

    return {
        "estimated_hb": round(hb_g_dl, 1),
        "status": status,
        "threshold_used": threshold,
        "confidence": confidence,
        "mae": NAIL_MODEL_MAE_G_DL,
        "source": f"Kuku-Anemia_{det_source}+AINailSys",
        "model": result["model"],
        "gender": gender_str,
        "hand_confidence": round(hand_score, 3),
        "nail_count": len(hbs),
        "nail_hbs": [round(v, 2) for v in hbs],
        "bias_correction": NAIL_BIAS_G_DL,
        "flags_ok": flags_ok,
        "issues": issues,
        "nail_condition": ainailsys_label,
        "nail_condition_detail": ainailsys_stage2,
        "nail_condition_confidence": round(ainailsys_confidence, 4),
        "heatmap": _draw_box_overlay(img_rgb, items, middle),
    }


def _softened_guard(g):
    """flags_ok stays True on drift warnings, hard reject only on severe issues.

    Soft: features_out_of_range (MSU training range) and hb_out_of_range (the
    final value is already clamped to the physiological band + an eye-agreement
    net in routes.py). Hard: no nail detected / no prediction / bad mask
    coverage.
    """
    soft_prefixes = ("features_out_of_range", "hb_out_of_range")
    hard = [i for i in g.issues if not i.startswith(soft_prefixes)]
    if hard:
        return False, "; ".join(hard)
    soft = [i for i in g.issues if i.startswith(soft_prefixes)]
    if soft:
        return True, "peringatan: " + "; ".join(soft)
    return True, ""


def _guard_nail(img_rgb, middle, hb_raw, n_instances,
                seg_coverage=None, seg_vector=None):
    """Plausibility check for a nail prediction: Hb range + masking.

    seg26 path (GitHub canonical): core.guard.assess_hb against the seg-mask
    coverage of the nail box + the model feature vector + the training
    feature bounds (core/outputs/features_seg26_seg26_auto.csv). Hb/feature
    drift is softened (warning), coverage is hard.
    CNN path: tanpa vektor fitur 42-dim — guard hanya coverage + rentang Hb
    (bounds kosong -> check fitur trivially pass).
    Legacy paths (no pixel masks): best_nail_mask coverage within the box.
    """
    is_cnn = not getattr(_nail_model, "feature_order", None)
    if is_cnn and seg_coverage is not None:
        try:
            from core.guard import assess_hb
            g = assess_hb(seg_coverage, hb_raw, [], [], {},
                          n_instances=n_instances)
            return _softened_guard(g)
        except Exception:
            pass  # fall back to the box-mask guard below
    if seg_coverage is not None and seg_vector is not None:
        try:
            from core.guard import assess_hb, feature_bounds
            g = assess_hb(seg_coverage, hb_raw, seg_vector, _nail_model.feature_order,
                          feature_bounds(), n_instances=n_instances)
            return _softened_guard(g)
        except Exception:
            pass  # fall back to the box-mask guard below

    cov = None
    try:
        from core.masking import best_nail_mask
        from core.pipeline import crop_from_box
        crop = crop_from_box(img_rgb, middle.nail_box)
        m = best_nail_mask(crop, method="auto")
        cov = float((m > 0).mean()) if m is not None else None
    except Exception:
        cov = None
    try:
        from core.guard import assess_hb, feature_bounds
        # CNN: bounds fitur 42-dim tidak relevan -> pass {} (check trivial pass)
        bounds = {} if is_cnn else feature_bounds()
        g = assess_hb(cov, hb_raw, [], [], bounds, n_instances=n_instances)
        return _softened_guard(g)
    except Exception:
        from services.calibration import HB_MIN_G_DL, HB_MAX_G_DL
        ok = (n_instances > 0 and hb_raw is not None
              and HB_MIN_G_DL <= hb_raw <= HB_MAX_G_DL)
        return ok, "" if ok else "guard_fallback"


def _draw_box_overlay(img_rgb, items, middle):
    """GitHub run_seg_pipeline draw_overlay: nail mask fill + nail boxes only.

    All fingers: green mask fill (0,255,0) follows each nail's real shape
    (seg26) at 40% tint. Nail boxes green — brighter for the middle finger —
    with N{i} conf. No skin boxes / skin fill (avoids purple blend).
    Legacy detections without masks: boxes only. Returns PNG base64 (max 640).
    """
    import base64 as b64
    import cv2

    h, w = img_rgb.shape[:2]
    base = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    max_side = 640.0
    scale = 1.0
    if max(h, w) > max_side:
        scale = max_side / max(h, w)
        base = cv2.resize(base, (int(round(w * scale)), int(round(h * scale))),
                          interpolation=cv2.INTER_LINEAR)
    Hs, Ws = base.shape[:2]

    # Mask tint following each nail's real shape (all fingers, seg26 only)
    if any(nm is not None for _, nm, _ in items):
        overlay = np.zeros_like(base)
        for _, nm, _ in items:
            if nm is None:
                continue
            nm_s = cv2.resize((nm > 0).astype(np.uint8), (Ws, Hs),
                              interpolation=cv2.INTER_NEAREST)
            overlay[nm_s > 0] = (0, 255, 0)
        base = cv2.addWeighted(base, 0.85, overlay, 0.4, 0)

    def _rect(box):
        clipped = _clamp_box(box, h, w)
        if clipped is None:
            return None
        t, l, b, r = clipped
        return (int(l * scale), int(t * scale), int(r * scale), int(b * scale))

    for i, (f, _, _) in enumerate(items):
        nr = _rect(f.nail_box)
        if nr is None:
            continue
        is_mid = f is middle
        color = (0, 220, 0) if is_mid else (0, 120, 0)
        cv2.rectangle(base, (nr[0], nr[1]), (nr[2], nr[3]), color,
                      3 if is_mid else 2)
        cv2.putText(base, f"N{i + 1} {f.confidence:.2f}", (nr[0], max(nr[1] - 4, 14)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

    ok, buf = cv2.imencode(".png", base)
    if not ok:
        return None
    return b64.b64encode(buf.tobytes()).decode("ascii")


def _clamp_box(box, h, w):
    """Return clamped (t, l, b, r) or None when outside the image."""
    try:
        t, l, b, r = [int(v) for v in box]
    except (TypeError, ValueError):
        return None
    if b <= t or r <= l:
        return None
    if t >= h or l >= w or b < 0 or r < 0:
        return None
    return max(0, t), max(0, l), min(h, b), min(w, r)


def main():
    _load()
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            job = json.loads(line)
        except ValueError:
            sys.stdout.write(json.dumps({"error": "invalid job"}) + "\n")
            sys.stdout.flush()
            continue

        if job.get("type") == "ping":
            out = {"type": "pong", "loaded": True}
        elif job.get("type") == "predict":
            img_bytes = base64.b64decode(job.get("image_b64", ""))
            try:
                out = _predict(img_bytes, job.get("gender", "F"), job.get("nail_box"))
            except Exception as exc:  # never let the worker die
                import traceback as _tb
                with open(os.path.join(_NAIL_DIR.parent.parent, "nail_worker_crash.log"), "a") as fh:
                    fh.write("=== crash ===\n" + _tb.format_exc())
                out = {"error": "Gagal menganalisis foto kuku ini. Coba foto lain atau tandai area kuku pada foto."}
        else:
            out = {"error": f"unknown job type: {job.get('type')}"}

        sys.stdout.write(json.dumps(out) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
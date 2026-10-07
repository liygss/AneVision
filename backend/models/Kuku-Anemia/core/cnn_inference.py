"""Inferensi Hb kuku dengan CNN (ResNet18, ONNX) — pengganti ElasticNet.

Preprocess WAJIB identik dengan training/eval (experiments/hb_newdata/
c6_train_cnn_v2.py & c9_eval_msu_cnn.py):

    colornorm whitep98 -> Resize (edge kecil = 256, aspek terjaga, BILINEAR)
    -> CenterCrop 224 -> /255 -> ImageNet norm -> ResNet18 -> Hb (g/L)

Input jari: crop nail_box yang diperluas margin 1.6x (sama seperti
c4_build_crops.py). Output g/L dibagi 10 -> g/dL, lalu personalisasi
diterapkan persis seperti NailHbModel.

Artefak default: core/models/seg_runtime/cnn_hb_resnet18_v2.{onnx,json}
(ekspor: experiments/hb_newdata/export_cnn_onnx.py).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np

from core import config as cfg
from core.categorize import categorize_hb
from core.detectors import DetectedFinger
from core.personalize import Personalizer

ONNX_NAME = "cnn_hb_resnet18_v2.onnx"
JSON_NAME = "cnn_hb_resnet18_v2.json"
DEFAULT_DIR = cfg.MODELS_DIR / "seg_runtime"

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

# model empty feature order -> worker memakai guard coverage saja
FEATURE_ORDER: list[str] = []


def _model_paths() -> tuple[Path, Path]:
    """Resolusi artefak CNN.

    Prioritas:
      1. env ANEVIA_HB_CNN_DIR (berisi cnn_hb_resnet18_v2.onnx)
      2. core/models/seg_runtime bila ada
    """
    env_dir = os.environ.get("ANEVIA_HB_CNN_DIR")
    if env_dir:
        d = Path(env_dir)
        return d / ONNX_NAME, d / JSON_NAME
    return DEFAULT_DIR / ONNX_NAME, DEFAULT_DIR / JSON_NAME


def expand_box(box, img_h: int, img_w: int, margin: float = 1.6):
    """Perluas nail_box [t,l,b,r] dengan faktor `margin` (c4_build_crops)."""
    t, l, b, r = [float(x) for x in box]
    cy, cx = (t + b) / 2.0, (l + r) / 2.0
    h, w = max(b - t, 20.0), max(r - l, 20.0)
    nh, nw = h * margin, w * margin
    t2 = max(0, int(cy - nh / 2.0)); b2 = min(img_h, int(cy + nh / 2.0))
    l2 = max(0, int(cx - nw / 2.0)); r2 = min(img_w, int(cx + nw / 2.0))
    return t2, l2, b2, r2


class ColorNormalize:
    """Koreksi warna per-gambar — identik dgn training (whitep98/grayworld)."""

    def __init__(self, mode: str):
        self.mode = mode

    def __call__(self, img):
        from PIL import Image

        if self.mode == "none":
            return img
        arr = np.asarray(img).astype(np.float32)
        if self.mode == "whitep98":
            refs = np.array([np.percentile(arr[..., c], 98) for c in range(3)])
            if float(refs.min()) < 80.0:      # tidak ada referensi terang -> biarkan
                return img
        else:  # grayworld
            refs = np.clip(np.array([arr[..., c].mean() for c in range(3)]), 30.0, None)
        out = np.clip(arr / refs[None, None, :] * 255.0, 0, 255)
        return Image.fromarray(out.astype(np.uint8))


def preprocess(img_rgb: np.ndarray, colornorm: str = "whitep98") -> np.ndarray:
    """RGB uint8 HWC -> CHW float32 (1,3,224,224) normalisasi ImageNet."""
    from PIL import Image

    img = Image.fromarray(np.ascontiguousarray(img_rgb))
    if colornorm and colornorm != "none":
        img = ColorNormalize(colornorm)(img)
    # torchvision Resize(int): sisi kecil -> 256, aspek terjaga, BILINEAR
    w, h = img.size
    if w < h:
        nw, nh = 256, int(round(h * 256 / w))
    else:
        nw, nh = int(round(w * 256 / h)), 256
    img = img.resize((nw, nh), Image.BILINEAR)
    # CenterCrop 224 (torchvision semantics: pad bila salah satu sisi < 224)
    left = (nw - 224) // 2
    top = (nh - 224) // 2
    if left < 0 or top < 0:
        canvas = Image.new("RGB", (max(nw, 224), max(nh, 224)), (0, 0, 0))
        canvas.paste(img, ((canvas.width - nw) // 2, (canvas.height - nh) // 2))
        left = (canvas.width - 224) // 2
        top = (canvas.height - 224) // 2
        img = canvas
    img = img.crop((left, top, left + 224, top + 224))

    arr = np.asarray(img).astype(np.float32) / 255.0
    arr = arr.transpose(2, 0, 1)  # HWC -> CHW
    mean = np.asarray(IMAGENET_MEAN, dtype=np.float32).reshape(3, 1, 1)
    std = np.asarray(IMAGENET_STD, dtype=np.float32).reshape(3, 1, 1)
    arr = (arr - mean) / std
    return arr[np.newaxis, ...]


class NailHbCnnModel:
    """Drop-in pengganti NailHbModel (CNN ONNX, output g/dL)."""

    def __init__(self, model_path: Path | None = None, meta_path: Path | None = None,
                 personalizer: Personalizer | None = None,
                 profile_path: Path | None = None):
        import onnxruntime as ort

        if model_path is None or meta_path is None:
            model_path, meta_path = _model_paths()
        if not Path(model_path).exists():
            raise FileNotFoundError(f"CNN ONNX tidak ada: {model_path}")

        self.onnx_path = Path(model_path)
        self.session = ort.InferenceSession(
            str(self.onnx_path), providers=["CPUExecutionProvider"])
        self.meta = json.loads(Path(meta_path).read_text())
        # guard fitur 42-dimensi tidak berlaku untuk CNN
        self.feature_order: list[str] = list(FEATURE_ORDER)
        self.colornorm = self.meta.get("colornorm", "whitep98")
        self.use_tta = bool(self.meta.get("tta", False))
        self.margin = float(self.meta.get("crop_margin", 1.6))

        if personalizer is not None:
            self.personalizer = personalizer
        elif profile_path is not None and Path(profile_path).exists():
            self.personalizer = Personalizer.load(profile_path)
        else:
            self.personalizer = Personalizer()
        self._last_raw_g_dl: float | None = None

    # ------------------------------------------------------------------ core
    def _predict_gperl(self, img_rgb: np.ndarray, boxes: DetectedFinger) -> float:
        """Crop jari -> CNN -> Hb dalam g/L."""
        h, w = img_rgb.shape[:2]
        t, l, b, r = expand_box(boxes.nail_box, h, w, self.margin)
        if b - t < 8 or r - l < 8:
            raise ValueError("crop kuku terlalu kecil untuk CNN")
        crop = img_rgb[t:b, l:r]
        if crop.size == 0:
            raise ValueError("crop kuku kosong")

        x = preprocess(crop, self.colornorm)
        out = self.session.run(None, {"input": x})[0]
        pred = float(np.asarray(out).reshape(-1)[0])
        if self.use_tta:
            out_f = self.session.run(None, {"input": x[..., ::-1].copy()})[0]
            pred = 0.5 * (pred + float(np.asarray(out_f).reshape(-1)[0]))
        return pred

    # -------------------------------------------------------- API (parity)
    def features_for(self, img_rgb, boxes, white_source="fixed",
                     use_mask=True) -> np.ndarray:
        return np.zeros((1, 0), dtype=float)

    def features_for_masks(self, img_rgb, boxes, nail_mask=None, skin_mask=None,
                           white_source="fixed") -> np.ndarray:
        return np.zeros((1, 0), dtype=float)

    def predict(self, img_rgb: np.ndarray, boxes: DetectedFinger,
                gender: str = "female", white_source: str = "fixed",
                use_mask: bool = True) -> dict:
        hb_gperl = self._predict_gperl(img_rgb, boxes)
        return self._finish(hb_gperl / 10.0, gender)

    def predict_masks(self, img_rgb: np.ndarray, boxes: DetectedFinger,
                      nail_mask: np.ndarray | None = None,
                      skin_mask: np.ndarray | None = None,
                      gender: str = "female", white_source: str = "fixed") -> dict:
        hb_gperl = self._predict_gperl(img_rgb, boxes)
        return self._finish(hb_gperl / 10.0, gender)

    # ----------------------------------------------------------- hasil/WHo
    def _finish(self, raw_g_dl: float, gender: str) -> dict:
        self._last_raw_g_dl = raw_g_dl
        hb_g_dl = self.personalizer.apply(raw_g_dl)
        wrapped = self._wrap_result(hb_g_dl, hb_g_dl * 10.0, gender)
        wrapped["raw_hb_g_dl"] = round(raw_g_dl, 2)
        wrapped["personalized"] = self.personalizer.is_calibrated
        wrapped["calibration_points"] = self.personalizer.n_points
        return wrapped

    def calibrate(self, actual_g_dl: float, raw_g_dl: float | None = None) -> dict:
        raw = raw_g_dl if raw_g_dl is not None else self._last_raw_g_dl
        if raw is None:
            raise ValueError("Belum ada prediksi mentah: melakukan predict() dulu "
                             "atau berikan raw_g_dl secara eksplisit.")
        self.personalizer.add(raw, actual_g_dl)
        return self.personalizer.to_dict()

    def _wrap_result(self, hb_g_dl: float, hb_gperL: float, gender: str) -> dict:
        female_like = gender not in ("male", "pria", "laki-laki", "laki", "m", "man")
        mae = self.meta.get("per_patient_mae_g_dl") or self.meta.get("test_mae_g_dl")
        return {
            "estimated_hb_g_dl": round(hb_g_dl, 2),
            "estimated_hb_gperL": round(hb_gperL, 1),
            "gender": gender,
            "category": categorize_hb(hb_g_dl, gender),
            "threshold_g_dl": self.meta.get("who_threshold_female_g_dl", 12.0)
            if female_like else self.meta.get("who_threshold_male_g_dl", 13.0),
            "model": self.meta.get("model", "CNN ResNet18 v2 (ONNX) -> Hb regresi"),
            "cv_mae_g_dl": mae,
            "unit": "g/dL",
        }

#!/usr/bin/env python3
"""Regresi content guard mata: close-up konjungtiva asli tidak boleh ditolak.

Bug yang dijaga di sini: foto close-up kelopak mata bawah / konjungtiva (yang
memang diminta aplikasi) punya ~0 piksel "kulit" hangat karena jaringan
konjungtiva itu merah, dan tidak ada iris untuk dideteksi Haar. Dulu guard
menuntut kulit ATAU mata terdeteksi, sehingga foto mata asli yang agak buram,
redup, atau di-zoom ditolak dengan "bukan foto mata". Sekarang merah konjungtiva
dihitung sebagai jaringan tubuh, sementara bingkai netral/berwarna tetap ditolak.

Gaya plain-script (sama seperti tests/test_fusion.py): jalankan langsung.

    python tests/test_content_guard.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from services.content_guard import check_eye_image  # noqa: E402

_failures: list[str] = []


def check(name: str, cond: bool) -> None:
    print(f"  [{'OK' if cond else 'FAIL'}] {name}")
    if not cond:
        _failures.append(name)


def _conjunctiva_macro() -> np.ndarray:
    """A synthetic red/pink textured frame: conjunctiva-like, no iris, no skin.

    A dark strip stands in for eyelashes/shadow so the mask does not cover the
    whole frame (a real macro never does; covering ~100% trips MAX_TISSUE).
    """
    rng = np.random.default_rng(0)
    h = w = 300
    base = np.array([110, 130, 225], dtype=np.float32)  # BGR, pink/red
    img = np.clip(base + rng.normal(0, 22, (h, w, 3)), 0, 255).astype(np.uint8)
    yy, xx = np.mgrid[0:h, 0:w]
    img[..., 1] = np.clip(
        img[..., 1].astype(np.float32) + 10 * np.sin(xx / 30), 0, 255
    ).astype(np.uint8)
    n = int(h * 0.3)
    img[:n] = np.clip(rng.normal(20, 10, (n, w, 3)), 0, 255).astype(np.uint8)
    return img


def _gray_noise() -> np.ndarray:
    rng = np.random.default_rng(0)
    return np.clip(120 + rng.normal(0, 25, (300, 300, 3)), 0, 255).astype(np.uint8)


def _blue_noise() -> np.ndarray:
    rng = np.random.default_rng(0)
    base = np.array([220, 120, 60], dtype=np.float32)  # BGR, blue
    return np.clip(base + rng.normal(0, 20, (300, 300, 3)), 0, 255).astype(np.uint8)


def _flat_red() -> np.ndarray:
    flat = np.zeros((300, 300, 3), np.uint8)
    flat[:] = (60, 60, 220)
    return flat


def test_real_conjunctiva_macro_accepted() -> None:
    img = _conjunctiva_macro()
    check("close-up konjungtiva diterima", check_eye_image(img) is None)


def test_blur_and_dim_still_accepted() -> None:
    img = _conjunctiva_macro()
    for k in (5, 15, 31):
        blurred = cv2.GaussianBlur(img, (k, k), 0)
        check(f"close-up buram k={k} diterima", check_eye_image(blurred) is None)
    dark = (img.astype(np.float32) * 0.5).astype(np.uint8)
    check("close-up redup diterima", check_eye_image(dark) is None)
    small = cv2.resize(img, None, fx=0.35, fy=0.35, interpolation=cv2.INTER_AREA)
    check("close-up resolusi rendah diterima", check_eye_image(small) is None)


def test_non_eye_rejected() -> None:
    check("noise abu-abu ditolak", check_eye_image(_gray_noise()) is not None)
    check("noise biru ditolak", check_eye_image(_blue_noise()) is not None)
    check("isi merah rata ditolak", check_eye_image(_flat_red()) is not None)
    doc = np.full((300, 300, 3), 250, np.uint8)
    cv2.line(doc, (20, 20), (280, 280), (180, 180, 180), 2)
    check("dokumen putih ditolak", check_eye_image(doc) is not None)


def main() -> int:
    print("=" * 60)
    print("TEST content guard mata")
    print("=" * 60)
    test_real_conjunctiva_macro_accepted()
    test_blur_and_dim_still_accepted()
    test_non_eye_rejected()
    print("=" * 60)
    if _failures:
        print(f"FAILED ({len(_failures)}): " + ", ".join(_failures))
        return 1
    print("ALL OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

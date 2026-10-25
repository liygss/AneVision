#!/usr/bin/env python3
"""Diagnosa model mata: jalankan fitur + Ridge + CNN pada sebuah foto.

Dipakai untuk menjawab "kenapa foto ini keluar 15.1 / tidak kebaca anemia".
Menampilkan:
  - fitur warna yang diekstrak (masking konjungtiva)
  - cakupan mask (% piksel gambar yang dipakai) -> mendeteksi *fallback*:
    kalau cakupannya besar (mendekati seluruh gambar), berarti ROI konjungtiva
    TIDAK terdeteksi dan fitur diambil dari kulit/background, sehingga
    prediksi jadi tidak berarti.
  - Hb & status Ridge (penentu), plus CNN (referensi)

Contoh:
    python scripts/diagnose_eye.py /path/foto.jpg
    python scripts/diagnose_eye.py /path/foto.jpg --gender M
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

BACKEND = Path(__file__).resolve().parent.parent
DEPLOY = BACKEND / "models" / "Deploy_AnemiaEyes" / "deploy"
sys.path.insert(0, str(DEPLOY))

from feature_extraction import extract_features_advanced_masking  # noqa: E402
import inference as eye  # noqa: E402


def diagnose(path: Path, gender: str) -> None:
    img = cv2.imread(str(path))
    if img is None:
        print(f"  ! tidak bisa membaca gambar: {path}")
        return
    h, w = img.shape[:2]
    feats = extract_features_advanced_masking(img)
    if feats is None:
        print(f"  ! gambar ditolak (terlalu sedikit piksel valid)")
        return

    n = int(feats["n_valid_px"])
    cov = 100.0 * n / (h * w)
    print(f"  ukuran       : {w}x{h}")
    print(f"  cakupan mask : {n} px ({cov:.1f}% gambar)")
    if cov > 70:
        print("  -> WARNING: mask hampir menutupi seluruh gambar.")
        print("     Kemungkinan ROI konjungtiva TIDAK terdeteksi (fallback ke")
        print("     kulit/background) -> prediksi Hb tidak dapat dipercaya.")
    print("  fitur:")
    for k in ("mean_R", "mean_G", "mean_B", "mean_L", "mean_a", "mean_b",
              "mean_S", "mean_V", "std_a", "std_b", "std_S"):
        print(f"    {k:8s} = {float(feats[k]):.3f}")

    res = eye.predict_from_image(img, gender)
    if "error" in res:
        print(f"  ! inferensi gagal: {res['error']}")
        return
    print(f"  Ridge  : Hb={res.get('hgb_predicted')} g/dL "
          f"status={res.get('status_ridge')} "
          f"ambang={res.get('threshold_used')} (gender={res.get('gender')})")
    print(f"  CNN    : status={res.get('status_cnn')} "
          f"raw_prob={res.get('cnn_raw_probability')}")
    print(f"  confidence: {res.get('confidence')}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Diagnosa model mata")
    ap.add_argument("image", type=Path, nargs="*", help="path gambar")
    ap.add_argument("--gender", default="M", help="F atau M (default M)")
    args = ap.parse_args()
    if not args.image:
        ap.error("butuh path gambar")
    for p in args.image:
        print("=" * 70)
        print(f"FOTO: {p}  (gender={args.gender})")
        diagnose(p, args.gender)
    return 0


if __name__ == "__main__":
    sys.exit(main())

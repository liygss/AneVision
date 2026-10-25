#!/usr/bin/env python3
"""Sanity tests untuk fusion mata+kuku, kalibrasi, dan harness evaluasinya.

Gaya plain-script (sama seperti tests/ di Kuku-Anemia): jalankan langsung,
cetak OK/FAIL, keluar dengan kode != 0 bila ada kegagalan.

    python tests/test_fusion.py
"""

from __future__ import annotations

import csv
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from services.calibration import (  # noqa: E402
    DISAGREE_G_DL,
    clamp_hb,
    models_disagree,
    reconcile_nail,
)
from services.fusion import combine_predictions  # noqa: E402
import eval_fusion  # noqa: E402

_failures: list[str] = []


def check(name: str, cond: bool) -> None:
    print(f"  [{'OK' if cond else 'FAIL'}] {name}")
    if not cond:
        _failures.append(name)


def test_weights() -> None:
    print("combine_predictions:")
    r = combine_predictions(10.0, 12.0, eye_mae=1.0, nail_mae=3.0)
    check("bobot jumlah = 1", abs(r.eye_weight + r.nail_weight - 1.0) < 1e-6)
    check("model MAE kecil dapat bobot lebih besar", r.eye_weight > r.nail_weight)
    check("estimasi di antara kedua prediksi", 10.0 <= r.estimated_hb <= 12.0)

    r_eq = combine_predictions(11.0, 13.0, eye_mae=2.0, nail_mae=2.0)
    check("MAE sama -> bobot 0.5/0.5",
          abs(r_eq.eye_weight - 0.5) < 1e-9 and abs(r_eq.nail_weight - 0.5) < 1e-9)

    r_same = combine_predictions(11.5, 11.5, eye_mae=1.3, nail_mae=2.6)
    check("prediksi identik -> hasil = nilai itu",
          abs(r_same.estimated_hb - 11.5) < 1e-9)
    check("prediksi identik -> tidak disagree", r_same.disagree is False)


def test_disagree() -> None:
    print("disagreement & kalibrasi:")
    r_far = combine_predictions(9.0, 15.0)
    check("selisih > tol -> disagree", r_far.disagree is True)
    r_close = combine_predictions(11.0, 11.5)
    check("selisih <= tol -> tidak disagree", r_close.disagree is False)
    check("tol = DISAGREE_G_DL",
          models_disagree(10.0, 10.0 + DISAGREE_G_DL + 0.1) is True)
    check("None -> tidak disagree", models_disagree(None, 12.0) is False)

    check("clamp bawah", clamp_hb(1.0) == 4.0)
    check("clamp atas", clamp_hb(25.0) == 18.0)
    check("clamp NaN -> None", clamp_hb(float("nan")) is None)
    check("clamp None -> None", clamp_hb(None) is None)


def test_reconcile() -> None:
    print("reconcile_nail (kuku menyesuaikan mata):")
    # di dalam toleransi -> apa adanya
    check("selisih 0.5 -> passthrough", reconcile_nail(11.0, 11.5) == 11.0)
    check("selisih tepat 2 -> passthrough", reconcile_nail(13.0, 11.0) == 13.0)
    # di luar toleransi -> ditarik ke +-2 dari mata
    check("mata 16, kuku 9 -> 14 (16-2)", reconcile_nail(9.0, 16.0) == 14.0)
    check("mata 16, kuku 20 -> 18 (16+2)", reconcile_nail(20.0, 16.0) == 18.0)
    check("clamp = DISAGREE_G_DL",
          reconcile_nail(16.0 - DISAGREE_G_DL - 3.0, 16.0) == 16.0 - DISAGREE_G_DL)
    # None aman
    check("kuku None -> None", reconcile_nail(None, 16.0) is None)
    check("mata None -> kuku apa adanya", reconcile_nail(9.0, None) == 9.0)


def test_eval_harness() -> None:
    print("eval_fusion harness:")
    rng = np.random.RandomState(7)
    n = 300
    y = rng.uniform(6.0, 16.0, n)
    eye = y + rng.normal(0, 1.3, n)
    nail = y + rng.normal(0, 2.6, n)
    rows = [
        {"pid": str(i), "eye": float(eye[i]), "nail": float(nail[i]),
         "true": float(y[i]), "gender": "F" if i % 2 else "M"}
        for i in range(n)
    ]
    rep = eval_fusion.evaluate(rows, 1.296, 2.647, bootstrap=200)
    for key in ("eye_only", "nail_only", "simple_average",
                "weighted_fusion", "weighted_fusion_opt"):
        check(f"strategi {key} ada", key in rep["strategies"])
    w = rep["strategies"]["weighted_fusion"]
    check("weighted MAE < model terburuk (nail)",
          w["mae"] < rep["strategies"]["nail_only"]["mae"])
    check("MAE CI95 punya 2 batas", len(w["mae_ci95"]) == 2 and w["mae_ci95"][0] <= w["mae_ci95"][1])
    check("metrik klasifikasi ada (gender lengkap)",
          "classification" in w and w["classification"]["confusion_matrix"][0][0] >= 0)
    check("summary punya verdict", "weighted_improves_over_best_single" in rep["summary"])


def test_loader() -> None:
    print("load_pairs:")
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "pairs.csv"
        with p.open("w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["patient_id", "eye_hb", "nail_hb", "hb_true", "gender"])
            w.writerow(["a", "11.0", "12.0", "11.5", "F"])
            w.writerow(["b", "9.0", "10.0", "9.5", "M"])
        rows = eval_fusion.load_pairs(p)
        check("baris terbaca", len(rows) == 2)
        check("alias kolom & nilai benar", rows[0]["eye"] == 11.0 and rows[0]["gender"] == "F")

        with p.open("w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["eye_hb", "nail_hb"])
            w.writerow(["11.0", "12.0"])
        try:
            eval_fusion.load_pairs(p)
            check("kolom kurang -> error", False)
        except ValueError:
            check("kolom kurang -> error", True)


def main() -> int:
    print("=" * 60)
    print("TEST fusion / calibration / eval harness")
    print("=" * 60)
    test_weights()
    test_disagree()
    test_reconcile()
    test_eval_harness()
    test_loader()
    print("=" * 60)
    if _failures:
        print(f"FAILED ({len(_failures)}): " + ", ".join(_failures))
        return 1
    print("ALL OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

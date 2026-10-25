#!/usr/bin/env python3
"""Validasi error FUSION mata + kuku terhadap Hb lab (weighted late fusion).

Konteks
-------
`services/fusion.py` menggabungkan estimasi Hb mata & kuku dengan bobot
inverse-MAE. Bobot MAE-nya adalah konstanta hasil pengukuran per-model, TETAPI
belum pernah divalidasi pada pasien multimodal (foto mata + foto kuku + Hb lab
dari orang yang sama). Script ini menutup gap itu: menerima tabel per-pasien,
menghitung metrik error tiap strategi fusion, dan menulis laporan JSON.

Strategi yang dibandingkan (semua pada himpunan pasien yang SAMA):
    eye_only          hanya model mata
    nail_only         hanya model kuku
    simple_average    rata-rata 50:50
    weighted_fusion   inverse-MAE (memakai combine_predictions produksi)
    weighted_fusion_opt  bobot di-grid di himpunan ini (OPTIMISTIS, referensi)

Metrik: MAE, RMSE, R^2, Pearson, BIAS + limits of agreement (Bland-Altman),
CI 95% bootstrap untuk MAE, dan (opsional) metrik klasifikasi ambang WHO.

Format input (CSV, satu baris per pasien):
    patient_id, eye_hb, nail_hb, hb_true[, gender]
    - eye_hb   : estimasi Hb model mata (g/dL)
    - nail_hb  : estimasi Hb model kuku (g/dL)
    - hb_true  : Hb lab (g/dL) -- ground truth
    - gender   : opsional (F/M) untuk metrik klasifikasi (wanita 12.0, pria 13.0)

Alias kolom yang diterima:
    eye_hb   : eye_hb, eye, eye_hgb, hgb_eye
    nail_hb  : nail_hb, nail, nail_hgb, hgb_nail
    hb_true  : hb_true, hb, hb_lab, HB_LEVEL_GperL, ground_truth
    gender   : gender, sex

Protokol anti-leakage (WAJIB)
-----------------------------
    * Bobot MAE diambil dari data VALIDASI, bukan test.
    * eye_hb/nail_hb harus out-of-fold (prediksi yang tidak melihat hb_true
      baris ini). Jangan pakai prediksi in-sample.
    * Jalankan evaluasi akhir pada data TEST yang tidak dipakai memilih bobot.

Contoh
------
    python scripts/eval_fusion.py --input pairs_test.csv --out report.json
    python scripts/eval_fusion.py --input pairs_val.csv --eye-mae 1.30 --nail-mae 2.65
    python scripts/eval_fusion.py --selftest        # verifikasi pipeline (data sintetis)
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from services.calibration import DISAGREE_G_DL  # noqa: E402
from services.fusion import (  # noqa: E402
    EYE_MAE_G_DL,
    NAIL_MAE_G_DL,
    combine_predictions,
)

# Ambang anemia WHO (g/dL) sesuai MODEL_CONTRACT.
WHO_CUTOFF_FEMALE = 12.0
WHO_CUTOFF_MALE = 13.0

_ALIASES = {
    "eye": ("eye_hb", "eye", "eye_hgb", "hgb_eye", "eye_estimated_hb"),
    "nail": ("nail_hb", "nail", "nail_hgb", "hgb_nail", "nail_estimated_hb"),
    "true": ("hb_true", "hb", "hb_lab", "hb_level_gperl", "ground_truth"),
    "gender": ("gender", "sex"),
    "pid": ("patient_id", "patient_uuid", "pid", "id"),
}


def _pick(row: dict[str, str], key: str) -> str | None:
    for name in _ALIASES[key]:
        for col, value in row.items():
            if col is None:
                continue
            if col.strip().lower() == name:
                return value
    return None


def load_pairs(path: Path) -> list[dict]:
    """Baca CSV -> list baris tervalidasi {pid, eye, nail, true, gender}."""
    rows: list[dict] = []
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames is None:
            raise ValueError("CSV kosong / tidak punya header")
        for i, raw in enumerate(reader, start=2):
            eye = _pick(raw, "eye")
            nail = _pick(raw, "nail")
            true = _pick(raw, "true")
            if eye in (None, "") or nail in (None, "") or true in (None, ""):
                raise ValueError(
                    f"baris {i}: butuh kolom eye_hb, nail_hb, hb_true (lengkap)"
                )
            gender = (_pick(raw, "gender") or "").strip().upper()[:1]
            rows.append({
                "pid": (_pick(raw, "pid") or str(i - 1)).strip(),
                "eye": float(eye),
                "nail": float(nail),
                "true": float(true),
                "gender": gender if gender in ("F", "M") else "",
            })
    if len(rows) < 2:
        raise ValueError("butuh minimal 2 pasien untuk menghitung error")
    return rows


def reg_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """MAE/RMSE/R2/Pearson + bias & limits of agreement (Bland-Altman)."""
    diff = y_pred - y_true
    ss_res = float(np.sum(diff ** 2))
    ss_tot = float(np.sum((y_true - y_true.mean()) ** 2))
    sd = float(np.std(diff, ddof=1)) if len(diff) > 1 else 0.0
    bias = float(np.mean(diff))
    pearson = (
        float(np.corrcoef(y_true, y_pred)[0, 1])
        if np.std(y_true) > 0 and np.std(y_pred) > 0
        else float("nan")
    )
    return {
        "mae": float(np.mean(np.abs(diff))),
        "rmse": float(np.sqrt(np.mean(diff ** 2))),
        "r2": float(1.0 - ss_res / ss_tot) if ss_tot > 0 else float("nan"),
        "pearson": pearson,
        "bias": bias,
        "loa_lo": bias - 1.96 * sd,
        "loa_hi": bias + 1.96 * sd,
    }


def bootstrap_mae_ci(y_true: np.ndarray, y_pred: np.ndarray,
                     n: int = 2000, seed: int = 42) -> tuple[float, float]:
    """CI 95% bootstrap (persentil) untuk MAE."""
    rng = np.random.RandomState(seed)
    size = len(y_true)
    abs_err = np.abs(y_pred - y_true)
    draws = np.array([
        float(np.mean(abs_err[rng.randint(0, size, size)])) for _ in range(n)
    ])
    return float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))


def classification_metrics(y_true: np.ndarray, y_pred: np.ndarray,
                           cutoffs: np.ndarray) -> dict:
    """Metrik klasifikasi anemia pada ambang per-baris (pred & true < cutoff)."""
    pred_pos = y_pred < cutoffs
    true_pos = y_true < cutoffs
    tp = int(np.sum(pred_pos & true_pos))
    fp = int(np.sum(pred_pos & ~true_pos))
    fn = int(np.sum(~pred_pos & true_pos))
    tn = int(np.sum(~pred_pos & ~true_pos))
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    acc = (tp + tn) / len(y_true)
    return {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "confusion_matrix": [[tn, fp], [fn, tp]],
    }


def _cutoffs(rows: list[dict]) -> np.ndarray | None:
    if not all(r["gender"] in ("F", "M") for r in rows):
        return None
    return np.array([
        WHO_CUTOFF_FEMALE if r["gender"] == "F" else WHO_CUTOFF_MALE
        for r in rows
    ])


def _grid_weighted(y_true: np.ndarray, y_eye: np.ndarray, y_nail: np.ndarray):
    """Bobot mata di-grid 0..1 (langkah 0.05) meminimalkan MAE himpunan ini."""
    best_w, best_mae = 0.5, np.inf
    for w in np.arange(0.0, 1.0001, 0.05):
        mae = float(np.mean(np.abs((w * y_eye + (1 - w) * y_nail) - y_true)))
        if mae < best_mae:
            best_w, best_mae = float(w), mae
    return best_w, best_mae


def evaluate(rows: list[dict], eye_mae: float, nail_mae: float,
             bootstrap: int = 2000) -> dict:
    y = np.array([r["true"] for r in rows], dtype=float)
    y_eye = np.array([r["eye"] for r in rows], dtype=float)
    y_nail = np.array([r["nail"] for r in rows], dtype=float)

    weighted = np.array([
        combine_predictions(e, n, eye_mae=eye_mae, nail_mae=nail_mae).estimated_hb
        for e, n in zip(y_eye, y_nail)
    ])
    strategies = {
        "eye_only": y_eye,
        "nail_only": y_nail,
        "simple_average": (y_eye + y_nail) / 2.0,
        "weighted_fusion": weighted,
    }
    best_w, best_mae = _grid_weighted(y, y_eye, y_nail)
    strategies["weighted_fusion_opt"] = best_w * y_eye + (1 - best_w) * y_nail

    cutoffs = _cutoffs(rows)
    out: dict = {
        "n": len(rows),
        "eye_mae_weight": eye_mae,
        "nail_mae_weight": nail_mae,
        "disagree_tol_g_dl": DISAGREE_G_DL,
        "generated_by": "scripts/eval_fusion.py",
        "strategies": {},
    }
    for name, pred in strategies.items():
        m = reg_metrics(y, pred)
        m["mae_ci95"] = list(bootstrap_mae_ci(y, pred, n=bootstrap))
        if cutoffs is not None:
            m["classification"] = classification_metrics(y, pred, cutoffs)
        out["strategies"][name] = m

    single_best = min(
        out["strategies"]["eye_only"]["mae"],
        out["strategies"]["nail_only"]["mae"],
    )
    out["summary"] = {
        "best_single_mae": single_best,
        "best_single_model": (
            "eye_only"
            if out["strategies"]["eye_only"]["mae"] <= out["strategies"]["nail_only"]["mae"]
            else "nail_only"
        ),
        "weighted_mae": out["strategies"]["weighted_fusion"]["mae"],
        "weighted_improves_over_best_single": bool(
            out["strategies"]["weighted_fusion"]["mae"] < single_best
        ),
        "weighted_delta_vs_best_single": round(
            single_best - out["strategies"]["weighted_fusion"]["mae"], 4
        ),
        "optimized_eye_weight_insample": round(best_w, 2),
        "note_optimized": (
            "weighted_fusion_opt memakai bobot yang di-tuning di himpunan ini "
            "(in-sample) -> optimistis; jangan dilaporkan sebagai hasil test."
        ),
    }
    return out


def print_report(rep: dict) -> None:
    print("=" * 78)
    print(f"FUSION EVALUATION  n={rep['n']}  "
          f"(eye_mae={rep['eye_mae_weight']}, nail_mae={rep['nail_mae_weight']})")
    print("=" * 78)
    header = f"{'strategi':<22}{'MAE':>7}{'RMSE':>8}{'R2':>8}{'Pear':>8}{'BIAS':>8}"
    print(header)
    print("-" * len(header))
    for name, m in rep["strategies"].items():
        print(f"{name:<22}{m['mae']:>7.3f}{m['rmse']:>8.3f}"
              f"{m['r2']:>8.3f}{m['pearson']:>8.3f}{m['bias']:>+8.3f}")
    s = rep["summary"]
    print("-" * len(header))
    print(f"best single: {s['best_single_model']} (MAE {s['best_single_mae']:.3f})")
    verdict = "MEMBAIK" if s["weighted_improves_over_best_single"] else "TIDAK membaik"
    print(f"weighted fusion vs best single: {verdict} "
          f"(delta MAE {s['weighted_delta_vs_best_single']:+.3f})")
    if "classification" in rep["strategies"]["weighted_fusion"]:
        c = rep["strategies"]["weighted_fusion"]["classification"]
        print(f"klasifikasi (WHO) weighted: acc {c['accuracy']:.3f} "
              f"prec {c['precision']:.3f} rec {c['recall']:.3f} f1 {c['f1']:.3f}")


def _selftest() -> int:
    """Verifikasi pipeline pada data sintetis yang deterministik."""
    rng = np.random.RandomState(7)
    n = 300
    y = rng.uniform(6.0, 16.0, n)
    eye = y + rng.normal(0, 1.3, n)     # model "mata" lebih akurat
    nail = y + rng.normal(0, 2.6, n)    # model "kuku" lebih berisik
    rows = [
        {"pid": str(i), "eye": float(eye[i]), "nail": float(nail[i]),
         "true": float(y[i]), "gender": "F" if i % 2 else "M"}
        for i in range(n)
    ]
    rep = evaluate(rows, EYE_MAE_G_DL, NAIL_MAE_G_DL, bootstrap=300)
    print_report(rep)
    ok = True
    for key in ("weighted_fusion", "simple_average", "eye_only"):
        if key not in rep["strategies"]:
            print(f"FAIL: strategi {key} tidak ada")
            ok = False
    if "classification" not in rep["strategies"]["weighted_fusion"]:
        print("FAIL: metrik klasifikasi (gender lengkap) tidak ada")
        ok = False
    print("SELFTEST:", "OK" if ok else "FAIL")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Evaluasi error fusion mata+kuku")
    ap.add_argument("--input", type=Path, help="CSV per-pasien (lihat docstring)")
    ap.add_argument("--out", type=Path, help="path laporan JSON (default: di samping input)")
    ap.add_argument("--eye-mae", type=float, default=EYE_MAE_G_DL,
                    help=f"MAE validasi model mata (default {EYE_MAE_G_DL})")
    ap.add_argument("--nail-mae", type=float, default=NAIL_MAE_G_DL,
                    help=f"MAE validasi model kuku (default {NAIL_MAE_G_DL})")
    ap.add_argument("--bootstrap", type=int, default=2000,
                    help="jumlah resample bootstrap untuk CI MAE (default 2000)")
    ap.add_argument("--selftest", action="store_true",
                    help="jalankan verifikasi pipeline pada data sintetis")
    args = ap.parse_args()

    if args.selftest:
        return _selftest()
    if args.input is None:
        ap.error("butuh --input <csv> atau --selftest")

    rows = load_pairs(args.input)
    rep = evaluate(rows, args.eye_mae, args.nail_mae, bootstrap=args.bootstrap)
    print_report(rep)

    out_path = args.out or args.input.with_name("fusion_evaluation.json")
    out_path.write_text(json.dumps(rep, indent=2), encoding="utf-8")
    print(f"\nlaporan JSON -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

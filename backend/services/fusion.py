"""
Weighted Late Fusion based on validation MAE.

Formula from docs/Anevia_Fusion_Calculation.md:
  w_eye = (1/MAE_eye) / ((1/MAE_eye) + (1/MAE_nail))
  w_nail = (1/MAE_nail) / ((1/MAE_eye) + (1/MAE_nail))
  Hb_final = w_eye * Hb_eye + w_nail * Hb_nail

MAE values (from MODEL_CONTRACT.md + model metadata):
  Eye  (Ridge)      MAE = 1.296 g/dL
  Nail (CNN v2 ONNX) MAE = 2.647 g/dL

Untuk pembobotan fusi dipakai MAE lintas-domain kuku pada foto free-bg
(gaya MSU): eksperimen C8/C9 (hb_newdata) mengukur CNN v2 di MSU-250 =
26,47 g/L = 2,647 g/dL.  MAE in-domain sewa (1,359 g/dL per pasien) tetap
tampil di badge kartu kuku, tetapi tidak dipakai di sini karena foto
aplikasi berada di domain free-bg, bukan domain kertas putih sewa.
"""

from dataclasses import dataclass

from services.calibration import DISAGREE_G_DL, models_disagree

EYE_MAE_G_DL = 1.296
NAIL_MAE_G_DL = 2.647


@dataclass
class FusionResult:
    estimated_hb: float
    eye_weight: float
    nail_weight: float
    eye_mae: float
    nail_mae: float
    disagree: bool = False


def combine_predictions(eye_hb: float, nail_hb: float,
                        eye_mae: float = EYE_MAE_G_DL,
                        nail_mae: float = NAIL_MAE_G_DL) -> FusionResult:
    """Weighted fusion of eye + nail Hb estimates by inverse MAE.

    ``disagree`` is True when the two estimates differ by more than
    ``DISAGREE_G_DL`` (g/dL); the caller can surface a "confirm with lab" warning.
    """
    raw_eye = 1.0 / eye_mae
    raw_nail = 1.0 / nail_mae
    total = raw_eye + raw_nail

    w_eye = raw_eye / total
    w_nail = raw_nail / total

    final_hb = eye_hb * w_eye + nail_hb * w_nail

    return FusionResult(
        estimated_hb=round(final_hb, 1),
        eye_weight=round(w_eye, 3),
        nail_weight=round(w_nail, 3),
        eye_mae=eye_mae,
        nail_mae=nail_mae,
        disagree=models_disagree(eye_hb, nail_hb, DISAGREE_G_DL),
    )

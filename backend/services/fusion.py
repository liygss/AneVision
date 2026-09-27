"""
Weighted Late Fusion based on validation MAE.

Formula from docs/Anevia_Fusion_Calculation.md:
  w_eye = (1/MAE_eye) / ((1/MAE_eye) + (1/MAE_nail))
  w_nail = (1/MAE_nail) / ((1/MAE_eye) + (1/MAE_nail))
  Hb_final = w_eye * Hb_eye + w_nail * Hb_nail

MAE values (from MODEL_CONTRACT.md + model_metadata.json):
  Eye  (Ridge)      MAE = 1.296 g/dL
  Nail (ElasticNet)  MAE = 1.599 g/dL
"""

from dataclasses import dataclass

from services.calibration import DISAGREE_G_DL, models_disagree

EYE_MAE_G_DL = 1.296
NAIL_MAE_G_DL = 1.599


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

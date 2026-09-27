"""Shared Hb calibration & sanity helpers for the eye and nail models.

Both models output Hb in g/dL (the eye Ridge directly, the nail model after
its g/L -> g/dL conversion). This module is the single place where the two
outputs are put on the same scale so the fusion stays consistent:

  * physiological clamp to [4, 18] g/dL,
  * per-model bias correction measured on the runtime path,
  * an agreement test used to warn when eye and nail disagree.

Bias constants
--------------
Measured empirically through the backend runtime nail path (``_manual_finger``
+ ``white_source="auto"``) on the 250-photo MSU set, comparing predictions with
the lab Hb:

    canonical model   : mean(pred - lab) = -0.812 g/dL  (MAE 2.005)
    seg_runtime model : mean(pred - lab) = -1.393 g/dL  (MAE 2.265)

The runtime loads ``core/models/seg_runtime`` (``NailHbModel()`` auto-resolves
to it, and the worker pulls MAE/R² from its metadata), so ``NAIL_BIAS_G_DL``
uses the seg_runtime value (-1.393). A positive bias means the model
under-predicts, so the correction adds it back.

The eye Ridge (MODEL_CONTRACT, MAE 1.296 g/dL) is already centered on the
physiological range, so its correction is 0. Update the constants below when a
new validation run is available.
"""

from __future__ import annotations

from typing import Optional

# physiological Hb band (g/dL)
HB_MIN_G_DL = 4.0
HB_MAX_G_DL = 18.0

# mean(prediction - lab) on the runtime path; correction = value - bias
# seg_runtime model is what the runtime actually loads (see bias doc above).
NAIL_BIAS_G_DL = -1.393
EYE_BIAS_G_DL = 0.0

# |eye - nail| above this (g/dL) is flagged as a disagreement
DISAGREE_G_DL = 2.0


def clamp_hb(value: Optional[float],
             lo: float = HB_MIN_G_DL,
             hi: float = HB_MAX_G_DL) -> Optional[float]:
    """Clamp an Hb estimate to the physiological band."""
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v != v:  # NaN
        return None
    return max(lo, min(hi, v))


def calibrate_nail(value: Optional[float]) -> Optional[float]:
    """Center a nail Hb estimate: remove the measured bias, then clamp."""
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v != v:  # NaN
        return None
    return clamp_hb(v - NAIL_BIAS_G_DL)


def calibrate_eye(value: Optional[float]) -> Optional[float]:
    """Center an eye Hb estimate: remove the measured bias, then clamp."""
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v != v:  # NaN
        return None
    return clamp_hb(v - EYE_BIAS_G_DL)


def models_disagree(eye_hb: Optional[float],
                    nail_hb: Optional[float],
                    tol: float = DISAGREE_G_DL) -> bool:
    """True when the two modality estimates differ by more than ``tol``."""
    if eye_hb is None or nail_hb is None:
        return False
    try:
        return abs(float(eye_hb) - float(nail_hb)) > tol
    except (TypeError, ValueError):
        return False

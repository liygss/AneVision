"""Content guard: reject uploads that are not an eye or a hand/nail photo.

Pure OpenCV/numpy heuristics — no extra dependency and no extra model. The
goal is to stop obviously wrong input (documents, screenshots, landscapes,
logos, near-black frames) from producing a confident-looking Hb estimate. It
is a sanity filter, not a classifier: a photo that merely looks skin-like can
still pass, which is acceptable because the downstream detectors (conjunctiva
mask for the eye, YOLO/MediaPipe for the hand) remain the authority.

Every rejection message is written for the end user in Indonesian because it
is rendered verbatim in the UI.
"""

import os
import sys

import cv2
import numpy as np

# feature_extraction lives inside the vendored eye repo; inference.py adds the
# same directory to sys.path, but the guard must also work when imported
# first (routes validates content before any model import happens).
_MODEL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models", "Deploy_AnemiaEyes", "deploy",
)
if _MODEL_DIR not in sys.path:
    sys.path.insert(0, _MODEL_DIR)

MIN_SIDE_PX = 100
# A photo of a page/screen is dominated by near-white pixels with almost no
# saturation; a real eye/nail photo never looks like that.
WHITE_BG_FRACTION = 0.60
MEAN_SATURATION_DOC = 15
MEAN_VALUE_DARK = 25
# Conjunctiva tissue share of the frame for a valid close-up: some red tissue
# must exist (a pale/anemic conjunctiva yields a small mask, so the floor is
# deliberately low). The ceiling is only a backstop against a literal
# solid-fill frame — a tight macro of the conjunctiva can legitimately cover
# ~95% of the shot, and rejecting those would reject real users.
MIN_TISSUE_FRACTION = 0.005
MAX_TISSUE_FRACTION = 0.99
# Solid fills (a colored wall, a card, a screenshot block) have no texture:
# their grayscale std-dev is ~0 while any real photo sits far above this.
FLAT_MIN_GRAY_STD = 10.0
# Skin-toned pixels are a cheap prior for both slots (eyelid skin for the eye
# slot, the hand for the nail slot). Deliberately lenient: this only has to
# catch obvious non-body photos, the real detection happens downstream. The
# saturation ceiling keeps saturated red/blue objects (traffic lights, logos,
# painted walls) from counting as skin.
MIN_SKIN_FRACTION = 0.03
SKIN_HSV_LOWER = (0, 30, 50)
SKIN_HSV_UPPER = (30, 180, 255)

_EYE_MESSAGE = (
    "Gambar ini bukan foto mata/konjungtiva. "
    "Unggah foto kelopak mata bawah atau konjungtiva yang jelas, "
    "dengan pencahayaan merata."
)
_NAIL_MESSAGE = (
    "Gambar ini bukan foto tangan/kuku. "
    "Unggah foto seluruh tangan dengan jari dan kuku terlihat jelas."
)

_cascade = None


def _eye_cascade():
    """Lazy Haar eye detector (ships with opencv-python). False if unusable."""
    global _cascade
    if _cascade is None:
        try:
            clf = cv2.CascadeClassifier(
                os.path.join(cv2.data.haarcascades, "haarcascade_eye.xml")
            )
            _cascade = clf if not clf.empty() else False
        except Exception:
            _cascade = False
    return _cascade


def _skin_fraction(img_bgr: np.ndarray) -> float:
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    skin = cv2.inRange(hsv, SKIN_HSV_LOWER, SKIN_HSV_UPPER)
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8), iterations=2)
    return float(np.count_nonzero(skin)) / float(skin.size)


def _looks_like_document(img_bgr: np.ndarray) -> bool:
    b, g, r = img_bgr[:, :, 0], img_bgr[:, :, 1], img_bgr[:, :, 2]
    white = (r > 245) & (g > 245) & (b > 245)
    mean_sat = float(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)[:, :, 1].mean())
    return float(white.mean()) > WHITE_BG_FRACTION and mean_sat < MEAN_SATURATION_DOC


def _mean_value(img_bgr: np.ndarray) -> float:
    return float(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)[:, :, 2].mean())


def _tissue_fraction(img_bgr: np.ndarray) -> float | None:
    """Share of conjunctiva-like tissue pixels, or None when undecidable."""
    try:
        from feature_extraction import extract_features_advanced_masking
        out = extract_features_advanced_masking(img_bgr, return_masks=True)
    except Exception:
        return None
    if not isinstance(out, tuple) or len(out) != 2 or out[1] is None:
        return None
    return float(np.mean(out[1]))


def _eye_detected(img_bgr: np.ndarray) -> bool:
    clf = _eye_cascade()
    if clf is False:
        return False
    try:
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        found = clf.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        return len(found) > 0
    except Exception:
        return False


def _check_common(img_bgr: np.ndarray, not_photo_msg: str) -> str | None:
    """Shared guards (readable, minimum size, not a document, not near-black)."""
    if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
        return "Gambar tidak dapat dibaca. Coba unggah foto lain."
    h, w = img_bgr.shape[:2]
    if min(h, w) < MIN_SIDE_PX:
        return "Gambar terlalu kecil untuk dianalisis. Unggah foto resolusi lebih besar."
    if _looks_like_document(img_bgr):
        return not_photo_msg
    if _mean_value(img_bgr) < MEAN_VALUE_DARK:
        return "Gambar terlalu gelap untuk dianalisis. Unggah foto dengan pencahayaan lebih baik."
    # A frame with essentially no texture is a fill, not a photographed scene.
    gray_std = float(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).std())
    if gray_std < FLAT_MIN_GRAY_STD:
        return not_photo_msg
    return None


def check_eye_image(img_bgr) -> str | None:
    """Return a user-facing rejection reason, or None when the photo may be an eye."""
    reason = _check_common(img_bgr, _EYE_MESSAGE)
    if reason is not None:
        return reason

    tissue = _tissue_fraction(img_bgr)
    if tissue is None or tissue < MIN_TISSUE_FRACTION:
        return _EYE_MESSAGE
    if tissue > MAX_TISSUE_FRACTION:
        return _EYE_MESSAGE

    # Eyelid skin around the conjunctiva, or a detected eye, must be present.
    if _skin_fraction(img_bgr) < MIN_SKIN_FRACTION and not _eye_detected(img_bgr):
        return _EYE_MESSAGE
    return None


def check_nail_image(img_bgr) -> str | None:
    """Return a user-facing rejection reason, or None when the photo may be a hand."""
    reason = _check_common(img_bgr, _NAIL_MESSAGE)
    if reason is not None:
        return reason
    if _skin_fraction(img_bgr) < MIN_SKIN_FRACTION:
        return _NAIL_MESSAGE
    return None


def check_nail_image_bytes(image_bytes: bytes) -> str | None:
    """Decode + check_nail_image, for the route layer that only holds bytes."""
    img = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return "Gambar tidak dapat dibaca. Coba unggah foto lain."
    return check_nail_image(img)

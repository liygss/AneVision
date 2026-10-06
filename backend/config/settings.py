import os


# "auto" is the default: main.py enables real mode when the model weights are
# actually present on disk, and stays in mock when they are not. The previous
# hard default of "mock" was the reason a deployment without the MODEL_MODE env
# var answered every request with "Eye model not loaded".
MODEL_MODE: str = os.getenv("MODEL_MODE", "auto")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

MAX_FILE_SIZE_MB: int = 10
MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024

ALLOWED_MIME_TYPES: set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp"}

EYE_IMAGE_SIZE: tuple[int, int] = (224, 224)
NAIL_IMAGE_SIZE: tuple[int, int] = (224, 224)

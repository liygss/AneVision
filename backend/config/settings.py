import os


MODEL_MODE: str = os.getenv("MODEL_MODE", "mock")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
EYE_MODEL_PATH: str = os.getenv("EYE_MODEL_PATH", "models/eye_model.h5")
NAIL_MODEL_PATH: str = os.getenv("NAIL_MODEL_PATH", "models/nail_model.h5")

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

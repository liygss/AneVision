import io
import numpy as np
from PIL import Image
from config.settings import EYE_IMAGE_SIZE, NAIL_IMAGE_SIZE

# TODO: adjust preprocessing to match the trained model's training pipeline.
# Current preprocessing: RGB conversion, resize, normalize to [0, 1].
# The AI/model team should provide:
#   - exact input size
#   - RGB vs BGR
#   - normalization method (0-1, mean/std, etc.)
#   - crop method
#   - input tensor shape


def preprocess_image(image_bytes: bytes, target_size: tuple[int, int] = (224, 224)) -> np.ndarray:
    image = Image.open(io.BytesIO(image_bytes))

    if image.mode != "RGB":
        image = image.convert("RGB")

    image = image.resize(target_size, Image.LANCZOS)

    array = np.asarray(image).astype("float32")
    array = array / 255.0

    if len(array.shape) == 3:
        array = np.expand_dims(array, axis=0)

    return array


def preprocess_eye_image(image_bytes: bytes) -> np.ndarray:
    return preprocess_image(image_bytes, EYE_IMAGE_SIZE)


def preprocess_nail_image(image_bytes: bytes) -> np.ndarray:
    return preprocess_image(image_bytes, NAIL_IMAGE_SIZE)

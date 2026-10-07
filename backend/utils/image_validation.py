from typing import Optional

from fastapi import UploadFile, HTTPException
from config.settings import ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES


def _detail(message: str, code: Optional[str]):
    """A string detail stays a plain message; a code makes the frontend able
    to route the failure (e.g. a bad nail photo opens the nail retry panel)."""
    return {"code": code, "message": message} if code else message


async def validate_image(file: UploadFile, code: Optional[str] = None) -> None:
    if not file.content_type or file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=_detail(
                f"Format file tidak didukung: {file.content_type}. Gunakan JPG, PNG, atau WEBP.",
                code,
            ),
        )

    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=_detail(
                f"Ekstensi file tidak didukung: {ext or '(tanpa ekstensi)'}. "
                f"Gunakan: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
                code,
            ),
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=_detail(
                f"Ukuran file terlalu besar. Maksimal "
                f"{MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
                code,
            ),
        )

    file.file.seek(0)

    try:
        from PIL import Image
        import io
        image = Image.open(io.BytesIO(contents))
        image.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=_detail("Gambar tampaknya rusak. Coba unggah gambar lain.", code),
        )

    file.file.seek(0)

from fastapi import UploadFile, HTTPException
from config.settings import ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES


async def validate_image(file: UploadFile) -> None:
    if not file.content_type or file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
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
            detail="The uploaded image appears to be corrupted. Please try a different image.",
        )

    file.file.seek(0)

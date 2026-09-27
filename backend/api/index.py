"""Vercel serverless entrypoint for the Anevision API.

Vercel treats every module under ``api/`` as a serverless function, so the
FastAPI application is exposed here as ``app`` and this is the only file that
lives in that directory.

The heavy models are optional. ``MODEL_MODE`` defaults to ``mock``, so the app
boots without TensorFlow, PyTorch or the ``.venv_nail`` subprocess and answers
with a clear JSON error instead of crashing:

    GET  /health   always 200
    POST /predict  400 with a "model not loaded" detail when models are absent
"""

from main import app

__all__ = ["app"]

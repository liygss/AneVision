# Anevision backend for Render (and other Docker-based hosts).
#
# The two models deliberately run in SEPARATE virtualenvs, mirroring how the
# project works locally. mediapipe 0.10.x needs protobuf <5 and numpy <2,
# while the eye model's venv needs protobuf >=6.31.1 for TensorFlow — they
# cannot share an interpreter. See requirements.txt.
FROM python:3.12-slim-bookworm

# mediapipe pulls the opencv GUI build (needs libGL), scikit-learn wants
# libgomp, and glib is required by the mediapipe runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Main venv (eye model + API). TensorFlow is filtered OUT: it only feeds
# the optional CNN status validator. The authoritative Hb comes from the Ridge
# pipeline (sklearn), so dropping TF keeps the container ~1 GB smaller while
# the frontend already treats a missing CNN status as "Referensi".
COPY requirements.txt ./
RUN python -m venv .venv \
    && grep -viE '^[[:space:]]*(tensorflow|torch|torchvision|ultralytics|mediapipe)' requirements.txt > /tmp/main-requirements.txt \
    && .venv/bin/pip install --no-cache-dir -r /tmp/main-requirements.txt

# --- Nail venv (YOLO seg + mediapipe hand landmarks + ONNX adjustment),
# run as a subprocess by services/nail.py. torch is preinstalled from the CPU
# index so pip never pulls the multi-GB CUDA package set.
COPY requirements_nail.txt ./
RUN python -m venv .venv_nail \
    && .venv_nail/bin/pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && .venv_nail/bin/pip install --no-cache-dir -r requirements_nail.txt

# Model weights and app code. .dockerignore keeps datasets/experiments out.
COPY . .

ENV MODEL_MODE=auto \
    PYTHONUNBUFFERED=1

# Render injects PORT (default 10000); uvicorn binds to it on 0.0.0.0.
EXPOSE 10000
CMD ["sh", "-c", "exec .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
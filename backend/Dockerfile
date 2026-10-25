# Anevision backend for Docker-based hosts (Railway / Render).
#
# ONE interpreter on purpose. Locally the nail model runs in a second venv
# (.venv_nail) only because the eye CNN validator (TensorFlow) needs protobuf
# >=6 while mediapipe 0.10 pins protobuf <5. On a server the CNN validator is
# optional and dropped, which removes that conflict, so the nail deps can live
# in the same venv. services/nail.py then imports the worker in-process and the
# YOLO26-seg (ultralytics/torch) + MediaPipe detectors actually run — producing
# the same multi-nail boxes as localhost instead of the single-box "auto"
# fallback you get when those packages are missing.
FROM python:3.12-slim-bookworm

# mediapipe pulls the opencv GUI build (needs libGL), scikit-learn wants
# libgomp, and glib is required by the mediapipe runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Eye + API deps. TensorFlow is filtered OUT: it only feeds the optional CNN
# status validator, and dropping it is what lets mediapipe share this venv.
COPY requirements.txt ./
RUN python -m venv .venv \
    && grep -viE '^[[:space:]]*(tensorflow|torch|torchvision|ultralytics|mediapipe)' requirements.txt > /tmp/main-requirements.txt \
    && .venv/bin/pip install --no-cache-dir --upgrade pip \
    && .venv/bin/pip install --no-cache-dir 'numpy<2' \
    && .venv/bin/pip install --no-cache-dir -r /tmp/main-requirements.txt

# Nail deps in the SAME venv: YOLO26-seg (ultralytics + torch CPU) and MediaPipe
# hand landmarks. torch is installed from the CPU index first so pip never pulls
# the multi-GB CUDA wheel set that ultralytics would otherwise drag in.
COPY requirements_nail.txt ./
RUN .venv/bin/pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && .venv/bin/pip install --no-cache-dir -r requirements_nail.txt

# Model weights and app code. .dockerignore keeps datasets/experiments out.
COPY . .

# Pastikan AINailSys ONNX selalu ter-copy (external data files)
COPY models/AINailSys /app/models/AINailSys
RUN ls -la /app/models/AINailSys/models/deployment/ 2>&1 | head -15

ENV MODEL_MODE=auto \
    PYTHONUNBUFFERED=1 \
    ANEVIA_SEG26_WEIGHTS=/app/models/Kuku-Anemia/core/models/seg_runtime/yolo26_seg_best.pt

# Hosts inject PORT (Render default 10000); uvicorn binds to it on 0.0.0.0.
EXPOSE 10000
CMD ["sh", "-c", "exec .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]

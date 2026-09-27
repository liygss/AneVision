#!/bin/bash

# AneVision - Start both Backend and Frontend servers

DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$DIR/backend"
FRONTEND_DIR="$DIR/frontend"

cleanup() {
  echo ""
  echo "Stopping servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "========================================="
echo "  AneVision - Anemia Screening Platform  "
echo "========================================="
echo ""

# --- Backend ---
echo "[1/2] Starting Backend (FastAPI on :8000)..."
cd "$BACKEND_DIR"

# Ensure nail subprocess venv exists (mediapipe runs isolated from TensorFlow)
if [ ! -f ".venv_nail/bin/python" ]; then
  echo "  -> Creating .venv_nail (nail model worker) ..."
  python3 -m venv .venv_nail
  .venv_nail/bin/pip install -q -r requirements_nail.txt
fi

source .venv/bin/activate
MODEL_MODE=real python3 -u -c "
import sys; sys.path.insert(0, '.')
from main import app; import uvicorn
uvicorn.run(app, host='0.0.0.0', port=8000, log_level='info')
" &
BACKEND_PID=$!
sleep 5

# --- Frontend ---
echo "[2/2] Starting Frontend (Vite on :5173)..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
sleep 3

echo ""
echo "========================================="
echo "  Servers are running!                   "
echo "  Frontend : http://localhost:5173       "
echo "  Backend  : http://localhost:8000       "
echo "========================================="
echo "  Press Ctrl+C to stop both servers."
echo ""

wait

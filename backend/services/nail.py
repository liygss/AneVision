import atexit
import base64
import json
import os
import subprocess
import threading
from typing import Optional

# Model constants from core/models/seg_runtime/model_metadata.json
NAIL_MODEL_MAE_G_DL = 1.596
NAIL_MODEL_R2 = 0.399
NAIL_MODEL_NAME = "RobustScaler + ElasticNet (seg_runtime)"

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_VENV_NAIL_PY = os.path.join(_BACKEND_DIR, ".venv_nail", "bin", "python")
_WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nail_worker.py")

_REQUEST_TIMEOUT_SECONDS = 90.0

_proc: Optional[subprocess.Popen] = None


def load_nail_model() -> bool:
    """Spawn the nail worker subprocess (runs inside .venv_nail) and verify it."""
    global _proc
    _shutdown()

    if not os.path.exists(_VENV_NAIL_PY):
        print(f"[Kuku-Anemia] .venv_nail not found at {_VENV_NAIL_PY}. "
              "Run: python3 -m venv .venv_nail && .venv_nail/bin/pip install mediapipe==0.10.21 scikit-learn joblib")
        return False

    try:
        _stderr = open("/tmp/nail_worker_stderr.log", "a")
        _proc = subprocess.Popen(
            [_VENV_NAIL_PY, "-u", _WORKER],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=_stderr,
            text=True,
            bufsize=1,
            cwd=str(_BACKEND_DIR),
        )
        out = _request({"type": "ping"})
        if out and out.get("type") == "pong":
            print("[Kuku-Anemia] Nail model worker ready (subprocess .venv_nail)")
            return True
        print(f"[Kuku-Anemia] Nail worker ping failed: {out}")
        _shutdown()
        return False
    except Exception as e:
        print(f"[Kuku-Anemia] Failed to start nail worker: {e}")
        _shutdown()
        return False


def _request(payload: dict) -> Optional[dict]:
    global _proc
    if _proc is None or _proc.poll() is not None:
        return None
    try:
        _proc.stdin.write(json.dumps(payload) + "\n")
        _proc.stdin.flush()

        box: list = []
        reader = threading.Thread(target=lambda: box.append(_proc.stdout.readline()), daemon=True)
        reader.start()
        reader.join(_REQUEST_TIMEOUT_SECONDS)
        if reader.is_alive():
            # worker stuck: kill it so the next call respawns a fresh one
            _shutdown()
            return {"error": "Model kuku tidak merespons. Coba lagi."}
        line = box[0] if box else ""
        if not line:
            return None
        return json.loads(line)
    except Exception:
        return None


def _shutdown() -> None:
    global _proc
    if _proc is not None:
        try:
            if _proc.stdin:
                _proc.stdin.close()
            _proc.terminate()
        except Exception:
            pass
        _proc = None


def predict_nail(image_bytes: bytes, gender: str = "F", nail_box=None) -> Optional[dict]:
    global _proc
    if _proc is None or _proc.poll() is not None:
        if not load_nail_model():
            return {"error": "Model kuku tidak tersedia."}

    payload = {
        "type": "predict",
        "image_b64": base64.b64encode(image_bytes).decode("ascii"),
        "gender": gender,
    }
    if nail_box:
        payload["nail_box"] = nail_box
    out = _request(payload)
    if out is None:
        _shutdown()
        return {"error": "Model kuku gagal merespons. Coba lagi."}
    return out


atexit.register(_shutdown)
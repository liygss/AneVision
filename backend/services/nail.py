import atexit
import base64
import json
import os
import subprocess
import threading
from typing import Optional

# Model constants from core/models/seg_runtime/cnn_hb_resnet18_v2.json
# (worker memuat MAE/R2 asli dari metadata saat load; nilai di bawah = default).
NAIL_MODEL_MAE_G_DL = 1.359
NAIL_MODEL_R2 = 0.312
NAIL_MODEL_NAME = "CNN ResNet18 v2 (ONNX, sewa)"

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_VENV_NAIL_PY = os.path.join(_BACKEND_DIR, ".venv_nail", "bin", "python")
_WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nail_worker.py")

_REQUEST_TIMEOUT_SECONDS = 90.0

_proc: Optional[subprocess.Popen] = None

# Set when the worker had to be imported into this process rather than spawned
# as a subprocess. Serverless hosts such as Vercel run a single interpreter, so
# there is no .venv_nail to spawn and the subprocess path is unavailable.
_inprocess_worker = None

# Serialises access to the worker pipe.
#
# The worker speaks a line protocol over a single stdin/stdout pair, so one
# request at a time may be in flight. Without this lock, two concurrent
# requests both write a line and both then read from stdout, and each can pick
# up the other's response. Uvicorn handles requests in a thread pool, so this
# is reachable in production even though a single user on a laptop never
# triggers it.
_request_lock = threading.Lock()


def _load_inprocess_worker():
    """Import the nail worker into this interpreter.

    Used when .venv_nail is absent, which is the case on serverless hosts: the
    module is loaded directly instead of over a pipe. Torch, ultralytics and
    mediapipe are then imported into the same process, so the protobuf conflict
    with TensorFlow must not be present. It is not, because the nail path never
    imports TensorFlow.
    """
    global _inprocess_worker
    if _inprocess_worker is not None:
        return _inprocess_worker
    try:
        import importlib.util

        spec = importlib.util.spec_from_file_location("nail_worker", _WORKER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module._load()
        _inprocess_worker = module
        print("[Kuku-Anemia] Nail model worker ready (in-process)")
        return module
    except Exception as e:
        print(f"[Kuku-Anemia] In-process worker failed: {e}")
        _inprocess_worker = None
        return None


def load_nail_model() -> bool:
    """Make the nail model available: subprocess when possible, else in-process."""
    global _proc
    _shutdown()

    # On serverless (Vercel), prefer in-process to avoid subprocess issues
    if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV") or not os.path.exists(_VENV_NAIL_PY):
        print(f"[Kuku-Anemia] .venv_nail not found at {_VENV_NAIL_PY}; "
              "falling back to in-process import. Run: python3 -m venv .venv_nail "
              "&& .venv_nail/bin/pip install -r requirements_nail.txt")
        res = _load_inprocess_worker()
        if not res:
            print("[Kuku-Anemia] In-process fallback failed; check worker logs")
        return res is not None

    try:
        _proc = subprocess.Popen(
            [_VENV_NAIL_PY, "-u", _WORKER],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=None,
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
        res = _load_inprocess_worker()
        if not res:
            print("[Kuku-Anemia] In-process fallback failed after ping fail")
        return res is not None
    except Exception as e:
        print(f"[Kuku-Anemia] Failed to start nail worker: {e}")
        _shutdown()
        res = _load_inprocess_worker()
        if not res:
            print("[Kuku-Anemia] In-process fallback failed after exception")
        return res is not None


def _request(payload: dict) -> Optional[dict]:
    global _proc
    if _proc is None or _proc.poll() is not None:
        return None
    try:
        with _request_lock:
            if _proc is None or _proc.poll() is not None:
                return None
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
    if _proc is None or _proc.poll() is not None:
        if _inprocess_worker is None and not load_nail_model():
            return {"error": "Model kuku tidak tersedia."}

    payload = {
        "type": "predict",
        "image_b64": base64.b64encode(image_bytes).decode("ascii"),
        "gender": gender,
    }
    if nail_box:
        payload["nail_box"] = nail_box

    # Subprocess path: line protocol over the pipe.
    out = _request(payload)

    # In-process path: call the loaded module directly, still serialised.
    if out is None and _inprocess_worker is not None:
        try:
            with _request_lock:
                out = _inprocess_worker._predict(image_bytes, gender, nail_box)
        except Exception as e:
            return {"error": f"Model kuku gagal merespons: {e}"}

    if out is None:
        _shutdown()
        return {"error": "Model kuku gagal merespons. Coba lagi."}
    return out


atexit.register(_shutdown)
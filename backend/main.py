import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.routes import router
from config.settings import MODEL_MODE, FRONTEND_URL
from services.inference import load_eye_model, load_nail_model

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Cheap existence check for the two weights that decide the Hb estimate. Used to
# auto-enable real mode when MODEL_MODE is missing, and to keep the default
# memory-friendly for local development.
_EYE_PIPELINE = os.path.join(
    _BACKEND_DIR, "models", "Deploy_AnemiaEyes", "deploy", "outputs", "models", "model_pipeline.joblib"
)
_NAIL_SEG = os.path.join(_BACKEND_DIR, "models", "Kuku-Anemia", "yolo26n-seg.pt")


def _runtime_artifacts_present() -> bool:
    return os.path.exists(_EYE_PIPELINE) and os.path.exists(_NAIL_SEG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MODEL_MODE defaults to "mock" so a developer running uvicorn by hand
    # cannot accidentally spend memory loading weights. On a deployed host the
    # models are the entire point, and forgetting the env var produced a bare
    # "Eye model not loaded" with no explanation, so auto-enable when the
    # weights are actually present on disk.
    mode = MODEL_MODE
    if mode == "auto":
        mode = "real" if _runtime_artifacts_present() else "mock"
        print(f"[startup] MODEL_MODE=auto -> '{mode}' (weights present: {_runtime_artifacts_present()})")
    elif mode == "mock" and _runtime_artifacts_present():
        # Explicitly mocked, but real weights are sitting there. Worth a warning
        # because it is nearly always an accident.
        print("[startup] MODEL_MODE=mock while model weights are present; "
              "requests will be rejected with 'model not loaded'")

    if mode == "real":
        load_eye_model()
        load_nail_model()
        from services.inference import model_status
        status = model_status()
        print(f"[startup] mode={mode} eye={status['eye_loaded']} "
              f"nail={status['nail_loaded']} eye_error={status['eye_error']} "
              f"nail_error={status['nail_error']}")
    else:
        print(f"[startup] mode={mode}: no models loaded")
    yield


app = FastAPI(
    title="Anevision API",
    description="AI-Powered Anemia Screening from Eye and Nail Images",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # A wildcard is used so a preview deployment is never blocked by a stale
    # FRONTEND_URL. The API returns model output derived from the uploaded image
    # and stores nothing, so no cookie or credential is involved. The previous
    # single-origin allowlist made every new preview URL look like "server not
    # connected" to the judges.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/debug_nail")
async def debug_nail():
    try:
        from services import nail
        res = nail._load_inprocess_worker()
        return {"ok": res is not None}
    except Exception as e:
        import traceback
        return {"ok": False, "err": str(e)[:500]}

app.include_router(router)

# Vercel Services routes by rewriting "/api/*" to this service while the service
# still observes the ORIGINAL path ("The service receives the original request
# path"), so /api/health arrives here as /api/health, not /health. The frontend
# calls "/api", so the same router is mounted twice: once at the root for direct
# access (uvicorn, curl, health checks) and once under /api for the Vercel
# rewrite. Both spellings work either way.
app.include_router(router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

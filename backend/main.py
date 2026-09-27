from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.routes import router
from config.settings import MODEL_MODE, FRONTEND_URL
from services.inference import load_eye_model, load_nail_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    if MODEL_MODE == "real":
        load_eye_model()
        load_nail_model()
        print(f"Models loaded. Mode: {MODEL_MODE}")
    else:
        print(f"Running in MOCK mode. No models loaded.")
    yield


app = FastAPI(
    title="Anevision API",
    description="AI-Powered Anemia Screening from Eye and Nail Images",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

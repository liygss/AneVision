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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

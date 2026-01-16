"""
Healthcare Voice AI Service
FastAPI application for WebSocket-based voice agent with OpenAI Realtime API
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from routes import voice, patients, appointments, providers
from db.supabase_client import init_supabase

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting Healthcare Voice AI Service...")
    init_supabase()
    yield
    logger.info("Shutting down Healthcare Voice AI Service...")


app = FastAPI(
    title=settings.app_name,
    description="Voice AI agent for healthcare appointment scheduling and patient services",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(voice.router, prefix="/ws", tags=["Voice"])
app.include_router(patients.router, prefix="/patients", tags=["Patients"])
app.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
app.include_router(providers.router, prefix="/providers", tags=["Providers"])


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8084,
        reload=settings.debug
    )

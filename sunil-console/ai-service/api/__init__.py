"""
API package for URackIT AI Service.

Contains FastAPI routers for different endpoint groups.
"""

from .routes import router as api_router
from .schemas import (
    ChatRequest,
    ChatResponse,
    SessionRequest,
    SessionContext,
    HealthResponse,
    SummarizeRequest,
    SummarizeResponse,
    ClassifyRequest,
    ClassifyResponse,
)

__all__ = [
    "api_router",
    "ChatRequest",
    "ChatResponse",
    "SessionRequest",
    "SessionContext",
    "HealthResponse",
    "SummarizeRequest",
    "SummarizeResponse",
    "ClassifyRequest",
    "ClassifyResponse",
]

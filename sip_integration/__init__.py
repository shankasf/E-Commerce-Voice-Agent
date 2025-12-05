"""
SIP Integration Module for Voice-based Multi-Agent Chatbot

This module provides voice call handling via Twilio SIP and OpenAI Realtime API,
following SOLID software principles:

- Single Responsibility: Each class has one job
- Open/Closed: Extended through interfaces, not modification
- Liskov Substitution: Interfaces ensure interchangeability
- Interface Segregation: Small, focused interfaces
- Dependency Inversion: Depend on abstractions, not concretions

Usage:
    # Run the server
    python -m sip_integration.server
    
    # Or with uvicorn
    uvicorn sip_integration.server:app --host 0.0.0.0 --port 8080
"""

from .config import SIPConfig, get_config, set_config
from .webhook_server import create_app
from .interfaces import (
    ICallHandler,
    IAudioProcessor,
    IRealtimeConnection,
    ISessionManager,
    IAgentAdapter,
    ITelephonyProvider,
    CallInfo,
    CallState,
    AudioChunk,
    AudioFormat,
)

__all__ = [
    # Configuration
    "SIPConfig",
    "get_config",
    "set_config",
    # Server
    "create_app",
    # Interfaces
    "ICallHandler",
    "IAudioProcessor",
    "IRealtimeConnection",
    "ISessionManager",
    "IAgentAdapter",
    "ITelephonyProvider",
    # Data classes
    "CallInfo",
    "CallState",
    "AudioChunk",
    "AudioFormat",
]


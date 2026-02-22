"""
GlamBook AI Service - Configuration

Environment configuration for the salon voice agent.
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

# Load .env from project root (parent directory)
root_env = Path(__file__).parent.parent / '.env'
load_dotenv(root_env)


class Config:
    """Application configuration from environment variables."""

    # Server
    host: str = os.getenv("AI_SERVICE_HOST", os.getenv("HOST", "0.0.0.0"))
    port: int = int(os.getenv("AI_SERVICE_PORT", os.getenv("PORT", "8086")))
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://glambook:glambook2024@localhost:5432/glambook")
    
    # Eleven Labs
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    elevenlabs_voice_id: str = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    elevenlabs_model_id: str = os.getenv("ELEVENLABS_MODEL_ID", "eleven_turbo_v2")  # Must use turbo or flash v2 for English
    
    # OpenAI (for agent logic - text chat only, not voice)
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    # Twilio
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_phone_number: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    twilio_twiml_app_sid: str = os.getenv("TWILIO_TWIML_APP_SID", "")
    twilio_api_key_sid: str = os.getenv("TWILIO_API_KEY_SID", "")
    twilio_api_key_secret: str = os.getenv("TWILIO_API_KEY_SECRET", "")
    
    # Backend
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:3001")
    
    # Salon Info
    salon_name: str = os.getenv("SALON_NAME", "GlamBook Salon")
    salon_phone: str = os.getenv("SALON_PHONE", "+1-555-123-4567")
    
    # Voice Settings
    voice_stability: float = float(os.getenv("VOICE_STABILITY", "0.5"))
    voice_similarity_boost: float = float(os.getenv("VOICE_SIMILARITY_BOOST", "0.75"))
    voice_style: float = float(os.getenv("VOICE_STYLE", "0.0"))
    
    def validate(self) -> List[str]:
        """Validate required configuration."""
        errors: List[str] = []

        if not self.database_url:
            errors.append("DATABASE_URL is required")
        if not self.elevenlabs_api_key:
            errors.append("ELEVENLABS_API_KEY is required")
        if not self.openai_api_key:
            errors.append("OPENAI_API_KEY is required")

        return errors


@lru_cache()
def get_config() -> Config:
    """Get cached configuration instance."""
    return Config()

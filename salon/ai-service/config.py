"""
GlamBook AI Service - Configuration

Environment configuration for the salon voice agent.
"""

import os
from functools import lru_cache
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration from environment variables."""
    
    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8086"))
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")  # anon key (optional, for RLS-restricted access)
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role key (bypasses RLS)
    
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
        
        if not self.supabase_url:
            errors.append("SUPABASE_URL is required")
        if not self.supabase_service_key:
            errors.append("SUPABASE_SERVICE_KEY is required (service role key to bypass RLS)")
        if not self.elevenlabs_api_key:
            errors.append("ELEVENLABS_API_KEY is required")
        if not self.openai_api_key:
            errors.append("OPENAI_API_KEY is required")
            
        return errors


@lru_cache()
def get_config() -> Config:
    """Get cached configuration instance."""
    return Config()

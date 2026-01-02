"""
Configuration module for Real Estate Voice Agent.

Loads and validates environment variables.
"""

import os
from dataclasses import dataclass, field
from typing import List, Optional

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    """Application configuration."""
    
    # xAI Configuration
    xai_api_key: str = field(default_factory=lambda: os.getenv("XAI_API_KEY", ""))
    xai_voice: str = field(default_factory=lambda: os.getenv("XAI_VOICE", "Ara"))
    
    # Audio Configuration for Twilio (G.711 μ-law)
    input_audio_format: str = "audio/pcmu"  # G.711 μ-law for Twilio
    output_audio_format: str = "audio/pcmu"
    sample_rate: int = 8000  # Standard for telephony
    
    # Twilio Configuration
    twilio_account_sid: str = field(default_factory=lambda: os.getenv("TWILIO_ACCOUNT_SID", ""))
    twilio_auth_token: str = field(default_factory=lambda: os.getenv("TWILIO_AUTH_TOKEN", ""))
    twilio_phone_number: str = field(default_factory=lambda: os.getenv("TWILIO_PHONE_NUMBER", ""))
    twilio_twiml_app_sid: str = field(default_factory=lambda: os.getenv("TWILIO_TWIML_APP_SID", ""))
    twilio_api_key_sid: str = field(default_factory=lambda: os.getenv("TWILIO_API_KEY_SID", ""))
    twilio_api_key_secret: str = field(default_factory=lambda: os.getenv("TWILIO_API_KEY_SECRET", ""))
    
    # Database (Supabase)
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
    supabase_service_key: str = field(default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
    
    # Server Configuration
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8087")))
    preferred_port: int = field(default_factory=lambda: int(os.getenv("PORT", "8087")))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    
    # Webhook Configuration
    webhook_base_url: str = field(default_factory=lambda: os.getenv("WEBHOOK_BASE_URL", ""))
    
    # Session Configuration
    max_concurrent_sessions: int = field(default_factory=lambda: int(os.getenv("MAX_CONCURRENT_SESSIONS", "50")))
    session_timeout_seconds: int = field(default_factory=lambda: int(os.getenv("SESSION_TIMEOUT_SECONDS", "3600")))
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors."""
        errors = []
        
        if not self.xai_api_key:
            errors.append("XAI_API_KEY is required")
        
        if not self.supabase_url:
            errors.append("SUPABASE_URL is required")
        
        if not self.supabase_service_key:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is required")
        
        if self.xai_voice not in ["Ara", "Rex", "Sal", "Eve", "Leo"]:
            errors.append(f"Invalid XAI_VOICE: {self.xai_voice}. Must be one of: Ara, Rex, Sal, Eve, Leo")
        
        return errors
    
    @property
    def xai_realtime_url(self) -> str:
        """Get the xAI realtime WebSocket URL."""
        return "wss://api.x.ai/v1/realtime"


# Global config instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config


def set_config(config: Config) -> None:
    """Set the global configuration instance."""
    global _config
    _config = config

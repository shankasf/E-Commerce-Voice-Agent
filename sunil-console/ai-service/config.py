"""
Configuration module for URackIT AI Service.

Loads and validates environment variables.
"""

import os
from dataclasses import dataclass, field
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv(override=True)


@dataclass
class Config:
    """Application configuration."""
    
    # OpenAI
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_model: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o"))
    openai_realtime_model: str = field(default_factory=lambda: os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview"))
    voice: str = field(default_factory=lambda: os.getenv("VOICE", "alloy"))
    
    # Database
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
    supabase_service_key: str = field(default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", ""))
    
    # Server
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8081")))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    
    # Twilio
    twilio_account_sid: str = field(default_factory=lambda: os.getenv("TWILIO_ACCOUNT_SID", ""))
    twilio_auth_token: str = field(default_factory=lambda: os.getenv("TWILIO_AUTH_TOKEN", ""))
    twilio_phone_number: str = field(default_factory=lambda: os.getenv("TWILIO_PHONE_NUMBER", ""))
    
    # Webhook
    webhook_base_url: str = field(default_factory=lambda: os.getenv("WEBHOOK_BASE_URL", ""))
    
    # Session
    max_concurrent_sessions: int = field(default_factory=lambda: int(os.getenv("MAX_SESSIONS", "100")))

    # SSL/mTLS Configuration
    # Note: Using SERVER_SSL_* to avoid conflict with Python's SSL_CERT_FILE env var
    ssl_enabled: bool = field(default_factory=lambda: os.getenv("SSL_ENABLED", "false").lower() == "true")
    ssl_cert_file: str = field(default_factory=lambda: os.getenv("SERVER_SSL_CERT", "crt/server.crt"))
    ssl_key_file: str = field(default_factory=lambda: os.getenv("SERVER_SSL_KEY", "crt/server.key"))
    ssl_ca_file: str = field(default_factory=lambda: os.getenv("SSL_CA_FILE", ""))  # For mTLS client verification
    ssl_verify_client: bool = field(default_factory=lambda: os.getenv("SSL_VERIFY_CLIENT", "false").lower() == "true")

    # mTLS Configuration (for device WebSocket connections)
    mtls_enabled: bool = field(default_factory=lambda: os.getenv("MTLS_ENABLED", "false").lower() == "true")
    mtls_ca_file: str = field(default_factory=lambda: os.getenv("MTLS_CA_FILE", ""))
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors."""
        errors = []
        
        if not self.openai_api_key:
            errors.append("OPENAI_API_KEY is required")
        
        if not self.supabase_url and not self.database_url:
            errors.append("Either SUPABASE_URL or DATABASE_URL is required")
        
        if self.supabase_url and not self.supabase_service_key:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is required when using Supabase")
        
        return errors


# Global config instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config

"""
Configuration module for SIP integration.

Follows Single Responsibility Principle - handles only configuration concerns.
"""

import os
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


@dataclass
class SIPConfig:
    """Configuration for SIP/Voice integration."""
    
    # OpenAI Settings
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_project_id: str = field(default_factory=lambda: os.getenv("OPENAI_PROJECT_ID", "proj_rvschbvVLP2QAgoYHwwKuL7Q"))
    openai_realtime_model: str = "gpt-4o-realtime-preview-2024-12-17"
    openai_realtime_url: str = "wss://api.openai.com/v1/realtime"
    
    # Twilio Settings
    twilio_account_sid: str = field(default_factory=lambda: os.getenv("TWILIO_ACCOUNT_SID", ""))
    twilio_auth_token: str = field(default_factory=lambda: os.getenv("TWILIO_AUTH_TOKEN", ""))
    twilio_phone_number: str = field(default_factory=lambda: os.getenv("TWILIO_PHONE_NUMBER", ""))
    
    # Server Settings
    webhook_host: str = field(default_factory=lambda: os.getenv("WEBHOOK_HOST", "0.0.0.0"))
    webhook_port: int = field(default_factory=lambda: int(os.getenv("WEBHOOK_PORT", "8080")))
    webhook_base_url: str = field(default_factory=lambda: os.getenv("WEBHOOK_BASE_URL", ""))
    
    # Voice Settings
    voice: str = "alloy"  # OpenAI voice: alloy, echo, shimmer, ash, ballad, coral, sage, verse
    input_audio_format: str = "g711_ulaw"  # Twilio uses G.711 μ-law
    output_audio_format: str = "g711_ulaw"
    
    # Session Settings
    session_timeout_seconds: int = 600  # 10 minutes
    max_concurrent_sessions: int = 100
    
    # System Prompt for Voice Agent
    system_prompt: str = field(default_factory=lambda: """
You are the Playfunia / Kids4Fun voice assistant.

- Speak in very short answers: 1–2 sentences at a time.
- After answering, STOP speaking and wait for the caller.
- Do NOT keep talking unless the caller explicitly asks you to continue.
- Use a conversational, back-and-forth style, not long monologues.
""".strip())

    def validate(self) -> list[str]:
        """Validate configuration and return list of errors."""
        errors = []
        if not self.openai_api_key:
            errors.append("OPENAI_API_KEY is required")
        if not self.twilio_account_sid:
            errors.append("TWILIO_ACCOUNT_SID is required")
        return errors


# Global config instance
_config: Optional[SIPConfig] = None


def get_config() -> SIPConfig:
    """Get or create the global configuration instance."""
    global _config
    if _config is None:
        _config = SIPConfig()
    return _config


def set_config(config: SIPConfig) -> None:
    """Set a custom configuration instance."""
    global _config
    _config = config

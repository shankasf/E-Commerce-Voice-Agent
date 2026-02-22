"""Configuration settings for Healthcare Voice AI Service"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    app_name: str = "Healthcare Voice AI Service"
    debug: bool = False

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-realtime-preview-2025-06-03"
    openai_voice: str = "coral"

    # Database
    database_url: str = ""

    # Twilio (optional)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None

    # Backend API
    backend_url: str = "http://healthcare-backend:3005"
    internal_api_key: str = ""

    # Practice settings (default practice ID)
    default_practice_id: str = "00000000-0000-0000-0000-000000000001"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

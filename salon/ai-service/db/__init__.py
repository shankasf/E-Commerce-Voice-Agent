"""
GlamBook AI Service - Database Connection

Supabase client for database operations.
"""

from functools import lru_cache
from supabase import create_client, Client
from config import get_config

_client: Client | None = None


def get_supabase() -> Client:
    """Get Supabase client instance with service role key (bypasses RLS)."""
    global _client
    
    if _client is None:
        config = get_config()
        _client = create_client(
            config.supabase_url,
            config.supabase_service_key  # Uses service role key to bypass RLS
        )
    
    return _client


def get_supabase_anon() -> Client:
    """Get Supabase client with anon key (for RLS)."""
    config = get_config()
    return create_client(config.supabase_url, config.supabase_key)

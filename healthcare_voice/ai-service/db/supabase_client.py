"""Supabase client for database operations"""
import logging
from supabase import create_client, Client
from config import settings

logger = logging.getLogger(__name__)

_supabase: Client = None


def init_supabase() -> Client:
    """Initialize Supabase client"""
    global _supabase
    if _supabase is None:
        if not settings.supabase_url or not settings.supabase_key:
            logger.warning("Supabase credentials not configured")
            return None
        _supabase = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("Supabase client initialized")
    return _supabase


def get_supabase() -> Client:
    """Get Supabase client instance"""
    global _supabase
    if _supabase is None:
        return init_supabase()
    return _supabase

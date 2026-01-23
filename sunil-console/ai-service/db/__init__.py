"""
Database module for URackIT AI Service.

Contains database connection utilities only.
Query tools have been moved to tools/database.py
"""

from .connection import SupabaseDB, get_db

__all__ = [
    "SupabaseDB",
    "get_db",
]

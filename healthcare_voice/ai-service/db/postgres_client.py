"""PostgreSQL client for database operations"""
import logging
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from config import settings

logger = logging.getLogger(__name__)

_connection_pool = None


def init_db():
    """Initialize database connection"""
    global _connection_pool
    if not settings.database_url:
        logger.warning("DATABASE_URL not configured")
        return None
    logger.info("Database connection configured")
    return True


def get_connection():
    """Get a database connection"""
    if not settings.database_url:
        return None
    try:
        conn = psycopg2.connect(settings.database_url)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return None


@contextmanager
def get_cursor():
    """Context manager for database cursor"""
    conn = get_connection()
    if not conn:
        yield None
        return
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def execute_query(query: str, params: tuple = None) -> List[Dict[str, Any]]:
    """Execute a SELECT query and return results"""
    with get_cursor() as cursor:
        if cursor is None:
            return []
        try:
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Query error: {e}")
            return []


def execute_query_one(query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
    """Execute a SELECT query and return single result"""
    with get_cursor() as cursor:
        if cursor is None:
            return None
        try:
            cursor.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            logger.error(f"Query error: {e}")
            return None


def execute_insert(query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
    """Execute an INSERT query and return the inserted row"""
    with get_cursor() as cursor:
        if cursor is None:
            return None
        try:
            cursor.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            logger.error(f"Insert error: {e}")
            return None


def execute_update(query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
    """Execute an UPDATE query and return the updated row"""
    with get_cursor() as cursor:
        if cursor is None:
            return None
        try:
            cursor.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            logger.error(f"Update error: {e}")
            return None

"""
Session management for the migration multi-agent system.
Uses SQLite for conversation history persistence.
"""

import os
from agents import SQLiteSession


def create_session(session_id: str) -> SQLiteSession:
    """
    Create a new session for conversation history.

    Args:
        session_id: Unique identifier for the session

    Returns:
        SQLiteSession instance for the given session ID
    """
    db_path = os.getenv("AGENTS_SESSION_DB", "migration_conversations.db")
    return SQLiteSession(session_id, db_path)

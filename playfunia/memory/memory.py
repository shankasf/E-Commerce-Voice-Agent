# memory/memory.py

import os
from agents import SQLiteSession

DEFAULT_DB_PATH = os.getenv("AGENTS_SESSION_DB", "conversations.db")

def create_session(session_id: str | None = None) -> SQLiteSession:
    """
    Returns a SQLite-backed session. If AGENTS_SESSION_DB is set, the
    session will persist to that file; otherwise it's in-memory.
    """
    sid = session_id or "default"
    # Persistent (file) if DEFAULT_DB_PATH is set; else in-memory
    if DEFAULT_DB_PATH:
        return SQLiteSession(sid, DEFAULT_DB_PATH)   # <-- positional 2nd arg
    return SQLiteSession(sid)                        # in-memory

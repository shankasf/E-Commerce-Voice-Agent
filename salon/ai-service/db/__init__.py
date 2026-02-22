"""
GlamBook AI Service - Database Connection

PostgreSQL client for database operations using psycopg2.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from config import get_config
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

_connection_pool = None


def get_db_connection():
    """Get a database connection."""
    config = get_config()
    return psycopg2.connect(config.database_url, cursor_factory=RealDictCursor)


@contextmanager
def get_db_cursor():
    """Context manager for database cursor with automatic commit/rollback."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


class PostgresClient:
    """PostgreSQL client that mimics supabase-style interface for easier migration."""

    def __init__(self):
        self._table_name = None
        self._select_columns = "*"
        self._conditions = []
        self._order_by = []
        self._values = []

    def table(self, name: str) -> "PostgresClient":
        """Set the table name."""
        self._table_name = name
        self._select_columns = "*"
        self._conditions = []
        self._order_by = []
        self._values = []
        return self

    def select(self, columns: str = "*") -> "PostgresClient":
        """Set columns to select."""
        self._select_columns = columns
        return self

    def eq(self, column: str, value: Any) -> "PostgresClient":
        """Add equality condition."""
        self._conditions.append((column, "=", value))
        return self

    def neq(self, column: str, value: Any) -> "PostgresClient":
        """Add not-equal condition."""
        self._conditions.append((column, "!=", value))
        return self

    def gt(self, column: str, value: Any) -> "PostgresClient":
        """Add greater-than condition."""
        self._conditions.append((column, ">", value))
        return self

    def gte(self, column: str, value: Any) -> "PostgresClient":
        """Add greater-than-or-equal condition."""
        self._conditions.append((column, ">=", value))
        return self

    def lt(self, column: str, value: Any) -> "PostgresClient":
        """Add less-than condition."""
        self._conditions.append((column, "<", value))
        return self

    def lte(self, column: str, value: Any) -> "PostgresClient":
        """Add less-than-or-equal condition."""
        self._conditions.append((column, "<=", value))
        return self

    def ilike(self, column: str, pattern: str) -> "PostgresClient":
        """Add case-insensitive LIKE condition."""
        self._conditions.append((column, "ILIKE", pattern))
        return self

    def in_(self, column: str, values: List[Any]) -> "PostgresClient":
        """Add IN condition."""
        self._conditions.append((column, "IN", tuple(values)))
        return self

    def not_(self) -> "NotFilter":
        """Return a NOT filter helper."""
        return NotFilter(self)

    def order(self, column: str, desc: bool = False) -> "PostgresClient":
        """Add order by clause."""
        direction = "DESC" if desc else "ASC"
        self._order_by.append(f"{column} {direction}")
        return self

    def _build_where_clause(self) -> tuple:
        """Build WHERE clause and parameters."""
        if not self._conditions:
            return "", []

        clauses = []
        params = []
        for column, op, value in self._conditions:
            if op == "IN":
                placeholders = ", ".join(["%s"] * len(value))
                clauses.append(f"{column} IN ({placeholders})")
                params.extend(value)
            else:
                clauses.append(f"{column} {op} %s")
                params.append(value)

        return " WHERE " + " AND ".join(clauses), params

    def execute(self) -> "QueryResult":
        """Execute SELECT query."""
        where_clause, params = self._build_where_clause()
        order_clause = " ORDER BY " + ", ".join(self._order_by) if self._order_by else ""

        # Handle complex select with joins
        select_columns = self._select_columns
        from_clause = self._table_name

        query = f"SELECT {select_columns} FROM {from_clause}{where_clause}{order_clause}"

        with get_db_cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return QueryResult([dict(row) for row in rows])

    def insert(self, data: Dict[str, Any]) -> "QueryResult":
        """Insert a row."""
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = list(data.values())

        query = f"INSERT INTO {self._table_name} ({columns}) VALUES ({placeholders}) RETURNING *"

        with get_db_cursor() as cursor:
            cursor.execute(query, values)
            row = cursor.fetchone()
            return QueryResult([dict(row)] if row else [])

    def update(self, data: Dict[str, Any]) -> "QueryResult":
        """Update rows."""
        set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
        set_values = list(data.values())

        where_clause, where_params = self._build_where_clause()

        query = f"UPDATE {self._table_name} SET {set_clause}{where_clause} RETURNING *"

        with get_db_cursor() as cursor:
            cursor.execute(query, set_values + where_params)
            rows = cursor.fetchall()
            return QueryResult([dict(row) for row in rows])

    def delete(self) -> "QueryResult":
        """Delete rows."""
        where_clause, params = self._build_where_clause()

        query = f"DELETE FROM {self._table_name}{where_clause} RETURNING *"

        with get_db_cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return QueryResult([dict(row) for row in rows])


class NotFilter:
    """Helper for NOT conditions."""

    def __init__(self, client: PostgresClient):
        self._client = client

    def in_(self, column: str, values: List[Any]) -> PostgresClient:
        """Add NOT IN condition."""
        self._client._conditions.append((column, "NOT IN", tuple(values)))
        return self._client


class QueryResult:
    """Query result wrapper."""

    def __init__(self, data: List[Dict[str, Any]]):
        self.data = data


# Global client instance
_client: Optional[PostgresClient] = None


def get_postgres() -> PostgresClient:
    """Get PostgreSQL client instance."""
    return PostgresClient()


# Alias for compatibility with existing code
def get_supabase() -> PostgresClient:
    """Get database client (compatibility alias)."""
    return get_postgres()

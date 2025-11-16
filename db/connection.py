import psycopg2
import os

def get_connection():
    """Return a new DB connection."""
    return psycopg2.connect(
        dbname=os.getenv("PG_DB", "healthcare"),
        user=os.getenv("PG_USER", "postgres"),
        password=os.getenv("PG_PASS", "Sagar1122@"),
        host=os.getenv("PG_HOST", "localhost"),
        port=os.getenv("PG_PORT", "5432"),
    )

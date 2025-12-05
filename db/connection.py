import os

import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def get_connection():
    """Return a new DB connection using .env configuration."""

    # Honor a full URI first so Supabase and similar managed DBs are easy to plug in.
    uri = os.getenv("PG_CONNECTION_URI") or os.getenv("DATABASE_URL")
    if uri:
        return psycopg2.connect(uri)

    # Use local PostgreSQL from .env
    return psycopg2.connect(
        dbname=os.getenv("PG_DB"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASS"),
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT", "5432"),
    )

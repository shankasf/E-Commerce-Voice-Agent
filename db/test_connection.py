import os
from pathlib import Path

import psycopg2


def load_env():
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def get_connection():
    """Get database connection from .env settings."""
    uri = os.getenv("PG_CONNECTION_URI") or os.getenv("DATABASE_URL")
    if uri:
        return psycopg2.connect(uri)
    
    # Use individual env vars for local PostgreSQL
    return psycopg2.connect(
        dbname=os.getenv("PG_DB"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASS"),
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT", "5432"),
    )


def main():
    load_env()
    
    print("Connecting to PostgreSQL...")
    print(f"  Host: {os.getenv('PG_HOST')}")
    print(f"  Database: {os.getenv('PG_DB')}")
    print(f"  User: {os.getenv('PG_USER')}")
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("select version()")
            version = cur.fetchone()[0]
            cur.execute("select current_database(), current_user")
            db_user = cur.fetchone()

    print("\nConnection OK!")
    print("Version:", version)
    print("DB/User:", db_user)


if __name__ == "__main__":
    main()

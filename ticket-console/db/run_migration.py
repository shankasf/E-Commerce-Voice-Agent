"""
Database Migration Script for Device Chat Schema

This script executes the device_chat_schema.sql migration against Supabase PostgreSQL.

Usage:
    python run_migration.py

Requirements:
    pip install psycopg2-binary python-dotenv
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Load environment variables from sunil-console/ai-service/.env
env_path = Path(__file__).parent.parent.parent / "sunil-console" / "ai-service" / ".env"
load_dotenv(env_path)

def get_database_url():
    """Construct PostgreSQL connection URL from Supabase credentials."""
    supabase_url = os.getenv("SUPABASE_URL", "")

    if not supabase_url:
        print("ERROR: SUPABASE_URL not found in environment variables")
        print(f"Checked .env file at: {env_path}")
        sys.exit(1)

    # Extract project reference from Supabase URL
    # Format: https://[project-ref].supabase.co
    project_ref = supabase_url.replace("https://", "").replace("http://", "").split(".")[0]

    print(f"Project Reference: {project_ref}")
    print("\nTo connect to Supabase PostgreSQL, you need the database password.")
    print("You can find it in your Supabase Dashboard > Project Settings > Database > Connection string")

    password = input("\nEnter your database password: ").strip()

    if not password:
        print("ERROR: Password cannot be empty")
        sys.exit(1)

    # Construct connection string
    db_url = f"postgresql://postgres.{project_ref}:{password}@aws-0-us-west-2.pooler.supabase.com:5432/postgres"

    return db_url

def run_migration(db_url, sql_file_path):
    """Execute SQL migration file."""
    try:
        # Read SQL file
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        print(f"\nConnecting to database...")

        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

        print("Connected successfully!")
        print("\nExecuting migration...")

        # Execute SQL
        cursor = conn.cursor()
        cursor.execute(sql_content)

        # Fetch any output messages
        if cursor.description:
            results = cursor.fetchall()
            for row in results:
                print(row[0] if row else "")

        cursor.close()
        conn.close()

        print("\n" + "="*80)
        print("✓ Migration completed successfully!")
        print("="*80)
        print("\nCreated tables:")
        print("  - device_chat_messages")
        print("  - device_command_executions")
        print("  - device_sessions")
        print("  - technician_sessions")
        print("\nModified tables:")
        print("  - ticket_assignments (added is_primary column)")
        print("\nYou can now proceed with Phase 2 implementation.")

        return True

    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except FileNotFoundError:
        print(f"\n❌ SQL file not found: {sql_file_path}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

def main():
    print("="*80)
    print("Device Chat Schema Migration")
    print("="*80)

    # Get SQL file path
    sql_file = Path(__file__).parent / "device_chat_schema.sql"

    if not sql_file.exists():
        print(f"ERROR: Migration file not found at {sql_file}")
        sys.exit(1)

    print(f"\nMigration file: {sql_file}")

    # Get database connection URL
    db_url = get_database_url()

    # Run migration
    success = run_migration(db_url, sql_file)

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

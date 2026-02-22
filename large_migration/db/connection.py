"""
Database connection module for migration project.
Uses local PostgreSQL for document storage and metadata.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional


def get_connection():
    """
    Get a PostgreSQL connection for the migration database.
    Uses environment variables for configuration.

    Environment variables:
        PG_DB: Database name (default: 'migration')
        PG_USER: Username (default: 'postgres')
        PG_PASS: Password (default: '')
        PG_HOST: Host (default: 'localhost')
        PG_PORT: Port (default: '5432')

    Returns:
        psycopg2 connection object
    """
    return psycopg2.connect(
        database=os.getenv("PG_DB", "migration"),
        user=os.getenv("PG_USER", "postgres"),
        password=os.getenv("PG_PASS", ""),
        host=os.getenv("PG_HOST", "localhost"),
        port=os.getenv("PG_PORT", "5432"),
        cursor_factory=RealDictCursor
    )


def init_database():
    """Initialize the PostgreSQL database with required tables."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            doc_type VARCHAR(100) NOT NULL,
            doc_name VARCHAR(500) NOT NULL,
            content TEXT NOT NULL,
            parsed_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(doc_type, doc_name)
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS field_specifications (
            id SERIAL PRIMARY KEY,
            field_name VARCHAR(255) NOT NULL UNIQUE,
            data_type VARCHAR(100) NOT NULL,
            nullable BOOLEAN DEFAULT TRUE,
            default_value TEXT,
            agreement_types TEXT,
            conditional_rules TEXT,
            source_mapping TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mapping_entries (
            id SERIAL PRIMARY KEY,
            field_name VARCHAR(255) NOT NULL,
            source_db VARCHAR(255),
            source_schema VARCHAR(255),
            source_table VARCHAR(255),
            source_columns TEXT,
            transform_sql TEXT,
            join_keys TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dbt_modifications (
            id SERIAL PRIMARY KEY,
            model_name VARCHAR(255) NOT NULL,
            layer VARCHAR(50) NOT NULL,
            original_sql TEXT,
            modified_sql TEXT,
            diff_content TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            validation_result TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(model_name, layer)
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS validation_results (
            id SERIAL PRIMARY KEY,
            field_name VARCHAR(255) NOT NULL,
            check_type VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    conn.commit()
    cursor.close()
    conn.close()

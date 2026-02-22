-- Migration: Create metadata tables for PG Admin Dashboard
-- Based on PostgreSQL 18.1 docs: https://www.postgresql.org/docs/current/
-- PostgreSQL 18.1 Release Notes: https://www.postgresql.org/docs/current/release-18.html

-- Create schema for admin metadata
CREATE SCHEMA IF NOT EXISTS _pgadmin;

-- Dashboard Users (replaces file-based sessions)
-- Using uuidv7() for temporally sortable UUIDs (PostgreSQL 18+ feature)
CREATE TABLE IF NOT EXISTS _pgadmin.users (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys for programmatic access
CREATE TABLE IF NOT EXISTS _pgadmin.api_keys (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL REFERENCES _pgadmin.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(12) NOT NULL, -- For display: "sk_live_xxxx..."
    permissions JSONB DEFAULT '["read"]',
    allowed_databases TEXT[], -- NULL means all
    rate_limit_per_minute INTEGER DEFAULT 60,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved SQL queries
CREATE TABLE IF NOT EXISTS _pgadmin.saved_queries (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL REFERENCES _pgadmin.users(id) ON DELETE CASCADE,
    database_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sql TEXT NOT NULL,
    tags TEXT[],
    is_favorite BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query execution history
CREATE TABLE IF NOT EXISTS _pgadmin.query_history (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID REFERENCES _pgadmin.users(id) ON DELETE SET NULL,
    database_name VARCHAR(255) NOT NULL,
    sql TEXT NOT NULL,
    sql_hash VARCHAR(64) NOT NULL, -- For deduplication
    duration_ms INTEGER,
    rows_returned INTEGER,
    rows_affected INTEGER,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'error', 'cancelled')),
    error_message TEXT,
    error_code VARCHAR(10),
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime subscriptions tracking
CREATE TABLE IF NOT EXISTS _pgadmin.realtime_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    database_name VARCHAR(255) NOT NULL,
    schema_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    trigger_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES _pgadmin.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (replaces file-based audit)
CREATE TABLE IF NOT EXISTS _pgadmin.audit_log (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID REFERENCES _pgadmin.users(id) ON DELETE SET NULL,
    api_key_id UUID REFERENCES _pgadmin.api_keys(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    database_name VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table display preferences
CREATE TABLE IF NOT EXISTS _pgadmin.table_preferences (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL REFERENCES _pgadmin.users(id) ON DELETE CASCADE,
    database_name VARCHAR(255) NOT NULL,
    schema_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    column_order TEXT[],
    hidden_columns TEXT[],
    default_sort JSONB, -- {"column": "created_at", "direction": "desc"}
    default_filters JSONB,
    page_size INTEGER DEFAULT 50,
    UNIQUE(user_id, database_name, schema_name, table_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON _pgadmin.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON _pgadmin.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_saved_queries_user ON _pgadmin.saved_queries(user_id, database_name);
CREATE INDEX IF NOT EXISTS idx_query_history_user ON _pgadmin.query_history(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_history_hash ON _pgadmin.query_history(sql_hash, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON _pgadmin.audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON _pgadmin.audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON _pgadmin.audit_log(resource_type, resource_id);

-- Realtime notification function
-- Per PostgreSQL 18.1 docs: https://www.postgresql.org/docs/current/sql-createfunction.html
CREATE OR REPLACE FUNCTION _pgadmin.notify_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    payload = jsonb_build_object(
        'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        'operation', TG_OP,
        'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
        'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        'timestamp', NOW()
    );

    -- NOTIFY with payload (max 8000 bytes per PostgreSQL docs)
    PERFORM pg_notify('pgadmin_changes', payload::text);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION _pgadmin.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON _pgadmin.users
    FOR EACH ROW
    EXECUTE FUNCTION _pgadmin.update_updated_at();

CREATE OR REPLACE TRIGGER update_saved_queries_updated_at
    BEFORE UPDATE ON _pgadmin.saved_queries
    FOR EACH ROW
    EXECUTE FUNCTION _pgadmin.update_updated_at();

-- ============================================================================
-- MIGRATION: Add session_id and six_digit_code to device_connections
-- ============================================================================
-- This migration adds support for 6-digit pairing codes and session tracking
-- for AI service initiated Windows application connections.
--
-- Changes:
-- 1. Add session_id column (UUID for tracking sessions)
-- 2. Add six_digit_code column (SHA-256 hashed version of pairing code)
-- 3. Update default for is_active to FALSE (for new code generation)
-- 4. Add unique constraint on connection_url
-- 5. Add unique constraint on session_id
-- 6. Create indexes for faster lookups
--
-- Safe to run on existing Supabase instance (uses IF NOT EXISTS)
-- ============================================================================

-- Add session_id column if not exists
ALTER TABLE device_connections 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- Add six_digit_code column if not exists (for hashed code storage)
ALTER TABLE device_connections 
ADD COLUMN IF NOT EXISTS six_digit_code VARCHAR(255);

-- Update default for is_active to FALSE (for new code generation)
ALTER TABLE device_connections 
ALTER COLUMN is_active SET DEFAULT FALSE;

-- Add unique constraint on connection_url to ensure unique WebSocket URLs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_connection_url'
    ) THEN
        ALTER TABLE device_connections 
        ADD CONSTRAINT unique_connection_url UNIQUE (connection_url);
    END IF;
END $$;

-- Add unique constraint on session_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_session_id'
    ) THEN
        ALTER TABLE device_connections 
        ADD CONSTRAINT unique_session_id UNIQUE (session_id);
    END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_connections_session_id 
ON device_connections(session_id);

CREATE INDEX IF NOT EXISTS idx_device_connections_six_digit_code 
ON device_connections(six_digit_code);

-- Add comments for documentation
COMMENT ON COLUMN device_connections.session_id IS 'Unique session identifier for the connection (UUID)';
COMMENT ON COLUMN device_connections.six_digit_code IS 'SHA-256 hashed version of the 6-digit pairing code (stored securely, original code never stored)';


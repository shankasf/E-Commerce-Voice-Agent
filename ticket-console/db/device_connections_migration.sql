-- ============================================================================
-- MIGRATION: Add 6-digit code authentication fields to existing 
--            device_connections table (coworker's schema)
-- ============================================================================
-- This migration adds our required fields while keeping coworker's schema intact
-- Safe to run on existing table (uses IF NOT EXISTS / IF COLUMN NOT EXISTS)
-- ============================================================================

-- Add session_id for WebSocket session lookup
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'device_connections' 
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE device_connections 
        ADD COLUMN session_id UUID UNIQUE;
    END IF;
END $$;

-- Add 6-digit code authentication fields
DO $$ 
BEGIN
    -- Add hashed six_digit_code (VARCHAR(255) for bcrypt hash)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'device_connections' 
        AND column_name = 'six_digit_code'
    ) THEN
        ALTER TABLE device_connections 
        ADD COLUMN six_digit_code VARCHAR(255);
    END IF;
    
    -- Add code expiration timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'device_connections' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE device_connections 
        ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    
    -- Add code verification timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'device_connections' 
        AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE device_connections 
        ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add index for session_id lookup
CREATE INDEX IF NOT EXISTS idx_device_connections_session_id 
ON device_connections(session_id) 
WHERE session_id IS NOT NULL;

-- Add index for code lookup (where code is not null)
CREATE INDEX IF NOT EXISTS idx_device_connections_code 
ON device_connections(six_digit_code) 
WHERE six_digit_code IS NOT NULL;

-- Add index for user/device/org lookup (if not exists)
CREATE INDEX IF NOT EXISTS idx_device_connections_user_device_org 
ON device_connections(user_id, device_id, organization_id);

-- Comments for new fields
COMMENT ON COLUMN device_connections.session_id IS 'Unique UUID for WebSocket session identification';
COMMENT ON COLUMN device_connections.six_digit_code IS 'Hashed 6-digit authentication code (bcrypt). NULL after verification (one-time use)';
COMMENT ON COLUMN device_connections.expires_at IS 'Code expiration timestamp (15 minutes from creation)';
COMMENT ON COLUMN device_connections.verified_at IS 'When code was verified (one-time use)';

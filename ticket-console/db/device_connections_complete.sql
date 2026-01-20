-- ============================================================================
-- COMPLETE DEVICE CONNECTIONS SETUP
-- ============================================================================
-- Step 1: Coworker's base schema (creates table with all her fields)
-- Step 2: Migration to add our 6-digit code authentication fields
-- ============================================================================

-- ============================================================================
-- STEP 1: Coworker's Base Schema (Creates the table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_connections (
    connection_id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES contacts(contact_id) ON DELETE SET NULL,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    connection_url TEXT NOT NULL, -- WebSocket URL or MCP URL (e.g., ws://192.168.1.100:8000/mcp)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_heartbeat TIMESTAMPTZ, -- Last time device sent heartbeat
    connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Ensure only one active connection per device at a time
    CONSTRAINT unique_active_device_connection UNIQUE NULLS NOT DISTINCT (device_id, is_active)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_connections_device_id ON device_connections(device_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_organization_id ON device_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_active ON device_connections(is_active) WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (for demo purposes)
CREATE POLICY IF NOT EXISTS "Allow anonymous all" ON device_connections FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON device_connections TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE device_connections_connection_id_seq TO anon, authenticated;

-- Enable realtime for device_connections table
ALTER PUBLICATION supabase_realtime ADD TABLE device_connections;

-- Enable REPLICA IDENTITY FULL for complete UPDATE/DELETE payloads
ALTER TABLE device_connections REPLICA IDENTITY FULL;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_device_connections_updated_at
    BEFORE UPDATE ON device_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_device_connections_updated_at();

-- Comment on table
COMMENT ON TABLE device_connections IS 'Stores WebSocket/MCP connection URLs for client applications installed on IT assets';
COMMENT ON COLUMN device_connections.connection_url IS 'WebSocket or MCP URL to communicate with the device client application';
COMMENT ON COLUMN device_connections.is_active IS 'Whether this connection is currently active (only one active connection per device)';
COMMENT ON COLUMN device_connections.last_heartbeat IS 'Last heartbeat timestamp from the device';

-- ============================================================================
-- STEP 2: Add Our 6-Digit Code Authentication Fields
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

-- Add indexes for our new fields
CREATE INDEX IF NOT EXISTS idx_device_connections_session_id 
ON device_connections(session_id) 
WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_device_connections_code 
ON device_connections(six_digit_code) 
WHERE six_digit_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_device_connections_user_device_org 
ON device_connections(user_id, device_id, organization_id);

-- Comments for new fields
COMMENT ON COLUMN device_connections.session_id IS 'Unique UUID for WebSocket session identification';
COMMENT ON COLUMN device_connections.six_digit_code IS 'Hashed 6-digit authentication code (bcrypt). NULL after verification (one-time use)';
COMMENT ON COLUMN device_connections.expires_at IS 'Code expiration timestamp (15 minutes from creation)';
COMMENT ON COLUMN device_connections.verified_at IS 'When code was verified (one-time use)';

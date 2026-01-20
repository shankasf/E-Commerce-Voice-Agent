-- ============================================================================
-- DEVICE CONNECTIONS TABLE - For Windows MCP Agent / Linux Client Connections
-- ============================================================================
-- This table stores active WebSocket/MCP connection URLs for client applications
-- installed on IT assets (devices table). When a client application connects,
-- we store the connection URL to communicate with that device.
--
-- Merged schema: Combines coworker's structure with 6-digit code authentication
-- Safe to run on existing Supabase instance (uses IF NOT EXISTS)
-- ============================================================================

-- Device Connections table
CREATE TABLE IF NOT EXISTS device_connections (
    connection_id SERIAL PRIMARY KEY,
    session_id UUID UNIQUE NOT NULL, -- Unique session identifier for WebSocket connection
    device_id INTEGER NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES contacts(contact_id) ON DELETE SET NULL,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- 6-digit code authentication (for terminal bridge)
    six_digit_code VARCHAR(255), -- Hashed 6-digit code (bcrypt hash) - NULL after verification
    expires_at TIMESTAMPTZ, -- Code expiration timestamp (15 minutes from creation)
    verified_at TIMESTAMPTZ, -- When code was verified (one-time use)
    
    -- Connection URL
    websocket_url TEXT NOT NULL, -- WebSocket URL or MCP URL (e.g., ws://localhost:3001/api/device/ws?session=...&code=...)
    
    -- Connection status
    is_active BOOLEAN NOT NULL DEFAULT FALSE, -- Whether this connection is currently active
    last_heartbeat TIMESTAMPTZ, -- Last time device sent heartbeat
    connected_at TIMESTAMPTZ, -- When WebSocket connection was established
    disconnected_at TIMESTAMPTZ, -- When connection was closed
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Ensure only one active connection per device at a time
    CONSTRAINT unique_active_device_connection UNIQUE NULLS NOT DISTINCT (device_id, is_active)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_connections_session_id ON device_connections(session_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_device_id ON device_connections(device_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_organization_id ON device_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_user_device_org ON device_connections(user_id, device_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_active ON device_connections(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_device_connections_code ON device_connections(six_digit_code) WHERE six_digit_code IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (for demo purposes - restrict in production)
CREATE POLICY IF NOT EXISTS "Allow anonymous all" ON device_connections FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON device_connections TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE device_connections_connection_id_seq TO anon, authenticated;

-- Enable realtime for device_connections table
ALTER PUBLICATION supabase_realtime ADD TABLE device_connections;

-- Enable REPLICA IDENTITY FULL for complete UPDATE/DELETE payloads
ALTER TABLE device_connections REPLICA IDENTITY FULL;

-- Add trigger to update updated_at timestamp (from coworker's schema)
CREATE OR REPLACE FUNCTION update_device_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_connections_updated_at
    BEFORE UPDATE ON device_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_device_connections_updated_at();

-- Comments
COMMENT ON TABLE device_connections IS 'Stores WebSocket/MCP connection URLs for client applications installed on IT assets with 6-digit code authentication';
COMMENT ON COLUMN device_connections.session_id IS 'Unique UUID for WebSocket session identification';
COMMENT ON COLUMN device_connections.six_digit_code IS 'Hashed 6-digit authentication code (bcrypt). NULL after verification (one-time use)';
COMMENT ON COLUMN device_connections.websocket_url IS 'WebSocket or MCP URL to communicate with the device client application';
COMMENT ON COLUMN device_connections.is_active IS 'Whether this connection is currently active (only one active connection per device)';
COMMENT ON COLUMN device_connections.last_heartbeat IS 'Last heartbeat timestamp from the device';

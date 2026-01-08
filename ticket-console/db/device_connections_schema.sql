-- ============================================================================
-- DEVICE CONNECTIONS TABLE - For Windows MCP Agent / Linux Client Connections
-- ============================================================================
-- This table stores active WebSocket/MCP connection URLs for client applications
-- installed on IT assets (devices table). When a client application connects,
-- we store the connection URL to communicate with that device.
--
-- Safe to run on existing Supabase instance (uses IF NOT EXISTS)
-- ============================================================================

-- Device Connections table
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
CREATE POLICY "Allow anonymous all" ON device_connections FOR ALL USING (true);

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

CREATE TRIGGER trigger_update_device_connections_updated_at
    BEFORE UPDATE ON device_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_device_connections_updated_at();

-- Comment on table
COMMENT ON TABLE device_connections IS 'Stores WebSocket/MCP connection URLs for client applications installed on IT assets';
COMMENT ON COLUMN device_connections.connection_url IS 'WebSocket or MCP URL to communicate with the device client application';
COMMENT ON COLUMN device_connections.is_active IS 'Whether this connection is currently active (only one active connection per device)';
COMMENT ON COLUMN device_connections.last_heartbeat IS 'Last heartbeat timestamp from the device';

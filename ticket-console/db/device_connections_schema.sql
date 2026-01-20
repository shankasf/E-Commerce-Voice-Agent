-- Device Connections Table for Terminal Bridge
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS device_connections (
  connection_id SERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  user_id INTEGER REFERENCES contacts(contact_id),
  device_id INTEGER,
  organization_id INTEGER REFERENCES organizations(organization_id),
  six_digit_code VARCHAR(6), -- Nullable: cleared after verification (one-time use)
  websocket_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE, -- When code was verified (deleted)
  connected_at TIMESTAMP WITH TIME ZONE,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_connections_session_id ON device_connections(session_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_code ON device_connections(six_digit_code);
CREATE INDEX IF NOT EXISTS idx_device_connections_user_device_org ON device_connections(user_id, device_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_active ON device_connections(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (for demo purposes - restrict in production)
CREATE POLICY "Allow anonymous all" ON device_connections FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON device_connections TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE device_connections_connection_id_seq TO anon, authenticated;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE device_connections;
ALTER TABLE device_connections REPLICA IDENTITY FULL;

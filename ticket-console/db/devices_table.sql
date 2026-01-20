-- Simple devices table for testing
-- Create this BEFORE running device_connections_complete.sql

CREATE TABLE IF NOT EXISTS devices (
    device_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ONLINE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert a test device (device_id = 1, organization_id = 1)
INSERT INTO devices (device_id, organization_id, asset_name, status) VALUES 
    (1, 1, 'Test Device', 'ONLINE')
ON CONFLICT (device_id) DO NOTHING;

-- Enable RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY IF NOT EXISTS "Allow anonymous all" ON devices FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON devices TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE devices_device_id_seq TO anon, authenticated;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER TABLE devices REPLICA IDENTITY FULL;

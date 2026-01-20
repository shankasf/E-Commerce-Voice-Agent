-- ============================================================================
-- COMPLETE DATABASE SETUP FOR TICKET-CONSOLE
-- ============================================================================
-- Run this entire file in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/moowdckeeuvxwjoblrwg/sql/new
-- ============================================================================

-- ============================================================================
-- STEP 1: Base Schema (Organizations, Contacts, Tickets, etc.)
-- ============================================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    u_e_code INTEGER UNIQUE,
    manager_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table (ticket requesters)
CREATE TABLE IF NOT EXISTS contacts (
    contact_id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Agents table
CREATE TABLE IF NOT EXISTS support_agents (
    support_agent_id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    agent_type VARCHAR(20) DEFAULT 'Human' CHECK (agent_type IN ('Bot', 'Human')),
    specialization VARCHAR(255),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket Statuses lookup table
CREATE TABLE IF NOT EXISTS ticket_statuses (
    status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Insert default statuses
INSERT INTO ticket_statuses (status_id, name) VALUES 
    (1, 'Open'),
    (2, 'In Progress'),
    (3, 'Awaiting Customer'),
    (4, 'Escalated'),
    (5, 'Resolved'),
    (6, 'Closed')
ON CONFLICT (status_id) DO NOTHING;

-- Ticket Priorities lookup table
CREATE TABLE IF NOT EXISTS ticket_priorities (
    priority_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#gray'
);

-- Insert default priorities
INSERT INTO ticket_priorities (priority_id, name, color) VALUES 
    (1, 'Low', '#gray'),
    (2, 'Medium', '#blue'),
    (3, 'High', '#orange'),
    (4, 'Critical', '#red')
ON CONFLICT (priority_id) DO NOTHING;

-- Support Tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    contact_id INTEGER REFERENCES contacts(contact_id),
    device_id INTEGER,
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    status_id INTEGER DEFAULT 1 REFERENCES ticket_statuses(status_id),
    priority_id INTEGER DEFAULT 2 REFERENCES ticket_priorities(priority_id),
    requires_human_agent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Ticket Messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    sender_agent_id INTEGER REFERENCES support_agents(support_agent_id),
    sender_contact_id INTEGER REFERENCES contacts(contact_id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket Assignments table
CREATE TABLE IF NOT EXISTS ticket_assignments (
    assignment_id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES support_agents(support_agent_id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE
);

-- Insert sample organization
INSERT INTO organizations (organization_id, name, u_e_code) VALUES 
    (1, 'ACME Corporation', 10001)
ON CONFLICT (organization_id) DO NOTHING;

-- Insert sample contact (requester)
INSERT INTO contacts (contact_id, organization_id, full_name, email, phone) VALUES 
    (1, 1, 'John Smith', 'john.smith@acmecorp.com', '+1-555-0101')
ON CONFLICT (contact_id) DO NOTHING;

-- Insert sample support agent
INSERT INTO support_agents (support_agent_id, full_name, email, agent_type, is_available) VALUES 
    (1, 'Tech Support', 'support@urackit.com', 'Human', true)
ON CONFLICT (support_agent_id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for demo purposes)
DROP POLICY IF EXISTS "Allow anonymous read all" ON organizations;
CREATE POLICY "Allow anonymous read all" ON organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read all" ON contacts;
CREATE POLICY "Allow anonymous read all" ON contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read all" ON support_agents;
CREATE POLICY "Allow anonymous read all" ON support_agents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read all" ON ticket_statuses;
CREATE POLICY "Allow anonymous read all" ON ticket_statuses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read all" ON ticket_priorities;
CREATE POLICY "Allow anonymous read all" ON ticket_priorities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous all" ON support_tickets;
CREATE POLICY "Allow anonymous all" ON support_tickets FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all" ON ticket_messages;
CREATE POLICY "Allow anonymous all" ON ticket_messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all" ON ticket_assignments;
CREATE POLICY "Allow anonymous all" ON ticket_assignments FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON organizations TO anon, authenticated;
GRANT ALL ON contacts TO anon, authenticated;
GRANT ALL ON support_agents TO anon, authenticated;
GRANT ALL ON ticket_statuses TO anon, authenticated;
GRANT ALL ON ticket_priorities TO anon, authenticated;
GRANT ALL ON support_tickets TO anon, authenticated;
GRANT ALL ON ticket_messages TO anon, authenticated;
GRANT ALL ON ticket_assignments TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable Realtime for base tables
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE support_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_priorities;

-- Enable REPLICA IDENTITY FULL on base tables
ALTER TABLE support_tickets REPLICA IDENTITY FULL;
ALTER TABLE ticket_messages REPLICA IDENTITY FULL;
ALTER TABLE ticket_assignments REPLICA IDENTITY FULL;
ALTER TABLE contacts REPLICA IDENTITY FULL;
ALTER TABLE support_agents REPLICA IDENTITY FULL;
ALTER TABLE organizations REPLICA IDENTITY FULL;
ALTER TABLE ticket_statuses REPLICA IDENTITY FULL;
ALTER TABLE ticket_priorities REPLICA IDENTITY FULL;

-- ============================================================================
-- STEP 2: Devices Table (needed for device_connections)
-- ============================================================================

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
DROP POLICY IF EXISTS "Allow anonymous all" ON devices;
CREATE POLICY "Allow anonymous all" ON devices FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON devices TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE devices_device_id_seq TO anon, authenticated;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER TABLE devices REPLICA IDENTITY FULL;

-- ============================================================================
-- STEP 3: Device Connections Table (with 6-digit code authentication)
-- ============================================================================

-- Device Connections table (coworker's base schema)
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
DROP POLICY IF EXISTS "Allow anonymous all" ON device_connections;
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

DROP TRIGGER IF EXISTS trigger_update_device_connections_updated_at ON device_connections;
CREATE TRIGGER trigger_update_device_connections_updated_at
    BEFORE UPDATE ON device_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_device_connections_updated_at();

-- Comment on table
COMMENT ON TABLE device_connections IS 'Stores WebSocket/MCP connection URLs for client applications installed on IT assets';
COMMENT ON COLUMN device_connections.connection_url IS 'WebSocket or MCP URL to communicate with the device client application';
COMMENT ON COLUMN device_connections.is_active IS 'Whether this connection is currently active (only one active connection per device)';
COMMENT ON COLUMN device_connections.last_heartbeat IS 'Last heartbeat timestamp from the device';

-- ============================================================================
-- STEP 4: Add 6-Digit Code Authentication Fields
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

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Ticket Management System Schema for U Rack IT
-- Run this in Supabase SQL Editor

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

-- Enable Row Level Security (optional but recommended)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for demo purposes)
CREATE POLICY "Allow anonymous read all" ON organizations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read all" ON contacts FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read all" ON support_agents FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read all" ON ticket_statuses FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read all" ON ticket_priorities FOR SELECT USING (true);
CREATE POLICY "Allow anonymous all" ON support_tickets FOR ALL USING (true);
CREATE POLICY "Allow anonymous all" ON ticket_messages FOR ALL USING (true);
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

-- ============================================
-- ENABLE REALTIME FOR ALL TABLES
-- ============================================
-- Add ALL tables to supabase_realtime publication for real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE support_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_priorities;

-- Enable REPLICA IDENTITY FULL on ALL tables for complete UPDATE/DELETE payloads
ALTER TABLE support_tickets REPLICA IDENTITY FULL;
ALTER TABLE ticket_messages REPLICA IDENTITY FULL;
ALTER TABLE ticket_assignments REPLICA IDENTITY FULL;
ALTER TABLE contacts REPLICA IDENTITY FULL;
ALTER TABLE support_agents REPLICA IDENTITY FULL;
ALTER TABLE organizations REPLICA IDENTITY FULL;
ALTER TABLE ticket_statuses REPLICA IDENTITY FULL;
ALTER TABLE ticket_priorities REPLICA IDENTITY FULL;

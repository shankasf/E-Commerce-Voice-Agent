-- Schema for a ticket/escalation management multi‑agent chatbot system
-- This version renames the previous tables and columns for better clarity.

-- Drop existing tables and types if they exist.
DO
$do$
BEGIN
    IF to_regclass('public.ticket_messages') IS NOT NULL THEN DROP TABLE ticket_messages CASCADE; END IF;
    IF to_regclass('public.ticket_escalations') IS NOT NULL THEN DROP TABLE ticket_escalations CASCADE; END IF;
    IF to_regclass('public.ticket_assignments') IS NOT NULL THEN DROP TABLE ticket_assignments CASCADE; END IF;
    IF to_regclass('public.support_tickets') IS NOT NULL THEN DROP TABLE support_tickets CASCADE; END IF;
    IF to_regclass('public.contact_devices') IS NOT NULL THEN DROP TABLE contact_devices CASCADE; END IF;
    IF to_regclass('public.contacts') IS NOT NULL THEN DROP TABLE contacts CASCADE; END IF;
    IF to_regclass('public.devices') IS NOT NULL THEN DROP TABLE devices CASCADE; END IF;
    IF to_regclass('public.locations') IS NOT NULL THEN DROP TABLE locations CASCADE; END IF;
    IF to_regclass('public.organizations') IS NOT NULL THEN DROP TABLE organizations CASCADE; END IF;
    IF to_regclass('public.account_managers') IS NOT NULL THEN DROP TABLE account_managers CASCADE; END IF;
    IF to_regclass('public.support_agents') IS NOT NULL THEN DROP TABLE support_agents CASCADE; END IF;
    IF to_regclass('public.device_manufacturers') IS NOT NULL THEN DROP TABLE device_manufacturers CASCADE; END IF;
    IF to_regclass('public.device_models') IS NOT NULL THEN DROP TABLE device_models CASCADE; END IF;
    IF to_regclass('public.operating_systems') IS NOT NULL THEN DROP TABLE operating_systems CASCADE; END IF;
    IF to_regclass('public.domains') IS NOT NULL THEN DROP TABLE domains CASCADE; END IF;
    IF to_regclass('public.device_types') IS NOT NULL THEN DROP TABLE device_types CASCADE; END IF;
    IF to_regclass('public.update_statuses') IS NOT NULL THEN DROP TABLE update_statuses CASCADE; END IF;
    IF to_regclass('public.processor_models') IS NOT NULL THEN DROP TABLE processor_models CASCADE; END IF;
    IF to_regclass('public.processor_architectures') IS NOT NULL THEN DROP TABLE processor_architectures CASCADE; END IF;
    IF to_regclass('public.ticket_statuses') IS NOT NULL THEN DROP TABLE ticket_statuses CASCADE; END IF;
    IF to_regclass('public.ticket_priorities') IS NOT NULL THEN DROP TABLE ticket_priorities CASCADE; END IF;
    -- Drop types
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type_enum') THEN DROP TYPE location_type_enum; END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_agent_type_enum') THEN DROP TYPE support_agent_type_enum; END IF;
END
$do$;

-- Enumerated types
CREATE TYPE location_type_enum AS ENUM (
    'Headquarters',
    'Data Center',
    'Support',
    'Remote',
    'Other'
);

CREATE TYPE support_agent_type_enum AS ENUM (
    'Bot',
    'Human'
);

-- Dimension tables
CREATE TABLE device_manufacturers (
    manufacturer_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE device_models (
    model_id SERIAL PRIMARY KEY,
    manufacturer_id INTEGER REFERENCES device_manufacturers(manufacturer_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT device_models_unique UNIQUE (manufacturer_id, name)
);

CREATE TABLE operating_systems (
    os_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE domains (
    domain_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE device_types (
    device_type_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE update_statuses (
    update_status_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE processor_models (
    processor_id SERIAL PRIMARY KEY,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    CONSTRAINT processor_models_unique UNIQUE (manufacturer, model)
);

CREATE TABLE processor_architectures (
    architecture_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE ticket_statuses (
    status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE ticket_priorities (
    priority_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- Core tables
CREATE TABLE account_managers (
    manager_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organizations (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    u_e_code INTEGER NOT NULL UNIQUE,
    manager_id INTEGER REFERENCES account_managers(manager_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location_type location_type_enum NOT NULL DEFAULT 'Other',
    requires_human_agent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devices (
    device_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ONLINE','OFFLINE')),
    manufacturer_id INTEGER REFERENCES device_manufacturers(manufacturer_id) ON DELETE SET NULL,
    model_id INTEGER REFERENCES device_models(model_id) ON DELETE SET NULL,
    host_name VARCHAR(255),
    public_ip INET,
    gateway INET,
    os_id INTEGER REFERENCES operating_systems(os_id) ON DELETE SET NULL,
    domain_id INTEGER REFERENCES domains(domain_id) ON DELETE SET NULL,
    os_version VARCHAR(255),
    system_uptime INTERVAL,
    last_logged_in_by VARCHAR(255),
    device_type_id INTEGER REFERENCES device_types(device_type_id) ON DELETE SET NULL,
    last_reported_time TIMESTAMPTZ,
    update_status_id INTEGER REFERENCES update_statuses(update_status_id) ON DELETE SET NULL,
    processor_id INTEGER REFERENCES processor_models(processor_id) ON DELETE SET NULL,
    architecture_id INTEGER REFERENCES processor_architectures(architecture_id) ON DELETE SET NULL,
    total_memory BIGINT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contacts (
    contact_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contacts_unique_email UNIQUE (organization_id, email)
);

CREATE TABLE contact_devices (
    contact_id INTEGER NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMPTZ,
    PRIMARY KEY (contact_id, device_id, assigned_at)
);

CREATE TABLE support_agents (
    support_agent_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    agent_type support_agent_type_enum NOT NULL,
    specialization VARCHAR(255),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(device_id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(location_id) ON DELETE SET NULL,
    subject VARCHAR(255),
    description TEXT,
    status_id INTEGER REFERENCES ticket_statuses(status_id) ON DELETE SET NULL,
    priority_id INTEGER REFERENCES ticket_priorities(priority_id) ON DELETE SET NULL,
    requires_human_agent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ
);

CREATE TABLE ticket_assignments (
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    support_agent_id INTEGER NOT NULL REFERENCES support_agents(support_agent_id) ON DELETE CASCADE,
    assignment_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assignment_end TIMESTAMPTZ,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (ticket_id, support_agent_id, assignment_start)
);

CREATE TABLE ticket_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    sender_agent_id INTEGER REFERENCES support_agents(support_agent_id) ON DELETE SET NULL,
    sender_contact_id INTEGER REFERENCES contacts(contact_id) ON DELETE SET NULL,
    message_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    CONSTRAINT exactly_one_sender CHECK (
        (sender_agent_id IS NOT NULL AND sender_contact_id IS NULL) OR
        (sender_agent_id IS NULL AND sender_contact_id IS NOT NULL)
    )
);

CREATE TABLE ticket_escalations (
    escalation_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    from_agent_id INTEGER REFERENCES support_agents(support_agent_id) ON DELETE SET NULL,
    to_agent_id INTEGER REFERENCES support_agents(support_agent_id) ON DELETE SET NULL,
    escalation_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- Insert default statuses and priorities
INSERT INTO ticket_statuses (name, description) VALUES
    ('Open', 'Newly created ticket awaiting assignment'),
    ('In Progress', 'Ticket is being worked on'),
    ('Awaiting Customer', 'Waiting for customer response'),
    ('Escalated', 'Ticket has been escalated to another agent or tier'),
    ('Resolved', 'Issue has been fixed'),
    ('Closed', 'Ticket is closed')
ON CONFLICT (name) DO NOTHING;

INSERT INTO ticket_priorities (name, description) VALUES
    ('Low', 'Non‑urgent issues'),
    ('Medium', 'Standard priority'),
    ('High', 'Important issues requiring quick resolution'),
    ('Critical', 'System down or urgent business impact')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_priorities ENABLE ROW LEVEL SECURITY;

-- Create policies for access (allow all for demo)
CREATE POLICY "allow_all" ON organizations FOR ALL USING (true);
CREATE POLICY "allow_all" ON contacts FOR ALL USING (true);
CREATE POLICY "allow_all" ON support_agents FOR ALL USING (true);
CREATE POLICY "allow_all" ON support_tickets FOR ALL USING (true);
CREATE POLICY "allow_all" ON ticket_messages FOR ALL USING (true);
CREATE POLICY "allow_all" ON ticket_assignments FOR ALL USING (true);
CREATE POLICY "allow_all" ON ticket_escalations FOR ALL USING (true);
CREATE POLICY "allow_all" ON devices FOR ALL USING (true);
CREATE POLICY "allow_all" ON locations FOR ALL USING (true);
CREATE POLICY "allow_all" ON contact_devices FOR ALL USING (true);
CREATE POLICY "allow_all" ON account_managers FOR ALL USING (true);
CREATE POLICY "allow_all" ON ticket_statuses FOR ALL USING (true);
CREATE POLICY "allow_all" ON ticket_priorities FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- ENABLE REALTIME FOR ALL TABLES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_escalations;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE support_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
ALTER PUBLICATION supabase_realtime ADD TABLE contact_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE account_managers;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_priorities;

-- Enable REPLICA IDENTITY FULL on all tables for complete UPDATE/DELETE payloads
ALTER TABLE support_tickets REPLICA IDENTITY FULL;
ALTER TABLE ticket_messages REPLICA IDENTITY FULL;
ALTER TABLE ticket_assignments REPLICA IDENTITY FULL;
ALTER TABLE ticket_escalations REPLICA IDENTITY FULL;
ALTER TABLE contacts REPLICA IDENTITY FULL;
ALTER TABLE support_agents REPLICA IDENTITY FULL;
ALTER TABLE organizations REPLICA IDENTITY FULL;
ALTER TABLE devices REPLICA IDENTITY FULL;
ALTER TABLE locations REPLICA IDENTITY FULL;
ALTER TABLE contact_devices REPLICA IDENTITY FULL;
ALTER TABLE account_managers REPLICA IDENTITY FULL;

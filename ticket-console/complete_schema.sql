-- ============================================================================
-- U RACK IT VOICE AGENT - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This file combines:
--   1. ticket_management_schema.sql - Core ticket/support system tables
--   2. dashboard_schema.sql - Analytics and dashboard tables
--   3. seed_from_excel.sql - Initial data from Client_URackIT.csv + Endpoints_URackIT.csv
--
-- Safe to run on fresh Supabase instance or re-run (uses IF NOT EXISTS, ON CONFLICT)
-- ============================================================================

-- ============================================================================
-- SECTION 1: DROP EXISTING TABLES (CLEAN START)
-- ============================================================================

DO
$do$
BEGIN
    -- Drop dashboard/analytics tables
    IF to_regclass('public.conversation_analysis') IS NOT NULL THEN DROP TABLE conversation_analysis CASCADE; END IF;
    IF to_regclass('public.customer_metrics') IS NOT NULL THEN DROP TABLE customer_metrics CASCADE; END IF;
    IF to_regclass('public.hourly_metrics') IS NOT NULL THEN DROP TABLE hourly_metrics CASCADE; END IF;
    IF to_regclass('public.daily_metrics') IS NOT NULL THEN DROP TABLE daily_metrics CASCADE; END IF;
    IF to_regclass('public.system_health_logs') IS NOT NULL THEN DROP TABLE system_health_logs CASCADE; END IF;
    IF to_regclass('public.twilio_usage_logs') IS NOT NULL THEN DROP TABLE twilio_usage_logs CASCADE; END IF;
    IF to_regclass('public.ai_usage_logs') IS NOT NULL THEN DROP TABLE ai_usage_logs CASCADE; END IF;
    IF to_regclass('public.agent_interactions') IS NOT NULL THEN DROP TABLE agent_interactions CASCADE; END IF;
    IF to_regclass('public.call_logs') IS NOT NULL THEN DROP TABLE call_logs CASCADE; END IF;
    
    -- Drop ticket management tables
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

-- Drop views if exist
DROP VIEW IF EXISTS v_today_snapshot CASCADE;
DROP VIEW IF EXISTS v_agent_distribution CASCADE;
DROP VIEW IF EXISTS v_hourly_calls CASCADE;
DROP VIEW IF EXISTS v_cost_summary CASCADE;
DROP FUNCTION IF EXISTS aggregate_daily_metrics(DATE) CASCADE;


-- ============================================================================
-- SECTION 2: ENUMERATED TYPES
-- ============================================================================

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


-- ============================================================================
-- SECTION 3: DIMENSION/LOOKUP TABLES
-- ============================================================================

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


-- ============================================================================
-- SECTION 4: CORE BUSINESS TABLES
-- ============================================================================

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


-- ============================================================================
-- SECTION 5: TICKET MANAGEMENT TABLES
-- ============================================================================

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


-- ============================================================================
-- SECTION 6: DASHBOARD & ANALYTICS TABLES
-- ============================================================================

-- Call logs for voice interactions (extended version)
CREATE TABLE call_logs (
    call_id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100),
    call_sid VARCHAR(64) UNIQUE,
    
    -- Caller Info
    caller_phone VARCHAR(50),
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    caller_name VARCHAR(255),
    company_name VARCHAR(255),
    organization_id INTEGER REFERENCES organizations(organization_id),
    contact_id INTEGER REFERENCES contacts(contact_id),
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    wait_time_seconds INTEGER DEFAULT 0,
    
    -- Call Status
    status VARCHAR(50) DEFAULT 'in_progress',
    direction VARCHAR(20) DEFAULT 'inbound',
    was_abandoned BOOLEAN DEFAULT FALSE,
    abandon_reason VARCHAR(255),
    
    -- AI Resolution
    ai_resolution BOOLEAN DEFAULT TRUE,
    was_resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(50),
    resolution_notes TEXT,
    
    -- Transfers & Escalation
    escalated BOOLEAN DEFAULT FALSE,
    was_escalated BOOLEAN DEFAULT FALSE,
    escalated_to VARCHAR(100),
    escalation_reason TEXT,
    
    -- Ticket
    ticket_created BOOLEAN DEFAULT FALSE,
    ticket_id INTEGER REFERENCES support_tickets(ticket_id) ON DELETE SET NULL,
    
    -- Agent & Issue
    agent_type VARCHAR(64) DEFAULT 'triage_agent',
    issue_category VARCHAR(128),
    sentiment VARCHAR(32),
    
    -- Quality
    call_quality_score DECIMAL(3,2),
    customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
    
    -- Transcript
    transcript TEXT,
    call_summary TEXT,
    
    -- Metadata
    caller_location VARCHAR(100),
    device_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_call_logs_started_at ON call_logs(started_at);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_call_logs_organization ON call_logs(organization_id);
CREATE INDEX idx_call_logs_ai_resolution ON call_logs(ai_resolution);
CREATE INDEX idx_call_logs_agent_type ON call_logs(agent_type);
CREATE INDEX idx_call_logs_issue_category ON call_logs(issue_category);
CREATE INDEX idx_call_logs_call_sid ON call_logs(call_sid);


-- Agent interactions
CREATE TABLE agent_interactions (
    interaction_id SERIAL PRIMARY KEY,
    call_id VARCHAR(100) REFERENCES call_logs(call_id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    
    agent_type VARCHAR(50) NOT NULL,
    agent_name VARCHAR(100),
    
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    duration_ms INTEGER DEFAULT 0,
    
    turn_count INTEGER DEFAULT 0,
    user_message TEXT,
    agent_response TEXT,
    
    confidence_score DECIMAL(4,3),
    was_fallback BOOLEAN DEFAULT FALSE,
    was_handoff BOOLEAN DEFAULT FALSE,
    handoff_to VARCHAR(100),
    
    tools_called JSONB DEFAULT '[]',
    tool_call_count INTEGER DEFAULT 0,
    failed_tool_calls INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_interactions_call ON agent_interactions(call_id);
CREATE INDEX idx_agent_interactions_agent ON agent_interactions(agent_type);
CREATE INDEX idx_agent_interactions_started ON agent_interactions(started_at);


-- AI usage logs for cost tracking
CREATE TABLE ai_usage_logs (
    usage_id SERIAL PRIMARY KEY,
    call_id VARCHAR(100) REFERENCES call_logs(call_id) ON DELETE CASCADE,
    call_sid VARCHAR(64),
    session_id VARCHAR(100),
    interaction_id INTEGER REFERENCES agent_interactions(interaction_id) ON DELETE CASCADE,
    
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-realtime',
    model_type VARCHAR(50),
    agent_type VARCHAR(64),
    
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,
    reasoning_tokens INTEGER DEFAULT 0,
    audio_tokens INTEGER DEFAULT 0,
    
    input_cost_cents DECIMAL(10,4) DEFAULT 0,
    output_cost_cents DECIMAL(10,4) DEFAULT 0,
    total_cost_cents DECIMAL(10,4) DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0,
    
    api_latency_ms INTEGER,
    response_time_ms INTEGER DEFAULT 0,
    request_id VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_usage_call ON ai_usage_logs(call_id);
CREATE INDEX idx_ai_usage_call_sid ON ai_usage_logs(call_sid);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_model ON ai_usage_logs(model);


-- Twilio usage logs
CREATE TABLE twilio_usage_logs (
    usage_id SERIAL PRIMARY KEY,
    call_id VARCHAR(100) REFERENCES call_logs(call_id) ON DELETE CASCADE,
    twilio_call_sid VARCHAR(100),
    
    duration_seconds INTEGER DEFAULT 0,
    billable_minutes DECIMAL(10,2) DEFAULT 0,
    cost_cents DECIMAL(10,4) DEFAULT 0,
    
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    call_status VARCHAR(50),
    
    has_recording BOOLEAN DEFAULT FALSE,
    recording_duration_seconds INTEGER DEFAULT 0,
    recording_sid VARCHAR(100),
    
    is_conference BOOLEAN DEFAULT FALSE,
    conference_sid VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_twilio_usage_call ON twilio_usage_logs(call_id);
CREATE INDEX idx_twilio_usage_created ON twilio_usage_logs(created_at);


-- System health logs
CREATE TABLE system_health_logs (
    log_id SERIAL PRIMARY KEY,
    
    cpu_usage_percent DECIMAL(5,2),
    cpu_percent NUMERIC(5, 2),
    memory_usage_mb INTEGER,
    memory_mb INTEGER,
    memory_total_mb INTEGER,
    disk_usage_percent DECIMAL(5,2),
    disk_percent NUMERIC(5, 2),
    
    active_sessions INTEGER DEFAULT 0,
    max_sessions INTEGER DEFAULT 100,
    websocket_connections INTEGER DEFAULT 0,
    
    api_response_time_ms INTEGER,
    avg_response_time_ms INTEGER,
    p95_response_time_ms INTEGER,
    openai_latency_ms INTEGER,
    twilio_latency_ms INTEGER,
    database_latency_ms INTEGER,
    
    error_count_5xx INTEGER DEFAULT 0,
    error_count_4xx INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,
    
    uptime_seconds BIGINT DEFAULT 0,
    pm2_restarts INTEGER DEFAULT 0,
    
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_health_recorded ON system_health_logs(recorded_at);


-- Daily aggregated metrics
CREATE TABLE daily_metrics (
    date DATE PRIMARY KEY,
    
    total_calls INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    abandoned_calls INTEGER DEFAULT 0,
    avg_call_duration_seconds INTEGER DEFAULT 0,
    max_call_duration_seconds INTEGER DEFAULT 0,
    avg_wait_time_seconds INTEGER DEFAULT 0,
    peak_concurrent_calls INTEGER DEFAULT 0,
    
    ai_resolved_calls INTEGER DEFAULT 0,
    human_escalated_calls INTEGER DEFAULT 0,
    ai_resolution_rate DECIMAL(5,4) DEFAULT 0,
    avg_ai_response_time_ms INTEGER DEFAULT 0,
    total_tool_calls INTEGER DEFAULT 0,
    failed_tool_calls INTEGER DEFAULT 0,
    avg_turns_per_call DECIMAL(5,2) DEFAULT 0,
    fallback_responses INTEGER DEFAULT 0,
    
    triage_agent_calls INTEGER DEFAULT 0,
    email_agent_calls INTEGER DEFAULT 0,
    network_agent_calls INTEGER DEFAULT 0,
    printer_agent_calls INTEGER DEFAULT 0,
    computer_agent_calls INTEGER DEFAULT 0,
    phone_agent_calls INTEGER DEFAULT 0,
    security_agent_calls INTEGER DEFAULT 0,
    ticket_agent_calls INTEGER DEFAULT 0,
    device_agent_calls INTEGER DEFAULT 0,
    lookup_agent_calls INTEGER DEFAULT 0,
    servicedesk_agent_calls INTEGER DEFAULT 0,
    
    tickets_created INTEGER DEFAULT 0,
    tickets_resolved INTEGER DEFAULT 0,
    tickets_escalated INTEGER DEFAULT 0,
    avg_ticket_resolution_hours DECIMAL(10,2) DEFAULT 0,
    
    unique_callers INTEGER DEFAULT 0,
    repeat_callers INTEGER DEFAULT 0,
    new_callers INTEGER DEFAULT 0,
    avg_csat_score DECIMAL(3,2) DEFAULT 0,
    
    total_ai_tokens INTEGER DEFAULT 0,
    total_ai_cost_cents DECIMAL(12,4) DEFAULT 0,
    total_twilio_minutes DECIMAL(10,2) DEFAULT 0,
    total_twilio_cost_cents DECIMAL(12,4) DEFAULT 0,
    total_cost_cents DECIMAL(12,4) DEFAULT 0,
    cost_per_call_cents DECIMAL(10,4) DEFAULT 0,
    cost_per_resolution_cents DECIMAL(10,4) DEFAULT 0,
    
    avg_uptime_percent DECIMAL(5,4) DEFAULT 1,
    total_errors INTEGER DEFAULT 0,
    avg_api_latency_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- Hourly metrics for charts
CREATE TABLE hourly_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    
    call_count INTEGER DEFAULT 0,
    avg_duration_seconds INTEGER DEFAULT 0,
    ai_resolved_count INTEGER DEFAULT 0,
    escalated_count INTEGER DEFAULT 0,
    
    UNIQUE(date, hour)
);

CREATE INDEX idx_hourly_metrics_date ON hourly_metrics(date);


-- Customer tracking
CREATE TABLE customer_metrics (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(contact_id),
    organization_id INTEGER REFERENCES organizations(organization_id),
    caller_phone VARCHAR(50),
    
    total_calls INTEGER DEFAULT 0,
    total_tickets INTEGER DEFAULT 0,
    first_call_at TIMESTAMPTZ,
    last_call_at TIMESTAMPTZ,
    
    avg_csat_score DECIMAL(3,2),
    nps_score INTEGER,
    
    repeat_issue_count INTEGER DEFAULT 0,
    avg_calls_per_resolution DECIMAL(5,2) DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_metrics_phone ON customer_metrics(caller_phone);
CREATE INDEX idx_customer_metrics_org ON customer_metrics(organization_id);


-- Conversation analysis
CREATE TABLE conversation_analysis (
    analysis_id SERIAL PRIMARY KEY,
    call_id VARCHAR(100) REFERENCES call_logs(call_id) ON DELETE CASCADE,
    
    overall_sentiment VARCHAR(20),
    sentiment_score DECIMAL(4,3),
    
    keywords JSONB DEFAULT '[]',
    
    detected_intent VARCHAR(100),
    intent_confidence DECIMAL(4,3),
    
    issue_category VARCHAR(100),
    issue_subcategory VARCHAR(100),
    
    unanswered_questions JSONB DEFAULT '[]',
    knowledge_gap_detected BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_analysis_call ON conversation_analysis(call_id);
CREATE INDEX idx_conversation_analysis_intent ON conversation_analysis(detected_intent);


-- ============================================================================
-- SECTION 7: DATABASE VIEWS
-- ============================================================================

-- Today's snapshot view
CREATE OR REPLACE VIEW v_today_snapshot AS
SELECT
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE was_resolved AND resolved_by = 'ai') as ai_resolved,
    COUNT(*) FILTER (WHERE was_escalated) as escalated,
    COUNT(*) FILTER (WHERE was_abandoned) as abandoned,
    COALESCE(AVG(duration_seconds), 0)::INTEGER as avg_duration,
    COUNT(*) FILTER (WHERE status = 'in_progress') as active_calls,
    COALESCE(AVG(customer_satisfaction), 0)::DECIMAL(3,2) as avg_csat
FROM call_logs
WHERE started_at >= CURRENT_DATE;

-- Agent distribution view
CREATE OR REPLACE VIEW v_agent_distribution AS
SELECT
    agent_type,
    COUNT(*) as call_count,
    ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) as percentage,
    AVG(duration_ms)::INTEGER as avg_duration_ms,
    SUM(tool_call_count) as total_tool_calls,
    SUM(CASE WHEN was_fallback THEN 1 ELSE 0 END) as fallback_count
FROM agent_interactions
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY agent_type
ORDER BY call_count DESC;

-- Hourly call distribution view
CREATE OR REPLACE VIEW v_hourly_calls AS
SELECT
    EXTRACT(HOUR FROM started_at)::INTEGER as hour,
    COUNT(*) as call_count,
    COUNT(*) FILTER (WHERE was_resolved) as resolved_count
FROM call_logs
WHERE started_at >= CURRENT_DATE
GROUP BY EXTRACT(HOUR FROM started_at)
ORDER BY hour;

-- Cost summary view
CREATE OR REPLACE VIEW v_cost_summary AS
SELECT
    CURRENT_DATE as date,
    COALESCE(SUM(au.total_tokens), 0) as total_ai_tokens,
    COALESCE(SUM(au.total_cost_cents), 0) / 100.0 as total_ai_cost_usd,
    COALESCE(SUM(tu.billable_minutes), 0) as total_twilio_minutes,
    COALESCE(SUM(tu.cost_cents), 0) / 100.0 as total_twilio_cost_usd,
    (COALESCE(SUM(au.total_cost_cents), 0) + COALESCE(SUM(tu.cost_cents), 0)) / 100.0 as total_cost_usd
FROM call_logs cl
LEFT JOIN ai_usage_logs au ON cl.call_id = au.call_id
LEFT JOIN twilio_usage_logs tu ON cl.call_id = tu.call_id
WHERE cl.started_at >= CURRENT_DATE;


-- ============================================================================
-- SECTION 8: DATABASE FUNCTIONS
-- ============================================================================

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_metrics (date, total_calls, completed_calls, abandoned_calls, 
        avg_call_duration_seconds, max_call_duration_seconds, avg_wait_time_seconds,
        ai_resolved_calls, human_escalated_calls, ai_resolution_rate,
        unique_callers, total_ai_tokens, total_ai_cost_cents, 
        total_twilio_minutes, total_twilio_cost_cents, total_cost_cents)
    SELECT
        target_date,
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE was_abandoned),
        COALESCE(AVG(duration_seconds), 0)::INTEGER,
        COALESCE(MAX(duration_seconds), 0),
        COALESCE(AVG(wait_time_seconds), 0)::INTEGER,
        COUNT(*) FILTER (WHERE was_resolved AND resolved_by = 'ai'),
        COUNT(*) FILTER (WHERE was_escalated),
        CASE WHEN COUNT(*) > 0 
            THEN COUNT(*) FILTER (WHERE was_resolved AND resolved_by = 'ai')::DECIMAL / COUNT(*) 
            ELSE 0 END,
        COUNT(DISTINCT caller_phone),
        COALESCE((SELECT SUM(total_tokens) FROM ai_usage_logs WHERE DATE(created_at) = target_date), 0),
        COALESCE((SELECT SUM(total_cost_cents) FROM ai_usage_logs WHERE DATE(created_at) = target_date), 0),
        COALESCE((SELECT SUM(billable_minutes) FROM twilio_usage_logs WHERE DATE(created_at) = target_date), 0),
        COALESCE((SELECT SUM(cost_cents) FROM twilio_usage_logs WHERE DATE(created_at) = target_date), 0),
        COALESCE((SELECT SUM(total_cost_cents) FROM ai_usage_logs WHERE DATE(created_at) = target_date), 0) +
        COALESCE((SELECT SUM(cost_cents) FROM twilio_usage_logs WHERE DATE(created_at) = target_date), 0)
    FROM call_logs
    WHERE DATE(started_at) = target_date
    ON CONFLICT (date) DO UPDATE SET
        total_calls = EXCLUDED.total_calls,
        completed_calls = EXCLUDED.completed_calls,
        abandoned_calls = EXCLUDED.abandoned_calls,
        avg_call_duration_seconds = EXCLUDED.avg_call_duration_seconds,
        max_call_duration_seconds = EXCLUDED.max_call_duration_seconds,
        avg_wait_time_seconds = EXCLUDED.avg_wait_time_seconds,
        ai_resolved_calls = EXCLUDED.ai_resolved_calls,
        human_escalated_calls = EXCLUDED.human_escalated_calls,
        ai_resolution_rate = EXCLUDED.ai_resolution_rate,
        unique_callers = EXCLUDED.unique_callers,
        total_ai_tokens = EXCLUDED.total_ai_tokens,
        total_ai_cost_cents = EXCLUDED.total_ai_cost_cents,
        total_twilio_minutes = EXCLUDED.total_twilio_minutes,
        total_twilio_cost_cents = EXCLUDED.total_twilio_cost_cents,
        total_cost_cents = EXCLUDED.total_cost_cents,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- SECTION 9: DEFAULT DATA INSERTS
-- ============================================================================

-- Insert default statuses
INSERT INTO ticket_statuses (name, description) VALUES
    ('Open', 'Newly created ticket awaiting assignment'),
    ('In Progress', 'Ticket is being worked on'),
    ('Awaiting Customer', 'Waiting for customer response'),
    ('Escalated', 'Ticket has been escalated to another agent or tier'),
    ('Resolved', 'Issue has been fixed'),
    ('Closed', 'Ticket is closed')
ON CONFLICT (name) DO NOTHING;

-- Insert default priorities
INSERT INTO ticket_priorities (name, description) VALUES
    ('Low', 'Non-urgent issues'),
    ('Medium', 'Standard priority'),
    ('High', 'Important issues requiring quick resolution'),
    ('Critical', 'System down or urgent business impact')
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- SECTION 10: ROW LEVEL SECURITY
-- ============================================================================

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
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE twilio_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analysis ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "allow_all" ON call_logs FOR ALL USING (true);
CREATE POLICY "allow_all" ON ai_usage_logs FOR ALL USING (true);
CREATE POLICY "allow_all" ON system_health_logs FOR ALL USING (true);
CREATE POLICY "allow_all" ON agent_interactions FOR ALL USING (true);
CREATE POLICY "allow_all" ON twilio_usage_logs FOR ALL USING (true);
CREATE POLICY "allow_all" ON daily_metrics FOR ALL USING (true);
CREATE POLICY "allow_all" ON hourly_metrics FOR ALL USING (true);
CREATE POLICY "allow_all" ON customer_metrics FOR ALL USING (true);
CREATE POLICY "allow_all" ON conversation_analysis FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;


-- ============================================================================
-- SECTION 11: SUPABASE REALTIME
-- ============================================================================

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
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_usage_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE system_health_logs;

-- Enable REPLICA IDENTITY FULL for complete UPDATE/DELETE payloads
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
ALTER TABLE call_logs REPLICA IDENTITY FULL;
ALTER TABLE ai_usage_logs REPLICA IDENTITY FULL;
ALTER TABLE system_health_logs REPLICA IDENTITY FULL;


-- ============================================================================
-- SECTION 12: SEED DATA FROM EXCEL FILES
-- ============================================================================
-- Source: Client_URackIT.csv + Endpoints_URackIT.csv
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING / DO UPDATE)

-- Dimension tables
INSERT INTO device_manufacturers (name) VALUES
  ('ASUS'),
  ('Acer'),
  ('Dell Inc.'),
  ('HP'),
  ('Hewlett-Packard'),
  ('LENOVO'),
  ('Micro-Star International Co., Ltd.'),
  ('Microsoft Corporation'),
  ('QEMU'),
  ('System manufacturer')
ON CONFLICT (name) DO NOTHING;

INSERT INTO device_models (manufacturer_id, name) VALUES
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='ASUS'), 'System Product Name'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Acer'), 'Aspire TC-875'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Inspiron 16 7620 2-in-1'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Inspiron 16 Plus 7640'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Inspiron 7706 2n1'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Latitude 3500'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Latitude 3580'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Latitude 7350'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Latitude 7490'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex 3000'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex 7010'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex 7040'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex 7060'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex Micro 7020'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Precision 3460'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'), 'HP ENVY x360 2-in-1 Laptop 15-ey1xxx'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'), 'HP Laptop 17-by0xxx'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'), 'HP OmniDesk Desktop M03-0xxx'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'), 'HP Pavilion Desktop PC 570-p0xx'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Hewlett-Packard'), 'HP EliteDesk 800 G1 USDT'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='LENOVO'), 'LEGION T5 26IRB8 ( 90UT0019US )'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Micro-Star International Co., Ltd.'), 'MS-7C91'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Microsoft Surface Pro, 11th Edition'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Surface Pro 6'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Surface Pro 7'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Surface Pro 7+'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Surface Pro 8'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'), 'Standard PC (Q35 + ICH9, 2009)'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'), 'Standard PC (i440FX + PIIX, 1996)'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='System manufacturer'), 'System Product Name')
ON CONFLICT (manufacturer_id, name) DO NOTHING;

INSERT INTO operating_systems (name) VALUES
  ('Microsoft Windows 10 Home'),
  ('Microsoft Windows 10 Pro'),
  ('Microsoft Windows 11 Home'),
  ('Microsoft Windows 11 Pro'),
  ('Microsoft Windows Server 2019 Standard'),
  ('Microsoft Windows Server 2022 Standard')
ON CONFLICT (name) DO NOTHING;

INSERT INTO domains (name) VALUES
  ('Brucelectric.local'),
  ('WORKGROUP')
ON CONFLICT (name) DO NOTHING;

INSERT INTO device_types (name) VALUES
  ('SERVER'),
  ('WORKSTATION')
ON CONFLICT (name) DO NOTHING;

INSERT INTO update_statuses (name) VALUES
  ('Fully Patched'),
  ('Reboot Required')
ON CONFLICT (name) DO NOTHING;

INSERT INTO processor_models (manufacturer, model) VALUES
  ('Amd', 'AMD Ryzen 5 5600X 6-Core Processor'),
  ('Amd', 'AMD Ryzen 7 7730U with Radeon Graphics'),
  ('Common', 'Common KVM processor'),
  ('Intel', '11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz'),
  ('Intel', '11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz'),
  ('Intel', '12th Gen Intel(R) Core(TM) i5-12500'),
  ('Intel', '12th Gen Intel(R) Core(TM) i5-12500T'),
  ('Intel', '12th Gen Intel(R) Core(TM) i7-1260P'),
  ('Intel', '12th Gen Intel(R) Core(TM) i7-12700'),
  ('Intel', '12th Gen Intel(R) Core(TM) i9-12900K'),
  ('Intel', 'Intel(R) Core(TM) Ultra 7 155H'),
  ('Intel', 'Intel(R) Core(TM) Ultra 7 165U'),
  ('Intel', 'Intel(R) Core(TM) Ultra 7 265'),
  ('Intel', 'Intel(R) Core(TM) i5-1035G4 CPU @ 1.10GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-10400 CPU @ 2.90GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-14400F'),
  ('Intel', 'Intel(R) Core(TM) i5-14500T'),
  ('Intel', 'Intel(R) Core(TM) i5-3470 CPU @ 3.20GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-4590S CPU @ 3.00GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-6500 CPU @ 3.20GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-7200U CPU @ 2.50GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-7400 CPU @ 3.00GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-8350U CPU @ 1.70GHz'),
  ('Intel', 'Intel(R) Core(TM) i7-8700T CPU @ 2.40GHz'),
  ('Intel', 'Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz'),
  ('Intel', 'Intel(R) Xeon(R) Gold 6140 CPU @ 2.30GHz'),
  ('Virtual', 'Virtual CPU @ 3.41GHz')
ON CONFLICT (manufacturer, model) DO NOTHING;

INSERT INTO processor_architectures (name) VALUES
  ('x86_64')
ON CONFLICT (name) DO NOTHING;

-- Account managers (from Client_URackIT.csv)
INSERT INTO account_managers (full_name, email) VALUES
  ('Adam Lerner', 'adam@alernercpa.com'),
  ('Alice Tseng', 'alice@askalicetoday.com'),
  ('Frances Pearson', 'clearabstractservices@gmail.com'),
  ('Howard Ainbinder', 'cpahaa@aol.com'),
  ('George Diaz', 'dentaldynamics@optonline.net'),
  ('George Kaylor', 'gkaylor@1insight.com'),
  ('Kyle Barton', 'krb@libizlaw.com'),
  ('Piotr Koszko', 'peterk@bluforce.net'),
  ('Rocco Prichinello', 'rocco@brucelectric.com'),
  ('Rocco Bove', 'rocco@summitfacilitysolutions.com'),
  ('Sonilyn Pineda', 'sonia@sp-accountingservices.com')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Organizations
INSERT INTO organizations (name, u_e_code, manager_id) VALUES
  ('1iNSiGHT LLC', 3450, (SELECT manager_id FROM account_managers WHERE email='gkaylor@1insight.com')),
  ('ALerner CPA', 1392, (SELECT manager_id FROM account_managers WHERE email='adam@alernercpa.com')),
  ('Ainbinder & Cava', 7538, (SELECT manager_id FROM account_managers WHERE email='cpahaa@aol.com')),
  ('Ask Alice Today', 9262, (SELECT manager_id FROM account_managers WHERE email='alice@askalicetoday.com')),
  ('Barton & Bruechert Law, P.C.', 2600, (SELECT manager_id FROM account_managers WHERE email='krb@libizlaw.com')),
  ('BluForce Inc.', 5441, (SELECT manager_id FROM account_managers WHERE email='peterk@bluforce.net')),
  ('Bruce Electric Equipment Corp', 2424, (SELECT manager_id FROM account_managers WHERE email='rocco@brucelectric.com')),
  ('Clear Abstract Services', 1044, (SELECT manager_id FROM account_managers WHERE email='clearabstractservices@gmail.com')),
  ('Dental Dynamics', 7730, (SELECT manager_id FROM account_managers WHERE email='dentaldynamics@optonline.net')),
  ('SP Accounting Services', 1872, (SELECT manager_id FROM account_managers WHERE email='sonia@sp-accountingservices.com')),
  ('Summit Facility Solutions', 3629, (SELECT manager_id FROM account_managers WHERE email='rocco@summitfacilitysolutions.com'))
ON CONFLICT (u_e_code) DO NOTHING;

-- Locations (derived from Endpoints_URackIT.csv Site name)
INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1392), 'ALerner CPA', 'Other', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1392) AND name = 'ALerner CPA');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1392), 'Data Center', 'Data Center', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1392) AND name = 'Data Center');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=7538), 'Ainbinder & Cava Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7538) AND name = 'Ainbinder & Cava Headquarters');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=9262), 'Ask Alice Today', 'Other', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=9262) AND name = 'Ask Alice Today');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=2600), 'Barton & Bruechert Law, P.C. Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2600) AND name = 'Barton & Bruechert Law, P.C. Headquarters');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=5441), 'BluForce Inc. Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=5441) AND name = 'BluForce Inc. Headquarters');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=2424), 'Bruce Electric Equipment Corp', 'Other', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name = 'Bruce Electric Equipment Corp');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1044), 'Clear Abstract Services', 'Other', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1044) AND name = 'Clear Abstract Services');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=7730), 'Dental Dynamics Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7730) AND name = 'Dental Dynamics Headquarters');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=3450), '1iNSiGHT LLC Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3450) AND name = '1iNSiGHT LLC Headquarters');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1872), 'SP Accounting Services', 'Other', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1872) AND name = 'SP Accounting Services');

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=3629), 'Summit Facility Solutions', 'Other', FALSE
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name = 'Summit Facility Solutions');

-- Insert AI bot as a support agent
INSERT INTO support_agents (full_name, email, agent_type, specialization, is_available)
VALUES ('U Rack IT AI Assistant', 'ai@urackit.com', 'Bot', 'General IT Support', TRUE)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- COMPLETE! 
-- ============================================================================
-- You can now run this file in Supabase SQL Editor
-- All tables, indexes, views, functions, RLS policies, and seed data are included

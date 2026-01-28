-- ============================================================================
-- DEVICE CHAT & EXECUTION HISTORY TABLES - For Technician Chat Join Feature
-- ============================================================================
-- This migration adds 4 new tables to support technicians joining device chat
-- sessions with full visibility into chat history and terminal execution history.
--
-- Safe to run on existing Supabase instance (uses IF NOT EXISTS)
-- ============================================================================

-- 1. Device Chat Messages table
-- Stores all chat messages between users, AI agents, and human technicians
CREATE TABLE IF NOT EXISTS device_chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_session_id VARCHAR(255) NOT NULL,
    ticket_id INTEGER REFERENCES support_tickets(ticket_id) ON DELETE SET NULL,
    device_id INTEGER NOT NULL,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('user', 'ai_agent', 'human_agent', 'system')),
    sender_agent_id INTEGER REFERENCES support_agents(support_agent_id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_time TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for device_chat_messages
CREATE INDEX IF NOT EXISTS idx_device_chat_messages_chat_session ON device_chat_messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_device_chat_messages_ticket ON device_chat_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_device_chat_messages_device ON device_chat_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_device_chat_messages_time ON device_chat_messages(message_time DESC);
CREATE INDEX IF NOT EXISTS idx_device_chat_messages_sender_type ON device_chat_messages(sender_type);

-- Comment on table
COMMENT ON TABLE device_chat_messages IS 'Stores all chat messages between users, AI agents, and human technicians in device sessions';
COMMENT ON COLUMN device_chat_messages.chat_session_id IS 'Unique identifier for the chat session (links to device session)';
COMMENT ON COLUMN device_chat_messages.sender_type IS 'Type of sender: user, ai_agent, human_agent, or system';
COMMENT ON COLUMN device_chat_messages.metadata IS 'Additional metadata like agent_name, urgency flags, etc.';


-- 2. Device Command Executions table
-- Tracks all terminal command executions requested by AI or technicians
CREATE TABLE IF NOT EXISTS device_command_executions (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_session_id VARCHAR(255) NOT NULL,
    ticket_id INTEGER REFERENCES support_tickets(ticket_id) ON DELETE SET NULL,
    device_id INTEGER NOT NULL,
    command_id VARCHAR(255) NOT NULL UNIQUE,
    command TEXT NOT NULL,
    description TEXT,
    requester_type VARCHAR(50) NOT NULL CHECK (requester_type IN ('ai_agent', 'human_agent')),
    requester_agent_id INTEGER REFERENCES support_agents(support_agent_id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'declined', 'timeout')),
    output TEXT,
    error TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for device_command_executions
CREATE INDEX IF NOT EXISTS idx_device_command_executions_chat_session ON device_command_executions(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_device_command_executions_ticket ON device_command_executions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_device_command_executions_command_id ON device_command_executions(command_id);
CREATE INDEX IF NOT EXISTS idx_device_command_executions_status ON device_command_executions(status);
CREATE INDEX IF NOT EXISTS idx_device_command_executions_created ON device_command_executions(created_at DESC);

-- Comment on table
COMMENT ON TABLE device_command_executions IS 'Tracks all PowerShell/terminal command executions requested by AI agents or human technicians';
COMMENT ON COLUMN device_command_executions.command_id IS 'Unique identifier for the command execution (used for async result matching)';
COMMENT ON COLUMN device_command_executions.requester_type IS 'Who requested the command: ai_agent or human_agent';
COMMENT ON COLUMN device_command_executions.status IS 'Execution status: pending, running, success, error, declined, timeout';


-- 3. Device Sessions table
-- Tracks active and historical device WebSocket connections
CREATE TABLE IF NOT EXISTS device_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_session_id VARCHAR(255) UNIQUE NOT NULL,
    ticket_id INTEGER REFERENCES support_tickets(ticket_id) ON DELETE SET NULL,
    device_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ
);

-- Indexes for device_sessions
CREATE INDEX IF NOT EXISTS idx_device_sessions_chat_session ON device_sessions(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_ticket ON device_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active ON device_sessions(is_active, last_heartbeat) WHERE is_active = true;

-- Comment on table
COMMENT ON TABLE device_sessions IS 'Tracks active and historical device WebSocket connections and their associated chat sessions';
COMMENT ON COLUMN device_sessions.chat_session_id IS 'Unique chat session identifier (used to link messages and executions)';
COMMENT ON COLUMN device_sessions.is_active IS 'Whether this session is currently active';
COMMENT ON COLUMN device_sessions.last_heartbeat IS 'Last heartbeat received from device';


-- 4. Technician Sessions table
-- Tracks when technicians join/leave device chat sessions
CREATE TABLE IF NOT EXISTS technician_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL REFERENCES support_agents(support_agent_id) ON DELETE CASCADE,
    chat_session_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ
);

-- Indexes for technician_sessions
CREATE INDEX IF NOT EXISTS idx_technician_sessions_ticket ON technician_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_technician_sessions_agent ON technician_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_technician_sessions_chat_session ON technician_sessions(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_technician_sessions_active ON technician_sessions(is_active) WHERE is_active = true;

-- Comment on table
COMMENT ON TABLE technician_sessions IS 'Tracks when human technicians join and leave device chat sessions';
COMMENT ON COLUMN technician_sessions.is_active IS 'Whether the technician is currently connected';


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE device_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_command_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for demo purposes)
CREATE POLICY "Allow anonymous all" ON device_chat_messages FOR ALL USING (true);
CREATE POLICY "Allow anonymous all" ON device_command_executions FOR ALL USING (true);
CREATE POLICY "Allow anonymous all" ON device_sessions FOR ALL USING (true);
CREATE POLICY "Allow anonymous all" ON technician_sessions FOR ALL USING (true);


-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON device_chat_messages TO anon, authenticated;
GRANT ALL ON device_command_executions TO anon, authenticated;
GRANT ALL ON device_sessions TO anon, authenticated;
GRANT ALL ON technician_sessions TO anon, authenticated;


-- ============================================
-- ENABLE REALTIME FOR TABLES
-- ============================================
-- Add tables to supabase_realtime publication for real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE device_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE device_command_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE device_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE technician_sessions;

-- Enable REPLICA IDENTITY FULL for complete UPDATE/DELETE payloads
ALTER TABLE device_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE device_command_executions REPLICA IDENTITY FULL;
ALTER TABLE device_sessions REPLICA IDENTITY FULL;
ALTER TABLE technician_sessions REPLICA IDENTITY FULL;


-- ============================================
-- ADD MISSING COLUMN TO EXISTING TABLE
-- ============================================
-- Add is_primary column to ticket_assignments if it doesn't exist
-- This allows tracking primary vs secondary technician assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ticket_assignments'
        AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE ticket_assignments ADD COLUMN is_primary BOOLEAN DEFAULT true;
        COMMENT ON COLUMN ticket_assignments.is_primary IS 'Whether this is the primary assignee (only primary can execute commands)';
    END IF;
END $$;


-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
-- Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_heartbeat = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_heartbeat on device_sessions
CREATE TRIGGER trigger_update_device_sessions_heartbeat
    BEFORE UPDATE ON device_sessions
    FOR EACH ROW
    WHEN (OLD.is_active = true AND NEW.is_active = true)
    EXECUTE FUNCTION update_device_sessions_updated_at();


-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '
============================================================================
DEVICE CHAT SCHEMA MIGRATION COMPLETED SUCCESSFULLY
============================================================================
Created Tables:
  - device_chat_messages      (chat history)
  - device_command_executions (terminal command tracking)
  - device_sessions           (device WebSocket connections)
  - technician_sessions       (technician join tracking)

Modified Tables:
  - ticket_assignments        (added is_primary column)

All tables have:
  ✓ Indexes for performance
  ✓ Row-level security enabled
  ✓ Realtime enabled
  ✓ Proper foreign key constraints
  ✓ Permissions granted to anon/authenticated

Next Steps:
  1. Create DeviceChatDB class in sunil-console/ai-service/db/device_chat.py
  2. Update device_handler.py to persist messages/executions
  3. Create TechnicianSession class for WebSocket handling
============================================================================
    ';
END $$;

// API Route to create device_connections table in Supabase
// This uses Supabase Management API to run SQL
// Alternative: Ask teammate to run db/device_connections_schema.sql in Supabase SQL Editor

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
});

/**
 * Check if device_connections table exists
 */
async function checkTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('device_connections')
      .select('connection_id')
      .limit(1);
    
    // If no error, table exists
    return !error;
  } catch {
    return false;
  }
}

/**
 * Get the SQL schema for device_connections table
 */
function getSchemaSQL(): string {
  return `
-- Device Connections Table for Terminal Bridge
CREATE TABLE IF NOT EXISTS device_connections (
  connection_id SERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  user_id INTEGER REFERENCES contacts(contact_id),
  device_id INTEGER,
  organization_id INTEGER REFERENCES organizations(organization_id),
  six_digit_code VARCHAR(6),
  websocket_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_device_connections_session_id ON device_connections(session_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_code ON device_connections(six_digit_code);
CREATE INDEX IF NOT EXISTS idx_device_connections_user_device_org ON device_connections(user_id, device_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_active ON device_connections(is_active) WHERE is_active = true;

ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow anonymous all" ON device_connections FOR ALL USING (true);

GRANT ALL ON device_connections TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE device_connections_connection_id_seq TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE device_connections;
ALTER TABLE device_connections REPLICA IDENTITY FULL;
  `.trim();
}

export async function GET() {
  try {
    const tableExists = await checkTableExists();

    return NextResponse.json({
      success: true,
      tableExists,
      message: tableExists 
        ? '✅ device_connections table exists!' 
        : '❌ device_connections table does not exist. Run this SQL in Supabase SQL Editor.',
      instructions: tableExists ? null : {
        step1: 'Go to Supabase Dashboard: https://supabase.com/dashboard',
        step2: 'Select your project',
        step3: 'Navigate to SQL Editor',
        step4: 'Copy the SQL from db/device_connections_schema.sql',
        step5: 'Paste and Run',
        alternative: 'Or ask your teammate who has database access to run it'
      },
      sqlSchema: tableExists ? null : getSchemaSQL(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to check table',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    }, { status: 500 });
  }
}

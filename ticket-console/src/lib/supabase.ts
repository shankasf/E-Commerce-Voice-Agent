import { createClient, SupabaseClient } from '@supabase/supabase-js';

// #region agent log
if (typeof window !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/fc03e1bb-15cf-418b-b1dd-f71c3bfd3447',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:4',message:'Env check - NEXT_PUBLIC_SUPABASE_URL',data:{hasUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,urlValue:process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,20)||'missing',hasKey:!!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,keyLength:process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'env-check',hypothesisId:'A'})}).catch(()=>{});
}
// #endregion

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

// #region agent log
if (typeof window !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/fc03e1bb-15cf-418b-b1dd-f71c3bfd3447',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:8',message:'After env read',data:{supabaseUrl:supabaseUrl.substring(0,30)||'empty',hasServiceKey:supabaseServiceKey.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'env-check',hypothesisId:'A'})}).catch(()=>{});
}
// #endregion

// Create supabase client with service role key to bypass RLS
let supabase: SupabaseClient;

if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/fc03e1bb-15cf-418b-b1dd-f71c3bfd3447',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:15',message:'Creating real Supabase client',data:{url:supabaseUrl.substring(0,30)},timestamp:Date.now(),sessionId:'debug-session',runId:'env-check',hypothesisId:'A'})}).catch(()=>{});
  }
  // #endregion
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`
      }
    }
  });
} else {
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/fc03e1bb-15cf-418b-b1dd-f71c3bfd3447',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:32',message:'Using placeholder client - env vars missing',data:{reason:!supabaseUrl?'no url':!supabaseServiceKey?'no key':'has placeholder'},timestamp:Date.now(),sessionId:'debug-session',runId:'env-check',hypothesisId:'A'})}).catch(()=>{});
    // Show console warning for developers
    console.error('⚠️ Supabase not configured!');
    console.error('Please create .env.local with:');
    console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.error('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    console.error('See .env.local.example for template');
  }
  // #endregion
  // Fallback for SSR - create a dummy client that will be replaced on client
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };

// Types matching ticket_management_schema.sql

export type LocationType = 'Headquarters' | 'Data Center' | 'Support' | 'Remote' | 'Other';
export type AgentType = 'Bot' | 'Human';

export interface AccountManager {
  manager_id: number;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  organization_id: number;
  name: string;
  u_e_code: number;
  manager_id?: number;
  created_at: string;
  updated_at: string;
  manager?: AccountManager;
}

export interface Location {
  location_id: number;
  organization_id: number;
  name: string;
  location_type: LocationType;
  requires_human_agent: boolean;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface Contact {
  contact_id: number;
  organization_id: number;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface SupportAgent {
  support_agent_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  agent_type: AgentType;
  specialization?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketStatus {
  status_id: number;
  name: string;
  description?: string;
}

export interface TicketPriority {
  priority_id: number;
  name: string;
  description?: string;
}

export interface Device {
  device_id: number;
  organization_id: number;
  location_id: number;
  asset_name: string;
  status: 'ONLINE' | 'OFFLINE';
  host_name?: string;
  public_ip?: string;
  os_version?: string;
  last_reported_time?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  ticket_id: number;
  organization_id: number;
  contact_id: number;
  device_id?: number;
  location_id?: number;
  subject?: string;
  description?: string;
  status_id?: number;
  priority_id?: number;
  requires_human_agent: boolean;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  // Joined relations
  contact?: Contact;
  organization?: Organization;
  location?: Location;
  device?: Device;
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface TicketAssignment {
  ticket_id: number;
  support_agent_id: number;
  assignment_start: string;
  assignment_end?: string;
  is_primary: boolean;
  support_agent?: SupportAgent;
}

export interface TicketMessage {
  message_id: number;
  ticket_id: number;
  sender_agent_id?: number;
  sender_contact_id?: number;
  message_time: string;
  content: string;
  message_type: string;
  sender_agent?: SupportAgent;
  sender_contact?: Contact;
}

export interface TicketEscalation {
  escalation_id: number;
  ticket_id: number;
  from_agent_id?: number;
  to_agent_id?: number;
  escalation_time: string;
  reason?: string;
  from_agent?: SupportAgent;
  to_agent?: SupportAgent;
}

// ============================================
// Device-related lookup tables
// ============================================

export interface DeviceManufacturer {
  manufacturer_id: number;
  name: string;
}

export interface DeviceModel {
  model_id: number;
  manufacturer_id: number;
  name: string;
  manufacturer?: DeviceManufacturer;
}

export interface OperatingSystem {
  os_id: number;
  name: string;
}

export interface Domain {
  domain_id: number;
  name: string;
}

export interface DeviceType {
  device_type_id: number;
  name: string;
}

export interface UpdateStatus {
  update_status_id: number;
  name: string;
}

export interface ProcessorModel {
  processor_id: number;
  manufacturer?: string;
  model?: string;
}

export interface ProcessorArchitecture {
  architecture_id: number;
  name: string;
}

// ============================================
// Contact Devices junction table
// ============================================

export interface ContactDevice {
  contact_id: number;
  device_id: number;
  assigned_at: string;
  unassigned_at?: string;
  device?: Device;
}

// User roles for the console
export type UserRole = 'requester' | 'admin' | 'agent';

export interface CurrentUser {
  role: UserRole;
  id: number;
  name: string;
  email: string;
  organization_id?: number;
}

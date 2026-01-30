/**
 * Types for device chat feature
 */

export interface DeviceSession {
  session_id: string;
  chat_session_id: string;
  ticket_id: number;
  device_id: number;
  user_id: number;
  organization_id: number;
  is_active: boolean;
  created_at: string;
  last_heartbeat: string;
  disconnected_at?: string | null;
}

export interface DeviceChatMessage {
  message_id: string;
  chat_session_id: string;
  ticket_id: number | null;
  device_id: number;
  sender_type: 'user' | 'ai_agent' | 'human_agent' | 'system';
  sender_agent_id?: number | null;
  content: string;
  message_time: string;
  metadata?: {
    agent_name?: string;
    agent_id?: number;
    [key: string]: any;
  };
}

export interface CommandExecution {
  execution_id: string;
  chat_session_id: string;
  ticket_id: number | null;
  device_id: number;
  command_id: string;
  command: string;
  description?: string;
  requester_type: 'ai_agent' | 'human_agent';
  requester_agent_id?: number | null;
  status: 'pending' | 'running' | 'success' | 'error' | 'declined' | 'timeout';
  output?: string | null;
  error?: string | null;
  execution_time_ms?: number | null;
  created_at: string;
  completed_at?: string | null;
}

export interface WebSocketAuthMessage {
  type: 'auth';
  jwt_token: string;
  ticket_id: number;
  agent_id: number;
}

export interface WebSocketAuthSuccessMessage {
  type: 'auth_success';
  ticket_id: number;
  chat_session_id: string;
  device_id: number;
  is_primary_assignee: boolean;
}

// Issue Summary Types
export interface TroubleshootingStep {
  step_number: number;
  description: string;
  action_type: 'question' | 'command' | 'analysis' | 'suggestion' | 'greeting';
  outcome?: string | null;
  timestamp?: string | null;
}

export interface CommandExecutionSummary {
  command: string;
  description: string;
  status: string;
  output_preview?: string | null;
  error?: string | null;
}

export interface IssueSummary {
  ticket_id: number | null;
  issue_description: string;
  customer_name: string;
  organization_name: string;
  device_info: string;
  troubleshooting_steps: TroubleshootingStep[];
  commands_executed: CommandExecutionSummary[];
  current_status: string;
  ai_diagnosis?: string | null;
  ticket_subject?: string | null;
  ticket_priority?: string | null;
  generated_at: string;
}

export interface WebSocketInitialStateMessage {
  type: 'initial_state';
  chat_history: DeviceChatMessage[];
  execution_history: CommandExecution[];
  issue_summary?: IssueSummary;
}

export interface WebSocketChatMessage {
  type: 'chat';
  role: 'user' | 'ai_agent' | 'human_agent' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    agent_name?: string;
    agent_id?: number;
    [key: string]: any;
  };
}

export interface WebSocketCommandUpdateMessage {
  type: 'command_update';
  command_id: string;
  status: string;
  output?: string;
  error?: string;
  execution_time_ms?: number;
  // Optional fields when command is first initiated
  command?: string;
  description?: string;
  requester_type?: 'ai_agent' | 'human_agent';
  requires_consent?: boolean;
}

export interface WebSocketCommandResultMessage {
  type: 'command_result';
  command_id: string;
  status: string;
  output?: string;
  error?: string;
}

export interface WebSocketErrorMessage {
  type: 'error';
  error: string;
}

export interface WebSocketHeartbeatAckMessage {
  type: 'heartbeat_ack';
}

export type WebSocketMessage =
  | WebSocketAuthSuccessMessage
  | WebSocketInitialStateMessage
  | WebSocketChatMessage
  | WebSocketCommandUpdateMessage
  | WebSocketCommandResultMessage
  | WebSocketErrorMessage
  | WebSocketHeartbeatAckMessage;

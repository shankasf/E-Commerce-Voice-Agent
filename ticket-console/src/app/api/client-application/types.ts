/**
 * TypeScript type definitions for Windows MCP Agent Backend
 * Ported from FastAPI Pydantic models
 */

// Request/Response Models
export interface DeviceAuthRequest {
  ue_code: string;
  serial_number: string;
}

export interface DeviceAuthResponse {
  success: boolean;
  jwt_token?: string;
  device_id?: number;
  user_id?: number | null;
  organization_id?: number;
  expires_at?: string; // ISO timestamp
  message?: string;
  error?: string;
}

export interface TokenRefreshRequest {
  ue_code: string;
  serial_number: string;
}

export interface TokenRefreshResponse {
  success: boolean;
  jwt_token?: string;
  expires_at?: string; // ISO timestamp
  message?: string;
  error?: string;
}

// Request from AI Service to create a device connection
export interface CreateDeviceConnectionRequest {
  user_id: number;
  organization_id: number;
  device_id: number;
  chat_session_id: string; // AI chat session ID (REQUIRED - links device connection to chat)
}

// Response with plain 6-digit code (for AI to show user)
export interface CreateDeviceConnectionResponse {
  success: boolean;
  code?: string; // Plain 6-digit alphanumeric code (for user)
  error?: string;
}

export interface CreateSixDigitCodeRequest {
  user_id: number;
  device_id: number;
  organization_id: number;
  session_id?: string; // Optional: if provided, check if it already exists
}

export interface CreateSixDigitCodeResponse {
  success: boolean;
  code?: string;              // Original unhashed 6-digit code (for AI service to communicate to user)
  session_id?: string;        // UUID session identifier
  websocket_url?: string;     // Full WebSocket URL for connection
  expires_in_seconds?: number; // 900 (15 minutes)
  error?: string;
}

export interface VerifyCodeRequest {
  user_id: number;        // contact_id from contacts table
  device_id: number;      // device_id from devices table
  organization_id: number; // organization_id from organizations table
  six_digit_code: string; // Original 6-digit code entered by user (e.g., "C8PKRV")
}

export interface VerifyCodeResponse {
  success: boolean;
  websocket_url?: string;     // Full WebSocket URL for connection
  session_id?: string;         // UUID session identifier
  expires_in_seconds?: number; // Time remaining until expiration
  error?: string;
}

// Request from Windows app to initiate connection using 6-digit code
export interface InitiateConnectionRequest {
  code: string; // Plain 6-digit code entered by user
  user_id: number;
  organization_id: number;
  device_id: number;
}

// Response with WebSocket URL for Windows app
export interface InitiateConnectionResponse {
  success: boolean;
  websocket_url?: string; // Full WebSocket URL
  session_id?: string; // Connection session UUID (for WebSocket path)
  chat_session_id?: string; // AI chat session ID (for chat history retrieval)
  error?: string;
}

// Device WebSocket message types (Windows app <-> AI Service)
export interface DeviceWebSocketMessage {
  type: 'chat' | 'chat_history' | 'command_request' | 'command_consent' | 'command_result' | 'heartbeat' | 'heartbeat_ack' | 'connection_established' | 'error';
}

export interface DeviceChatMessage extends DeviceWebSocketMessage {
  type: 'chat';
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface DeviceChatHistoryMessage extends DeviceWebSocketMessage {
  type: 'chat_history';
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
}

export interface DeviceCommandRequest extends DeviceWebSocketMessage {
  type: 'command_request';
  command_id: string;
  command_type: string;
  description: string; // Human-readable explanation
  parameters?: Record<string, any>;
  requires_consent: boolean;
}

export interface DeviceCommandConsent extends DeviceWebSocketMessage {
  type: 'command_consent';
  command_id: string;
  approved: boolean;
  reason?: string; // Optional rejection reason
}

export interface DeviceCommandResult extends DeviceWebSocketMessage {
  type: 'command_result';
  command_id: string;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  output?: any;
  error?: string;
  execution_time_ms?: number;
}

export interface DeviceConnectionEstablished extends DeviceWebSocketMessage {
  type: 'connection_established';
  device_id: number;
  user_id: number;
  chat_session_id: string;
}

export interface DeviceErrorMessage extends DeviceWebSocketMessage {
  type: 'error';
  code: string;
  message: string;
}

export interface ProblemRequest {
  user_id: string;
  problem_description: string;
  device_id?: string; // If not provided, uses user's primary device
  role?: 'ai_agent' | 'human_agent' | 'admin'; // Default: ai_agent
}

export interface ToolExecution {
  tool: string;
  arguments?: Record<string, any>;
  result?: any;
  status?: string;
  description?: string;
  error?: string;
}

export interface PendingCommand {
  command_id: string;
  command: string;
  description: string;
  arguments: Record<string, any>;
  tool_name: string;
}

export interface EscalationOption {
  id: string;
  label: string;
  description: string;
}

export interface ProblemResponse {
  success: boolean;
  solution?: string;
  tools_executed?: ToolExecution[];
  pending_commands?: PendingCommand[];
  error?: string;
  requires_escalation?: boolean;
  escalation_reason?: string;
  escalation_options?: EscalationOption[];
}

export interface CommandExecuteRequest {
  command_id: string;
  user_id: string;
  device_id: string;
  command: string;
  arguments?: Record<string, any>;
  problem_description?: string;
}

export interface CommandExecuteResponse {
  success: boolean;
  command_id: string;
  result?: any;
  output?: string;
  error?: string;
  summary?: string;
}

export interface Device {
  id: string;
  device_id: string;
  user_id: string;
  client_id: string;
  device_name: string;
  os_version: string;
  mcp_url: string;
  status?: string;
  last_connected?: string;
}

export interface UserDevicesResponse {
  devices: Device[];
}

export interface HealthCheckResponse {
  status: string;
  database: string;
  active_device_connections: number;
  timestamp: string;
}

export interface ToolInfo {
  name: string;
  min_role: string;
  risk: string;
  description?: string;
}

export interface ToolsByRole {
  ai_agent: {
    safe: ToolInfo[];
    caution: ToolInfo[];
    elevated: ToolInfo[];
  };
  human_agent: {
    safe: ToolInfo[];
    caution: ToolInfo[];
    elevated: ToolInfo[];
  };
  admin: {
    safe: ToolInfo[];
    caution: ToolInfo[];
    elevated: ToolInfo[];
  };
}

export interface ListAllToolsResponse {
  enabled: boolean;
  total_tools: number;
  tools_by_role: ToolsByRole;
  all_tools: ToolInfo[];
  note: string;
}

// WebSocket message types
export interface ToolCallMessage {
  type: 'tool_call';
  id: string;
  name: string;
  arguments: Record<string, any>;
  role: string;
}

export interface ToolResultMessage {
  type: 'tool_result';
  id: string;
  status: string;
  output?: any;
  error?: string;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
}

export interface HeartbeatAckMessage {
  type: 'heartbeat_ack';
}

export type WebSocketMessage =
  | ToolCallMessage
  | ToolResultMessage
  | HeartbeatMessage
  | HeartbeatAckMessage;

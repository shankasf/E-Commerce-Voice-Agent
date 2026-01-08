# Schema Mapping Documentation

## Overview
This document maps the Windows Client Application API schema to the Database (Supabase) schema.

---

## 1. Device Registration Flow

### Windows Client Sends (DeviceRegistrationRequest):
```typescript
{
  email: string;              // User's email
  ue_code: string;            // Organization U&E code
  device_id: string;          // Unique device identifier (MAC, hardware ID)
  device_name: string;        // Device name
  os_version: string;         // OS version (e.g., "Windows 11")
  mcp_url?: string;           // Optional WebSocket URL
}
```

### Maps to Database Tables:

#### 1. `organizations` table
- `ue_code` → `u_e_code` (INTEGER)
- Returns: `organization_id`, `name`

#### 2. `contacts` table (Users)
- `email` → `email` (VARCHAR)
- Returns: `contact_id`, `full_name`, `organization_id`
- **Note:** `contact_id` is the user_id in responses

#### 3. `devices` table (IT Assets)
- `device_id` → `host_name` (VARCHAR) - Stores the unique identifier from client
- `device_name` → `asset_name` (VARCHAR)
- `os_version` → `os_version` (VARCHAR)
- Database auto-generates: `device_id` (SERIAL PRIMARY KEY)
- Returns: `device_id` (database ID), `asset_name`, `host_name`, etc.

#### 4. `contact_devices` table (Links users to devices)
- `contact_id` (FK to contacts)
- `device_id` (FK to devices - database ID, not client device_id)

#### 5. `device_connections` table (Connection URLs)
- `device_id` (FK to devices - database ID)
- `user_id` → `contact_id` (FK to contacts)
- `organization_id` (FK to organizations)
- `connection_url` ← `mcp_url`
- `is_active` (BOOLEAN)
- `last_heartbeat` (TIMESTAMPTZ)

### Backend Returns (DeviceRegistrationResponse):
```typescript
{
  success: boolean;
  jwt_token?: string;
  device_id?: number;         // DATABASE device_id (devices.device_id)
  user_id?: number;           // contact_id from contacts table
  organization_id?: number;   // organization_id
  message?: string;
  error?: string;
}
```

**CRITICAL DISTINCTION:**
- **Client's `device_id`** (string) = Unique identifier from application → stored in `devices.host_name`
- **Database's `device_id`** (number) = Auto-generated PRIMARY KEY → stored in `devices.device_id`
- Backend returns the **database's device_id** for future API calls

---

## 2. Problem Solving Flow

### Windows Client Sends (ProblemRequest):
```typescript
{
  user_id: string;            // contact_id from registration response
  problem_description: string;
  device_id?: string;         // Optional: database device_id (if not provided, uses primary device)
  role?: 'ai_agent' | 'human_agent' | 'admin';
}
```

### Backend Process:
1. Query `contacts` table with `user_id` (contact_id)
2. If `device_id` provided: Query `devices` table with `device_id`
3. If no `device_id`: Query `contact_devices` to get user's primary device
4. Query `device_connections` to get active connection
5. Execute tools via WebSocket connection
6. Return results

### Backend Returns (ProblemResponse):
```typescript
{
  success: boolean;
  solution?: string;
  tools_executed?: ToolExecution[];
  pending_commands?: PendingCommand[];
  error?: string;
  requires_escalation?: boolean;
  escalation_reason?: string;
  escalation_options?: EscalationOption[];
}
```

---

## 3. User Devices Query

### API Call:
```
GET /api/client-application/user/[userId]/devices
```

### Backend Process:
1. Query `contact_devices` table with `contact_id` = userId
2. Join with `devices` table to get device details
3. Join with `device_connections` to get connection status

### Backend Returns (UserDevicesResponse):
```typescript
{
  devices: [
    {
      id: string;                // devices.device_id (database ID)
      device_id: string;         // devices.device_id
      user_id: string;           // contact_id
      client_id: string;         // organization_id (for compatibility)
      device_name: string;       // devices.asset_name
      os_version: string;        // devices.os_version
      mcp_url: string;          // device_connections.connection_url
      status: string;           // 'connected' if device_connections.is_active
      last_connected: string;   // device_connections.last_heartbeat
    }
  ]
}
```

---

## 4. Command Execution Flow

### Windows Client Sends (CommandExecuteRequest):
```typescript
{
  command_id: string;
  user_id: string;            // contact_id
  device_id: string;          // database device_id
  command: string;
  arguments?: Record<string, any>;
  problem_description?: string;
}
```

### Backend Process:
1. Validate `device_id` exists in `devices` table
2. Verify device belongs to user via `contact_devices` table
3. Get connection from `device_connections` table
4. Execute command via WebSocket
5. Return results

---

## 5. Health Check

### Backend Returns (HealthCheckResponse):
```typescript
{
  status: string;                    // 'healthy' | 'unhealthy'
  database: string;                  // 'connected' | 'disconnected'
  active_device_connections: number; // Count from ConnectionRegistry
  timestamp: string;
}
```

---

## Key Mappings Summary

| Client Field | Database Table | Database Field | Type |
|-------------|---------------|----------------|------|
| `email` | `contacts` | `email` | VARCHAR |
| `ue_code` | `organizations` | `u_e_code` | INTEGER |
| `device_id` (from client) | `devices` | `host_name` | VARCHAR |
| - | `devices` | `device_id` | SERIAL (auto) |
| `device_name` | `devices` | `asset_name` | VARCHAR |
| `os_version` | `devices` | `os_version` | VARCHAR |
| `mcp_url` | `device_connections` | `connection_url` | TEXT |
| `user_id` (response) | `contacts` | `contact_id` | SERIAL |
| `organization_id` | `organizations` | `organization_id` | SERIAL |

---

## Important Notes

1. **Device ID Confusion:** Always distinguish between:
   - Client's unique identifier (string) → `devices.host_name`
   - Database's auto-generated ID (number) → `devices.device_id`

2. **User ID:** `user_id` in API responses = `contact_id` in database

3. **Client ID:** `client_id` in responses = `organization_id` for compatibility

4. **Device Status:** Derived from `device_connections.is_active` and `devices.status`

5. **Connection URLs:** Stored in `device_connections.connection_url`, not in `devices` table

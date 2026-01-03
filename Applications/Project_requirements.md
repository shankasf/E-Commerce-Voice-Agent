# Windows MCP Agent – Technical Design Document

## 1. Overview

This document describes the design and implementation of a **Windows MCP Agent**, a secure, role-aware Windows desktop application that listens for MCP (Model Context Protocol) tool calls and executes approved system tools to resolve user issues.

The agent is intended for **enterprise IT support and automation**, integrating:

* AI agents (auto-remediation)
* Human support agents (approved remediation)
* Admin-level remediation (controlled and non-breaching)

The application is **not a remote shell**, **not malware-like**, and **not capable of data exfiltration**.

---

## 2. Goals

### Functional Goals

* Run as a persistent Windows tray application
* Wait indefinitely for MCP messages
* Execute structured tools based on role and policy
* Return structured results to backend, LLM, and human agents

### Non-Goals

* Arbitrary command execution
* File exfiltration or user surveillance
* Credential access
* Stealth execution or hidden persistence

---

## 3. High-Level Architecture

```
User PC (Windows)
┌──────────────────────────┐
│ Windows MCP Agent (WPF)  │
│  - Tray App              │
│  - MCP Listener          │
│  - Tool Engine           │
│  - Policy Enforcement    │
└───────────┬──────────────┘
            │ MCP (WSS)
┌───────────▼──────────────┐
│ Backend MCP Client       │
│  - LLM                   │
│  - Human Approval UI     │
│  - Audit & Logging       │
└──────────────────────────┘
```

---

## 4. Technology Stack

| Layer                | Technology                    |
| -------------------- | ----------------------------- |
| OS                   | Windows 10 / 11               |
| App Framework        | WPF (.NET 8 LTS)              |
| Runtime              | User-mode desktop app         |
| UI                   | System Tray + minimal window  |
| Protocol             | MCP over WebSocket (WSS)      |
| Auth                 | JWT + Device ID               |
| Privilege Escalation | Optional admin helper process |

---

## 5. Roles & Trust Model

### Roles

| Role        | Description                               |
| ----------- | ----------------------------------------- |
| AI_AGENT    | Auto-approved, safe remediation           |
| HUMAN_AGENT | Human-approved, stronger remediation      |
| ADMIN       | Elevated remediation, still non-breaching |

### Role Hierarchy

```
AI_AGENT < HUMAN_AGENT < ADMIN
```

Higher roles inherit lower-role permissions.

---

## 6. Tool Risk Model

Each tool is defined by **risk**, **impact**, and **execution guards**.

### Risk Levels

| Risk     | Meaning                    |
| -------- | -------------------------- |
| SAFE     | Read-only or no disruption |
| CAUTION  | Temporary disruption       |
| ELEVATED | Requires admin privileges  |

---

## 7. Role-Based Tool Permissions

### AI_AGENT (Auto-Execute)

**SAFE Tools**

* check_cpu_usage
* check_memory_usage
* check_disk_usage
* check_system_uptime
* check_event_logs_summary
* check_network_status

**CAUTION Tools (Guarded)**

* flush_dns_cache
* renew_ip_address
* reset_network_stack
* restart_whitelisted_service
* clear_windows_temp
* clear_user_temp

**Special Case**

* restart_system (with idle check + countdown + cancel option)

---

### HUMAN_AGENT (Human Approved)

Includes all AI_AGENT tools plus:

* restart_any_service (whitelisted)
* restart_application
* network_adapter_reset
* windows_update_repair
* immediate_restart

---

### ADMIN (Elevated)

Includes all lower tools plus:

* registry_fix (whitelisted keys only)
* firewall_rule_repair
* signed_driver_reinstall
* system_restart_no_delay

**Explicitly Forbidden**

* File uploads
* Screen capture
* Clipboard access
* Credential access
* Arbitrary file reads

---

## 8. MCP Message Contract

### Tool Call (Incoming)

```json
{
  "type": "tool_call",
  "id": "call-123",
  "name": "restart_service",
  "arguments": {
    "service_name": "Spooler"
  },
  "role": "ai_agent"
}
```

### Tool Result (Outgoing)

```json
{
  "type": "tool_result",
  "id": "call-123",
  "status": "success",
  "output": "Service restarted successfully"
}
```

---

## 9. Windows Application Architecture

```
UI Layer (Tray, Toasts)
│
├── MCP Transport Layer (WebSocket)
│
├── Authentication & Role Validation
│
├── Tool Authorization Engine
│
├── Tool Dispatcher
│
└── Tool Implementations
```

---

## 10. Tool Authorization Engine

Each tool has a policy:

```csharp
ToolPolicy {
  Name
  MinRole
  Risk
  RequiresUserNotice
  RequiresIdleCheck
}
```

Execution occurs only if:

* Role is valid
* Tool exists
* Risk is acceptable for role
* Guard conditions pass

---

## 11. Background Execution Model

The agent:

1. Starts on user launch
2. Hides UI, shows tray icon
3. Establishes MCP connection
4. Waits indefinitely for messages
5. Executes approved tools
6. Returns structured results

No polling-based shell execution is used.

---

## 12. User Experience

### Tray States

* Connected
* Waiting for command
* Executing tool
* Blocked (policy violation)

### Notifications

* Restart countdown
* Caution tool execution notice
* Error or rejection notice

---

## 13. Security & Compliance

### Security Controls

* TLS (WSS)
* JWT role validation
* Device registration
* Schema validation
* Execution timeouts
* Full audit logs

### Compliance Guarantees

* No stealth execution
* Explicit user intent
* Human-in-the-loop enforcement
* Defender-safe behavior

---

## 14. Development Phases

### Phase 1 – Skeleton

* WPF tray app
* Background loop

### Phase 2 – MCP Integration

* WebSocket MCP listener
* Message parsing

### Phase 3 – Policy Engine

* Role enforcement
* Tool registry

### Phase 4 – Tool Implementation

* AI_AGENT tools
* Guardrails

### Phase 5 – Admin Helper

* Elevated process
* Secure IPC

---

## 15. Summary

This Windows MCP Agent is a **secure, role-aware, enterprise-grade remediation agent** designed to resolve the majority of Windows user issues while maintaining strict safety, auditability, and compliance.

It follows industry patterns used by Intune, RMM tools, and managed IT platforms, without exposing the system to arbitrary or unsafe execution.

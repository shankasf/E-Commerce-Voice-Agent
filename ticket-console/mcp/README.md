# MCP Terminal Integration for AI Copilot

This directory contains the **Model Context Protocol (MCP)** terminal server that enables the AI Copilot to execute diagnostic commands on **both Windows and Linux** systems.

## Overview

The AI Copilot helps human IT support agents troubleshoot tickets by:
1. Analyzing ticket context and conversation history
2. Suggesting diagnostic commands
3. Executing approved commands via MCP
4. Analyzing output and continuing until resolved

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│   AI Copilot    │────▶│   MCP Client    │────▶│   Terminal Server       │
│   (Frontend)    │     │   (API Route)   │     │      (Python)           │
└─────────────────┘     └─────────────────┘     └───────────┬─────────────┘
         │                                                  │
         │         Approval Workflow                        │
         │◀────────────────────────────────────────────────▶│
         │                                         ┌────────┴────────┐
    User approves                                  │                 │
    or rejects                              ┌──────▼──────┐   ┌──────▼──────┐
                                            │   Windows   │   │    Linux    │
                                            │  (Local)    │   │  (WSL/SSH)  │
                                            └─────────────┘   └─────────────┘
```

## Target Selection

The AI Copilot supports **two execution targets**:

| Target | Icon | Description | Method |
|--------|------|-------------|--------|
| **Local** | 🖥️ | Windows commands | subprocess |
| **Linux** | 🐧 | Linux commands | WSL (default) or SSH |

Switch between targets using the toggle in the Copilot header.

## Architecture

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Terminal Server** | `mcp/terminal_server.py` | MCP server that executes commands |
| **MCP Client** | `src/lib/mcp/terminalClient.ts` | TypeScript client to communicate with server |
| **Execute API** | `src/app/api/agent-copilot/execute/route.ts` | Next.js API route for command execution |
| **Chat API** | `src/app/api/agent-copilot/chat/route.ts` | AI chat with command suggestions |
| **Floating Copilot** | `src/components/AICopilot/FloatingCopilot.tsx` | UI with agentic workflow |

### Security Model (Blocklist Approach)

The server uses a **blocklist-only** approach - the LLM decides what commands to run, and only explicitly dangerous commands are blocked:

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│  1. BLOCKLIST     Dangerous commands/patterns are blocked   │
│  2. RATE LIMIT    30 requests per 60 seconds (configurable) │
│  3. APPROVAL      User must approve before execution        │
│  4. TIMEOUT       30-second max execution time              │
│  5. OUTPUT CAP    8KB max output to prevent memory issues   │
│  6. AUDIT LOG     All executions logged for security        │
└─────────────────────────────────────────────────────────────┘
```

## Blocked Commands

The following are **always blocked** for security:

```
❌ rm -rf, del /s          # Recursive file deletion
❌ format, diskpart, mkfs  # Disk operations
❌ shutdown, reboot, halt  # System control
❌ passwd, useradd         # User manipulation
❌ chmod 777               # Dangerous permissions
❌ nc -l, ncat -l          # Network backdoors
❌ bash -i, /dev/tcp/      # Reverse shells
❌ /etc/shadow, .ssh/      # Credential access
❌ xmrig, minerd           # Crypto miners
```

## Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn
- WSL2 (for Linux target - **no SSH setup needed!**)

### Setup

1. **Install Python dependencies:**
   ```bash
   cd ticket-console/mcp
   pip install -r requirements.txt
   ```

2. **Start the Next.js app:**
   ```bash
   cd ticket-console
   npm run dev
   ```

3. **Test Linux connection:**
   ```bash
   cd ticket-console/mcp
   python test_ssh.py
   ```

## Configuration

All settings are configurable via environment variables or a `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `LINUX_METHOD` | `ssh` | `wsl` or `ssh` |
| `WSL_DISTRO` | `Ubuntu` | WSL distribution name |
| `SSH_HOST` | `localhost` | SSH server address |
| `SSH_PORT` | `22` | SSH port |
| `SSH_USER` | `root` | SSH username |
| `SSH_PASSWORD` | - | Password auth (optional) |
| `SSH_KEY` | - | Key file path (optional) |
| `COMMAND_TIMEOUT` | `30` | Max seconds per command |
| `MAX_OUTPUT_SIZE` | `8000` | Max stdout characters |
| `RATE_LIMIT_REQUESTS` | `30` | Requests per window |
| `RATE_LIMIT_WINDOW` | `60` | Window in seconds |
| `LOG_LEVEL` | `INFO` | Logging level |
| `AUDIT_LOG_FILE` | `terminal_audit.log` | Audit log filename |

## Linux Connection Methods

### Method 1: WSL (Default - No Setup!)

WSL2 is the default and **requires NO authentication**:

```
┌──────────────────────────────────────────────────────────────┐
│  WSL Direct Connection                                       │
│  ─────────────────────                                       │
│  - No SSH keys needed                                        │
│  - No password setup                                         │
│  - Just install WSL: wsl --install                           │
│  - Runs commands via: wsl -e bash -c "command"               │
└──────────────────────────────────────────────────────────────┘
```

**Setup:**
```powershell
# Install WSL (one-time)
wsl --install

# Test it works
python test_ssh.py
```

### Method 2: SSH (Optional)

For remote VMs or if you prefer SSH:

```bash
# Set environment variables
export LINUX_METHOD=ssh
export SSH_HOST=192.168.1.100
export SSH_USER=ubuntu
export SSH_PASSWORD=yourpassword  # or use SSH_KEY

# Test
python test_ssh.py --ssh
```

## Usage

### For IT Agents

1. Open a ticket in the Agent Portal
2. Click the **AI Copilot** button (bottom-right)
3. Ask: *"What's wrong with this ticket?"* or *"Run diagnostics"*
4. Review suggested commands
5. Click **Approve** or **Reject** for each command
6. AI analyzes output and suggests next steps
7. Repeat until resolved

### Trust Mode

Toggle the **Shield** icon in the header:
- 🛡️ **OFF**: Every command requires approval
- ✅ **ON**: Low-risk commands auto-run

## MCP Tools

The server exposes three tools:

### `execute_command`
Execute a diagnostic command on local Windows or remote Linux.

**Parameters:**
- `command` (required): The command to execute
- `target`: `"local"` or `"linux"` (default: `"local"`)
- `ssh_host`, `ssh_port`, `ssh_user`, `ssh_password`: Optional SSH overrides

### `list_targets`
List available execution targets with their status.

### `health_check`
Check server health, SSH availability, and rate limit status.

## Audit Logging

All command executions are logged to `terminal_audit.log`:

```
2024-01-15 10:30:45 | INFO | action=EXECUTE | client=unknown | target=local | status=SUCCESS | exit_code=0 | cmd=ipconfig /all | error=none
2024-01-15 10:31:02 | INFO | action=BLOCKED | client=unknown | target=linux | status=FAILED | exit_code=N/A | cmd=rm -rf / | error=Blocked command: rm -rf /
```

## Development

### Running the Server

```bash
cd ticket-console/mcp
python terminal_server.py
```

### Testing Commands

```bash
# Test validation
python -c "
from terminal_server import validate_command
print(validate_command('ipconfig'))      # (True, 'OK')
print(validate_command('rm -rf /'))      # (False, 'Blocked command: rm -rf /')
"
```

## API Reference

### POST `/api/agent-copilot/chat`

Send a message to the AI Copilot.

**Request:**
```json
{
  "ticketId": "123",
  "message": "What's wrong?",
  "mode": "chat",
  "conversationHistory": [],
  "commandResults": []
}
```

### POST `/api/agent-copilot/execute`

Execute a terminal command via MCP.

**Request:**
```json
{
  "ticketId": "123",
  "command": "ipconfig /all",
  "target": "local"
}
```

## Troubleshooting

### MCP Server Not Starting

```bash
# Check Python version
python --version  # Should be 3.10+

# Install dependencies
pip install -r requirements.txt

# Run with debug logging
LOG_LEVEL=DEBUG python terminal_server.py
```

### Commands Not Executing

1. Check if MCP server is running
2. Verify command is not in blocklist
3. Check browser console for errors
4. Ensure Next.js API routes are accessible

### Rate Limit Exceeded

Wait for the rate limit window to reset, or adjust `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW` environment variables.

## License

Internal use only. Part of U Rack IT Support System.

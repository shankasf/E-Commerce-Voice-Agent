# Ubuntu MCP Agent

Enterprise IT support automation platform for Ubuntu/Linux systems with GUI and CLI support.

## Overview

The Ubuntu MCP Agent is a Linux port of the Windows MCP Agent, providing:
- Automatic GUI/CLI detection and fallback
- Remote diagnostic and remediation capabilities
- Role-based access control (AI_AGENT, HUMAN_AGENT, ADMIN)
- MCP protocol WebSocket communication
- JWT authentication
- Comprehensive audit logging

## Features

### Automatic GUI/CLI Fallback
- Detects if X11/Wayland display is available
- Launches GUI (PyQt6) when desktop environment is present
- Falls back to CLI interface on headless servers
- All features work in both modes

### Diagnostic Tools (SAFE - AI_AGENT)
- `check_cpu_usage` - CPU utilization monitoring
- `check_memory_usage` - RAM usage statistics
- `check_disk_usage` - Disk space analysis
- `check_system_uptime` - System runtime
- `check_system_logs` - System log analysis (journalctl)
- `check_network_status` - Network interface status
- `check_ip_address` - IP configuration

### Network Tools (CAUTION - AI_AGENT)
- `flush_dns_cache` - Flush systemd-resolved cache
- `renew_ip_address` - DHCP renewal
- `reset_network_stack` - Network service restart
- `network_adapter_reset` - Network interface reset

### System Tools (CAUTION - AI_AGENT)
- `clear_tmp_files` - Clear /tmp directory
- `clear_user_cache` - Clear user cache files
- `restart_whitelisted_service` - Restart approved services
- `restart_system` - Scheduled system restart

### Advanced Tools (HUMAN_AGENT)
- `restart_any_service` - Restart any systemd service
- `restart_application` - Kill and restart process
- `package_update_repair` - APT/DNF package manager repair

### Administrative Tools (ADMIN)
- `system_restart_immediate` - Immediate system restart
- `firewall_rule_repair` - UFW/firewalld configuration

## Installation

### Prerequisites
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv

# For GUI support (optional)
sudo apt install python3-pyqt6 libnotify-bin

# For system management
sudo apt install systemd
```

### Setup
```bash
cd Ubuntu
chmod +x install.sh
./install.sh
```

This will:
1. Create a Python virtual environment
2. Install dependencies
3. Configure systemd service (optional)
4. Set up logging directories

## Configuration

Configuration file: `~/.config/ubuntu-mcp-agent/config.json`

```json
{
  "backend": {
    "api_url": "http://localhost:9000",
    "jwt_secret": "your-secret-key",
    "reconnect_delay_seconds": 5,
    "connection_timeout_seconds": 30
  },
  "logging": {
    "level": "INFO",
    "enable_audit": true,
    "log_dir": "~/.local/share/ubuntu-mcp-agent/logs"
  },
  "ui": {
    "force_cli": false,
    "enable_notifications": true
  }
}
```

## Usage

### Interactive Mode (Auto-detect GUI/CLI)
```bash
./run.sh
```

### Force CLI Mode
```bash
./run.sh --cli
```

### Force GUI Mode
```bash
./run.sh --gui
```

### Systemd Service (Background Daemon)
```bash
# Install service
sudo ./install-service.sh

# Start service
sudo systemctl start ubuntu-mcp-agent

# Enable on boot
sudo systemctl enable ubuntu-mcp-agent

# Check status
sudo systemctl status ubuntu-mcp-agent

# View logs
journalctl -u ubuntu-mcp-agent -f
```

### Registration (First Run)
```bash
# GUI Mode: Registration dialog will appear
# CLI Mode: Interactive prompts
Email: user@example.com
U&E Code: your-employee-code
```

## Architecture

```
Ubuntu/
├── src/
│   ├── main.py                    # Entry point with environment detection
│   ├── core/                      # Core business logic
│   │   ├── models.py             # Domain models (Role, ToolPolicy, etc.)
│   │   ├── auth/
│   │   │   ├── jwt_validator.py  # JWT token validation
│   │   │   └── device_registration.py  # Device registration
│   │   ├── mcp/
│   │   │   ├── client.py         # WebSocket MCP client
│   │   │   └── dispatcher.py     # Tool execution orchestrator
│   │   ├── tools/
│   │   │   ├── base.py           # Tool interface
│   │   │   ├── registry.py       # Tool registry
│   │   │   ├── authorization.py  # Authorization engine
│   │   │   ├── system/           # System diagnostic/remediation tools
│   │   │   ├── network/          # Network tools
│   │   │   └── service/          # Service management tools
│   │   ├── services/
│   │   │   ├── notification.py   # Notifications (GUI/CLI)
│   │   │   ├── audit_logger.py   # Audit logging
│   │   │   ├── storage.py        # Local storage
│   │   │   └── idle_check.py     # User idle detection
│   │   └── utils/
│   │       └── environment.py    # GUI/CLI detection
│   │
│   ├── gui/                       # PyQt6 GUI
│   │   ├── main_window.py        # Main application window
│   │   ├── login_window.py       # Registration dialog
│   │   ├── tray_icon.py          # System tray integration
│   │   └── widgets/              # Custom widgets
│   │
│   └── cli/                       # CLI interface
│       ├── main.py               # CLI application
│       ├── commands.py           # CLI command handlers
│       └── display.py            # Terminal output formatting
│
├── config/
│   └── default_config.json       # Default configuration
│
├── systemd/
│   └── ubuntu-mcp-agent.service  # Systemd service file
│
├── requirements.txt              # Python dependencies
├── install.sh                    # Installation script
├── install-service.sh            # Systemd service installer
└── run.sh                        # Launcher script
```

## Linux Tool Equivalents

| Windows Tool | Ubuntu Equivalent | Implementation |
|--------------|-------------------|----------------|
| WMI queries | psutil, /proc filesystem | Python psutil library |
| Event Viewer | journalctl | systemd journal API |
| ipconfig | ip addr, nmcli | NetworkManager/iproute2 |
| Service Controller | systemctl | systemd D-Bus API |
| Registry | N/A | Configuration files |
| Windows Update | apt/dnf/yum | Package manager APIs |
| Task Manager | ps, top | psutil, /proc |
| Firewall | ufw/firewalld | Command-line wrappers |

## Security Features

- **JWT Authentication**: Token-based role validation
- **Device Registration**: Unique device ID (UUID)
- **Role-Based Access Control**: Three-tier permission system
- **Schema Validation**: Argument type checking
- **Execution Timeouts**: Prevents hanging operations
- **Audit Logging**: Complete execution history
- **Privilege Separation**: Runs as unprivileged user, elevates as needed
- **Sudo Integration**: Secure privilege escalation for admin tools

## Logging

Logs location: `~/.local/share/ubuntu-mcp-agent/logs/`

- `audit_YYYYMMDD.log` - Tool execution history
- `authorization_YYYYMMDD.log` - Authorization decisions
- `connection_YYYYMMDD.log` - WebSocket connection events
- `application.log` - General application logs

## GUI Features (Desktop Mode)

- System tray integration with status indicator
- Connection status dashboard
- Real-time tool execution log viewer
- Desktop notifications for important events
- Restart confirmation dialogs
- Dark mode support

## CLI Features (Headless Mode)

- Interactive registration
- Status monitoring commands
- Real-time log tailing
- Tool execution history
- Connection status display
- Progress indicators with rich library

## Requirements

- Python 3.8+
- systemd-based Linux distribution (Ubuntu 18.04+, Debian 10+, RHEL 8+, etc.)
- sudo access for administrative tools
- Network connectivity to backend server

## Development

### Running Tests
```bash
python -m pytest tests/
```

### Code Style
```bash
# Format code
black src/

# Lint
flake8 src/
pylint src/
```

## Troubleshooting

### GUI Not Launching
```bash
# Check display
echo $DISPLAY

# Force CLI mode
./run.sh --cli
```

### Permission Denied Errors
```bash
# Check if user is in required groups
groups

# Add user to required groups
sudo usermod -aG systemd-journal $USER
```

### Service Not Starting
```bash
# Check service status
sudo systemctl status ubuntu-mcp-agent

# View detailed logs
journalctl -u ubuntu-mcp-agent -n 100 --no-pager
```

## License

Same as Windows MCP Agent

## Support

For issues and questions, please contact the IT support team or file an issue in the project repository.

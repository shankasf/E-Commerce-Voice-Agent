# Ubuntu MCP Agent - Developer Guide

## Quick Reference

### Project Structure
```
Ubuntu/
├── src/
│   ├── main.py                 # Entry point
│   ├── core/                   # Business logic
│   │   ├── models.py          # Data models
│   │   ├── auth/              # Authentication
│   │   ├── mcp/               # MCP protocol
│   │   ├── services/          # Services
│   │   ├── tools/             # Tool system
│   │   └── utils/             # Utilities
│   ├── gui/                   # PyQt6 GUI
│   └── cli/                   # Rich CLI
├── config/                    # Configuration
├── systemd/                   # Service files
└── scripts/                   # Shell scripts
```

## Adding a New Tool

### 1. Create Tool Class

Create `src/core/tools/category/my_tool.py`:

```python
from typing import Dict, Any
from ..base import BaseTool
from ...models import ToolResult

class MyTool(BaseTool):
    """Brief description of what the tool does."""

    def __init__(self):
        super().__init__()
        self._name = "my_tool"
        self._description = "Detailed description"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Define JSON schema for parameters."""
        return {
            "type": "object",
            "properties": {
                "param1": {
                    "type": "string",
                    "description": "Parameter description",
                    "default": "default_value"
                }
            },
            "required": ["param1"]
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """Execute the tool."""
        try:
            param1 = arguments.get("param1")

            # Your implementation here
            stdout, stderr, returncode = await self._run_command(
                ["ls", "-la"],
                timeout=30,
                require_sudo=False,
            )

            if returncode != 0:
                return self._failure(f"Command failed: {stderr}")

            return self._success(
                f"Operation completed: {stdout}",
                metadata_key=param1,
            )

        except Exception as e:
            return self._failure(f"Error: {str(e)}")
```

### 2. Add to Package

Edit `src/core/tools/category/__init__.py`:

```python
from .my_tool import MyTool

__all__ = [..., "MyTool"]
```

### 3. Register Tool

Edit `src/main.py` in `ApplicationState._register_tools()`:

```python
from core.tools.category import MyTool

# In _register_tools method:
self.registry.register(
    MyTool(),
    ToolPolicy(
        min_role=Role.HUMAN_AGENT,
        risk_level=RiskLevel.CAUTION,
        timeout_seconds=60,
        requires_sudo=False,
        requires_idle=False,
        requires_confirmation=False,
    ),
)
```

## Tool Base Class Helpers

### Running Commands

```python
# Basic command
stdout, stderr, returncode = await self._run_command(
    ["command", "arg1", "arg2"],
    timeout=30,
)

# With sudo
stdout, stderr, returncode = await self._run_command(
    ["systemctl", "restart", "service"],
    timeout=60,
    require_sudo=True,
)
```

### Returning Results

```python
# Success
return self._success(
    "Operation successful",
    key1="value1",
    key2="value2",
)

# Failure
return self._failure(
    "Operation failed: reason",
    error_code=123,
)
```

## Role-Based Access Control

### Role Hierarchy
```python
Role.AI_AGENT = 0      # Lowest - read-only monitoring
Role.HUMAN_AGENT = 1   # Medium - system management
Role.ADMIN = 2         # Highest - critical operations
```

### Risk Levels
```python
RiskLevel.SAFE      # No system changes
RiskLevel.CAUTION   # Reversible changes
RiskLevel.ELEVATED  # Irreversible changes
```

### Tool Policy Configuration
```python
ToolPolicy(
    min_role=Role.HUMAN_AGENT,        # Minimum required role
    risk_level=RiskLevel.CAUTION,     # Risk assessment
    timeout_seconds=60,                # Max execution time
    requires_sudo=True,                # Needs root privileges
    requires_idle=False,               # Wait for user idle
    requires_confirmation=True,        # Show notification
)
```

## Using psutil for System Monitoring

### CPU Usage
```python
import psutil

# Overall CPU
cpu_percent = psutil.cpu_percent(interval=1)

# Per-CPU
per_cpu = psutil.cpu_percent(interval=1, percpu=True)

# Top processes
for proc in psutil.process_iter(['pid', 'name', 'cpu_percent']):
    print(proc.info)
```

### Memory Usage
```python
# Virtual memory
mem = psutil.virtual_memory()
print(f"Total: {mem.total / (1024**3):.2f} GB")
print(f"Used: {mem.used / (1024**3):.2f} GB")
print(f"Percent: {mem.percent}%")

# Swap
swap = psutil.swap_memory()
```

### Disk Usage
```python
# Partitions
for part in psutil.disk_partitions():
    usage = psutil.disk_usage(part.mountpoint)
    print(f"{part.mountpoint}: {usage.percent}%")
```

### Network
```python
# Interface stats
stats = psutil.net_if_stats()

# Addresses
addrs = psutil.net_if_addrs()

# I/O counters
io = psutil.net_io_counters(pernic=True)
```

## Environment Detection

### Checking Display Availability
```python
from core.utils.environment import EnvironmentDetector

# Check display
has_display = EnvironmentDetector.has_display()

# Check PyQt6
can_gui = EnvironmentDetector.can_import_pyqt6()

# Determine mode
use_gui = EnvironmentDetector.should_use_gui(
    force_cli=False,
    force_gui=False,
)
```

## Notifications

### Sending Notifications
```python
from core.services.notification import NotificationService

notif = NotificationService(use_gui=True)

# Tool execution
await notif.notify_tool_execution(
    tool_name="my_tool",
    role=Role.HUMAN_AGENT,
    risk_level=RiskLevel.CAUTION,
)

# Connection status
await notif.notify_connection_status(
    is_connected=True,
    backend_url="ws://localhost:3000",
)

# Error
await notif.notify_error(
    "Error Title",
    "Error message details",
)
```

## Idle Detection

### Checking User Idle
```python
from core.services.idle_check import IdleCheckService

idle_check = IdleCheckService(idle_threshold_seconds=300)

# Check if idle
is_idle = idle_check.is_user_idle()

# Get idle time
idle_seconds = idle_check.get_idle_time_seconds()
```

## MCP Client Usage

### Connecting to Backend
```python
from core.mcp.client import MCPClient

client = MCPClient(
    backend_url="ws://localhost:3000/ws",
    jwt_token="your_token",
    device_id="device_id",
)

# Set handlers
client.set_message_handler(handle_tool_call)
client.set_status_change_handler(handle_status)

# Run
await client.run()
```

### Sending Results
```python
from core.models import ToolResultMessage, ToolStatus

result = ToolResultMessage(
    message_type="tool_result",
    id="call_id",
    status=ToolStatus.SUCCESS.value,
    output="Tool output",
    error=None,
    execution_time_ms=100,
)

await client.send_tool_result(result)
```

## Logging

### Application Logging
```python
import logging

logger = logging.getLogger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message", exc_info=True)
```

### Audit Logging
```python
from core.services.audit_logger import AuditLogger
from core.models import AuditLogEntry

audit = AuditLogger(log_dir="~/.local/share/ubuntu-mcp-agent/logs")

entry = AuditLogEntry(
    timestamp=datetime.utcnow(),
    tool_name="my_tool",
    role=Role.HUMAN_AGENT,
    authorized=True,
    status=ToolStatus.SUCCESS,
    output="Output",
    error=None,
    execution_time_ms=100,
)

await audit.log(entry)
```

## Testing

### Unit Tests
```python
import pytest
from core.tools.system.my_tool import MyTool

@pytest.mark.asyncio
async def test_my_tool_success():
    tool = MyTool()
    result = await tool.execute({"param1": "value1"})

    assert result.status == ToolStatus.SUCCESS
    assert "expected" in result.output

@pytest.mark.asyncio
async def test_my_tool_failure():
    tool = MyTool()
    result = await tool.execute({"invalid": "param"})

    assert result.status == ToolStatus.FAILURE
```

### Running Tests
```bash
# All tests
pytest tests/

# Specific test
pytest tests/test_my_tool.py

# With coverage
pytest --cov=src tests/
```

## Common Patterns

### Checking if Command Exists
```python
async def _command_exists(self, command: str) -> bool:
    """Check if command is available."""
    stdout, stderr, returncode = await self._run_command(
        ["which", command],
        timeout=2,
    )
    return returncode == 0
```

### Detecting Package Manager
```python
async def _detect_package_manager(self) -> str:
    """Detect system package manager."""
    if await self._command_exists("apt-get"):
        return "apt"
    elif await self._command_exists("dnf"):
        return "dnf"
    elif await self._command_exists("yum"):
        return "yum"
    return ""
```

### Safe File Operations
```python
import os
from pathlib import Path

# Expand user home
path = Path("~/.config/app").expanduser()

# Check existence
if path.exists():
    # Read
    content = path.read_text()

    # Write
    path.write_text(content)

# Create directory
path.mkdir(parents=True, exist_ok=True)
```

### Async Sleep
```python
import asyncio

await asyncio.sleep(2)  # Sleep 2 seconds
```

## Debugging

### Enable Debug Logging
```bash
./run.sh --debug
```

### View Logs
```bash
# Application logs
tail -f ~/.local/share/ubuntu-mcp-agent/logs/application.log

# Audit logs
tail -f ~/.local/share/ubuntu-mcp-agent/logs/audit_*.log

# Service logs
journalctl -u ubuntu-mcp-agent -f
```

### Interactive Python
```bash
source venv/bin/activate
python3

>>> from core.tools.system.check_cpu_usage import CheckCPUUsageTool
>>> import asyncio
>>> tool = CheckCPUUsageTool()
>>> result = asyncio.run(tool.execute({}))
>>> print(result.output)
```

## Performance Tips

1. **Use psutil for system info** - Much faster than parsing /proc
2. **Set appropriate timeouts** - Prevent hanging operations
3. **Cache expensive operations** - Store results when possible
4. **Use async/await** - Don't block the event loop
5. **Limit log size** - Truncate large outputs

## Security Best Practices

1. **Validate all inputs** - Never trust arguments
2. **Use allowlists** - Don't use blocklists
3. **Minimize sudo usage** - Only when necessary
4. **Sanitize commands** - Prevent injection attacks
5. **Check file permissions** - Before reading/writing
6. **Log everything** - Maintain audit trail
7. **Use secure storage** - Encrypt sensitive data

## Common Issues

### PyQt6 Not Found
```bash
# Ubuntu/Debian
sudo apt install python3-pyqt6

# Fedora
sudo dnf install python3-qt6

# Or use CLI mode
./run.sh --cli
```

### Permission Denied
```bash
# Add user to systemd-journal group
sudo usermod -aG systemd-journal $USER

# Configure sudo
sudo visudo -f /etc/sudoers.d/ubuntu-mcp-agent
```

### Service Won't Start
```bash
# Check logs
journalctl -u ubuntu-mcp-agent -n 100

# Verify paths in service file
systemctl cat ubuntu-mcp-agent

# Test manually
./run.sh --cli --debug
```

## Resources

- Python asyncio: https://docs.python.org/3/library/asyncio.html
- psutil documentation: https://psutil.readthedocs.io/
- PyQt6 documentation: https://doc.qt.io/qtforpython-6/
- Rich documentation: https://rich.readthedocs.io/
- systemd documentation: https://www.freedesktop.org/software/systemd/man/

## Getting Help

1. Check README.md
2. Review IMPLEMENTATION_COMPLETE.md
3. Check existing tools for examples
4. Enable debug logging
5. Check audit logs
6. Contact development team

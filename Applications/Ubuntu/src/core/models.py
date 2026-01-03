"""
Core domain models for Ubuntu MCP Agent.
"""
from enum import Enum, IntEnum
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime


class Role(IntEnum):
    """User roles with hierarchy (higher value = more privileges)."""
    AI_AGENT = 0
    HUMAN_AGENT = 1
    ADMIN = 2

    @classmethod
    def from_string(cls, role_str: str) -> "Role":
        """Convert string to Role enum."""
        role_map = {
            "ai_agent": cls.AI_AGENT,
            "human_agent": cls.HUMAN_AGENT,
            "admin": cls.ADMIN,
        }
        return role_map.get(role_str.lower(), cls.AI_AGENT)


class RiskLevel(Enum):
    """Risk level for tool execution."""
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    ELEVATED = "ELEVATED"


class ToolStatus(Enum):
    """Tool execution status."""
    SUCCESS = "success"
    FAILURE = "failure"
    UNAUTHORIZED = "unauthorized"
    TIMEOUT = "timeout"
    INVALID_ARGUMENTS = "invalid_arguments"


@dataclass
class ToolPolicy:
    """Policy configuration for a tool."""
    min_role: Role
    risk_level: RiskLevel
    requires_idle: bool = False
    requires_confirmation: bool = False
    timeout_seconds: int = 300
    requires_sudo: bool = False

    def __post_init__(self):
        """Validate policy configuration."""
        if self.timeout_seconds <= 0:
            raise ValueError("Timeout must be positive")


@dataclass
class ToolResult:
    """Result of tool execution."""
    status: ToolStatus
    output: str = ""
    error: Optional[str] = None
    execution_time_ms: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "status": self.status.value,
            "output": self.output,
            "error": self.error,
            "execution_time_ms": self.execution_time_ms,
            "metadata": self.metadata,
        }


@dataclass
class ToolCallMessage:
    """Incoming tool call message from backend."""
    message_type: str  # "tool_call"
    id: str
    name: str
    arguments: Dict[str, Any]
    role: Role

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ToolCallMessage":
        """Create from dictionary."""
        return cls(
            message_type=data.get("type", "tool_call"),
            id=data["id"],
            name=data["name"],
            arguments=data.get("arguments", {}),
            role=Role.from_string(data.get("role", "ai_agent")),
        )


@dataclass
class ToolResultMessage:
    """Outgoing tool result message to backend."""
    message_type: str  # "tool_result"
    id: str
    status: str
    output: str
    error: Optional[str]
    execution_time_ms: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "type": self.message_type,
            "id": self.id,
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "executionTimeMs": self.execution_time_ms,
        }


@dataclass
class DeviceRegistration:
    """Device registration request."""
    email: str
    ue_code: str
    device_id: str
    device_name: str
    os_version: str
    mcp_url: str


@dataclass
class DeviceRegistrationResponse:
    """Device registration response from backend."""
    success: bool
    token: str
    device_id: str
    client_id: str
    user_id: str
    error: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DeviceRegistrationResponse":
        """Create from dictionary."""
        return cls(
            success=data.get("success", False),
            token=data.get("jwt_token", data.get("token", "")),  # Backend returns jwt_token
            device_id=data.get("device_id", ""),
            client_id=data.get("client_id", ""),
            user_id=data.get("user_id", ""),
            error=data.get("error", data.get("message")),  # Check both error and message fields
        )


@dataclass
class ConnectionStatus:
    """WebSocket connection status."""
    is_connected: bool
    backend_url: str
    last_connected: Optional[datetime] = None
    last_error: Optional[str] = None
    retry_count: int = 0


@dataclass
class ToolDefinition:
    """Tool definition with metadata."""
    name: str
    description: str
    parameters: Dict[str, Any]
    policy: ToolPolicy
    execute_func: Callable


@dataclass
class AuditLogEntry:
    """Audit log entry."""
    timestamp: datetime
    tool_name: str
    role: Role
    authorized: bool
    status: ToolStatus
    output: str
    error: Optional[str]
    execution_time_ms: int
    user_id: Optional[str] = None
    device_id: Optional[str] = None

    def to_log_line(self) -> str:
        """Convert to log line format."""
        return (
            f"{self.timestamp.isoformat()} | "
            f"Tool: {self.tool_name} | "
            f"Role: {self.role.name} | "
            f"Authorized: {self.authorized} | "
            f"Status: {self.status.value} | "
            f"Error: {self.error or 'None'} | "
            f"Time: {self.execution_time_ms}ms"
        )


@dataclass
class AuthorizationDecision:
    """Authorization decision for a tool call."""
    allowed: bool
    reason: str
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_log_line(self) -> str:
        """Convert to log line format."""
        return (
            f"{self.timestamp.isoformat()} | "
            f"Allowed: {self.allowed} | "
            f"Reason: {self.reason}"
        )


@dataclass
class AppConfig:
    """Application configuration."""
    backend_api_url: str
    jwt_secret: str
    reconnect_delay_seconds: int = 5
    connection_timeout_seconds: int = 30
    log_level: str = "INFO"
    enable_audit_logging: bool = True
    log_dir: str = "~/.local/share/ubuntu-mcp-agent/logs"
    config_dir: str = "~/.config/ubuntu-mcp-agent"
    force_cli: bool = False
    enable_notifications: bool = True

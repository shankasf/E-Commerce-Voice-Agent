"""
WebSocket package for URackIT AI Service.

Provides WebSocket communication with Windows devices for remote support.

Modules:
- device_handler: Main session handler
- connection_manager: Active connection tracking
- auth: Authentication and code validation
- rate_limiter: Brute-force protection
- models: Message type definitions
- config: Centralized configuration
- debounce: Message batching for AI triggers
- cleanup: Background cleanup tasks
- retry: Exponential backoff utilities
"""

# Core handler
from .device_handler import (
    DeviceSession,
    DeviceWebSocketHandler,  # Backwards compat alias
    handle_device_websocket,
)

# Connection management
from .connection_manager import (
    DeviceConnectionManager,
    device_connection_manager,
    get_connection_manager,
)

# Authentication
from .auth import (
    AuthParams,
    AuthResult,
    validate_connection_code,
    mark_connection_active,
    mark_connection_inactive,
)

# Rate limiting
from .rate_limiter import (
    RateLimiter,
    RateLimitConfig,
    RateLimitResult,
    get_auth_rate_limiter,
)

# Configuration
from .config import (
    WebSocketConfig,
    HeartbeatConfig,
    AuthConfig,
    CommandConfig,
    get_ws_config,
    reload_config,
)

# Message models
from .models import (
    WSMessage,
    AuthRequest,
    ChatMessage,
    ChatHistory,
    PowerShellRequest,
    PowerShellResult,
    CommandConsent,
    ConnectionEstablished,
    ErrorMessage,
    Heartbeat,
    HeartbeatAck,
    parse_message,
)

# Debouncing
from .debounce import (
    MessageDebouncer,
    AITriggerDebouncer,
    DebounceConfig,
    combine_messages,
)

# Cleanup
from .cleanup import (
    CleanupManager,
    ConnectionCleaner,
    CleanupConfig,
    CleanupStats,
    get_cleanup_manager,
)

# Retry utilities
from .retry import (
    RetryConfig,
    RetryResult,
    retry_async,
    calculate_delay,
    CommandQueue,
    CommandPriority,
)

__all__ = [
    # Core
    "DeviceSession",
    "DeviceWebSocketHandler",
    "handle_device_websocket",
    # Connection manager
    "DeviceConnectionManager",
    "device_connection_manager",
    "get_connection_manager",
    # Auth
    "AuthParams",
    "AuthResult",
    "validate_connection_code",
    "mark_connection_active",
    "mark_connection_inactive",
    # Rate limiting
    "RateLimiter",
    "RateLimitConfig",
    "RateLimitResult",
    "get_auth_rate_limiter",
    # Config
    "WebSocketConfig",
    "HeartbeatConfig",
    "AuthConfig",
    "CommandConfig",
    "get_ws_config",
    "reload_config",
    # Models
    "WSMessage",
    "AuthRequest",
    "ChatMessage",
    "ChatHistory",
    "PowerShellRequest",
    "PowerShellResult",
    "CommandConsent",
    "ConnectionEstablished",
    "ErrorMessage",
    "Heartbeat",
    "HeartbeatAck",
    "parse_message",
    # Debounce
    "MessageDebouncer",
    "AITriggerDebouncer",
    "DebounceConfig",
    "combine_messages",
    # Cleanup
    "CleanupManager",
    "ConnectionCleaner",
    "CleanupConfig",
    "CleanupStats",
    "get_cleanup_manager",
    # Retry
    "RetryConfig",
    "RetryResult",
    "retry_async",
    "calculate_delay",
    "CommandQueue",
    "CommandPriority",
]

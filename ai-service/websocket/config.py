"""
WebSocket Configuration.

Centralized configuration for all WebSocket-related settings.
Can be overridden via environment variables.
"""

import os
from dataclasses import dataclass
from typing import Optional


def _get_int(key: str, default: int) -> int:
    """Get int from environment variable."""
    value = os.environ.get(key)
    if value:
        try:
            return int(value)
        except ValueError:
            pass
    return default


def _get_float(key: str, default: float) -> float:
    """Get float from environment variable."""
    value = os.environ.get(key)
    if value:
        try:
            return float(value)
        except ValueError:
            pass
    return default


def _get_bool(key: str, default: bool) -> bool:
    """Get bool from environment variable."""
    value = os.environ.get(key)
    if value:
        return value.lower() in ('true', '1', 'yes')
    return default


@dataclass
class HeartbeatConfig:
    """Heartbeat configuration."""
    interval: int = 30  # seconds between heartbeat checks
    timeout: int = 90   # seconds before considering connection dead

    @classmethod
    def from_env(cls) -> "HeartbeatConfig":
        """Create config from environment variables."""
        return cls(
            interval=_get_int("WS_HEARTBEAT_INTERVAL", 30),
            timeout=_get_int("WS_HEARTBEAT_TIMEOUT", 90),
        )


@dataclass
class AuthConfig:
    """Authentication configuration."""
    timeout: int = 30  # seconds to wait for auth message
    code_expiration: int = 900  # 15 minutes in seconds
    rate_limit_attempts: int = 5
    rate_limit_window: int = 60  # seconds

    @classmethod
    def from_env(cls) -> "AuthConfig":
        """Create config from environment variables."""
        return cls(
            timeout=_get_int("WS_AUTH_TIMEOUT", 30),
            code_expiration=_get_int("WS_CODE_EXPIRATION", 900),
            rate_limit_attempts=_get_int("WS_RATE_LIMIT_ATTEMPTS", 5),
            rate_limit_window=_get_int("WS_RATE_LIMIT_WINDOW", 60),
        )


@dataclass
class CommandConfig:
    """Command execution configuration."""
    default_timeout: int = 120  # seconds to wait for command result
    max_timeout: int = 300  # maximum allowed timeout
    queue_size: int = 100  # max commands in queue

    @classmethod
    def from_env(cls) -> "CommandConfig":
        """Create config from environment variables."""
        return cls(
            default_timeout=_get_int("WS_COMMAND_TIMEOUT", 120),
            max_timeout=_get_int("WS_COMMAND_MAX_TIMEOUT", 300),
            queue_size=_get_int("WS_COMMAND_QUEUE_SIZE", 100),
        )


@dataclass
class DebounceConfig:
    """Message debouncing configuration."""
    enabled: bool = True
    delay: float = 0.5  # seconds to wait for more messages
    max_delay: float = 2.0  # max wait before forcing trigger
    max_batch_size: int = 5  # max messages to batch

    @classmethod
    def from_env(cls) -> "DebounceConfig":
        """Create config from environment variables."""
        return cls(
            enabled=_get_bool("WS_DEBOUNCE_ENABLED", True),
            delay=_get_float("WS_DEBOUNCE_DELAY", 0.5),
            max_delay=_get_float("WS_DEBOUNCE_MAX_DELAY", 2.0),
            max_batch_size=_get_int("WS_DEBOUNCE_MAX_BATCH", 5),
        )


@dataclass
class CleanupConfig:
    """Cleanup task configuration."""
    enabled: bool = True
    sweep_interval: int = 60  # seconds between stale sweeps
    stale_threshold: int = 120  # seconds since heartbeat to consider stale
    rate_limit_cleanup_interval: int = 300  # 5 minutes

    @classmethod
    def from_env(cls) -> "CleanupConfig":
        """Create config from environment variables."""
        return cls(
            enabled=_get_bool("WS_CLEANUP_ENABLED", True),
            sweep_interval=_get_int("WS_CLEANUP_INTERVAL", 60),
            stale_threshold=_get_int("WS_STALE_THRESHOLD", 120),
            rate_limit_cleanup_interval=_get_int("WS_RATE_CLEANUP_INTERVAL", 300),
        )


@dataclass
class WebSocketConfig:
    """
    Complete WebSocket configuration.

    All settings can be overridden via environment variables:
    - WS_HEARTBEAT_INTERVAL: Heartbeat check interval (default: 30s)
    - WS_HEARTBEAT_TIMEOUT: Connection timeout (default: 90s)
    - WS_AUTH_TIMEOUT: Auth message timeout (default: 30s)
    - WS_CODE_EXPIRATION: 6-digit code TTL (default: 900s/15min)
    - WS_RATE_LIMIT_ATTEMPTS: Max auth attempts (default: 5)
    - WS_RATE_LIMIT_WINDOW: Rate limit window (default: 60s)
    - WS_COMMAND_TIMEOUT: Command result timeout (default: 120s)
    - WS_DEBOUNCE_ENABLED: Enable message debouncing (default: true)
    - WS_DEBOUNCE_DELAY: Debounce delay (default: 0.5s)
    - WS_CLEANUP_ENABLED: Enable background cleanup (default: true)
    - WS_CLEANUP_INTERVAL: Cleanup sweep interval (default: 60s)
    """
    heartbeat: HeartbeatConfig
    auth: AuthConfig
    command: CommandConfig
    debounce: DebounceConfig
    cleanup: CleanupConfig

    @classmethod
    def from_env(cls) -> "WebSocketConfig":
        """Create complete config from environment variables."""
        return cls(
            heartbeat=HeartbeatConfig.from_env(),
            auth=AuthConfig.from_env(),
            command=CommandConfig.from_env(),
            debounce=DebounceConfig.from_env(),
            cleanup=CleanupConfig.from_env(),
        )

    @classmethod
    def default(cls) -> "WebSocketConfig":
        """Create config with default values."""
        return cls(
            heartbeat=HeartbeatConfig(),
            auth=AuthConfig(),
            command=CommandConfig(),
            debounce=DebounceConfig(),
            cleanup=CleanupConfig(),
        )


# Singleton instance
_config: Optional[WebSocketConfig] = None


def get_ws_config() -> WebSocketConfig:
    """
    Get the WebSocket configuration singleton.

    Loads from environment variables on first call.
    """
    global _config
    if _config is None:
        _config = WebSocketConfig.from_env()
    return _config


def reload_config() -> WebSocketConfig:
    """Reload configuration from environment variables."""
    global _config
    _config = WebSocketConfig.from_env()
    return _config

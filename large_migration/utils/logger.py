"""
Logging utility for the Migration Agent System.
Provides real-time logging that can be displayed in the Streamlit UI.
"""

import logging
from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass, field
from enum import Enum


class LogLevel(Enum):
    INFO = "INFO"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    ERROR = "ERROR"
    AGENT = "AGENT"
    TOOL = "TOOL"
    FILE = "FILE"
    DB = "DB"


@dataclass
class LogEntry:
    timestamp: str
    level: LogLevel
    message: str
    details: Optional[str] = None


class AppLogger:
    """Application logger that stores logs for UI display."""

    _instance = None
    _logs: List[LogEntry] = []
    _max_logs: int = 100

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._logs = []
        return cls._instance

    def _add_log(self, level: LogLevel, message: str, details: Optional[str] = None):
        """Add a log entry."""
        entry = LogEntry(
            timestamp=datetime.now().strftime("%H:%M:%S"),
            level=level,
            message=message,
            details=details
        )
        self._logs.append(entry)

        # Keep only last N logs
        if len(self._logs) > self._max_logs:
            self._logs = self._logs[-self._max_logs:]

    def info(self, message: str, details: Optional[str] = None):
        """Log info message."""
        self._add_log(LogLevel.INFO, message, details)

    def success(self, message: str, details: Optional[str] = None):
        """Log success message."""
        self._add_log(LogLevel.SUCCESS, message, details)

    def warning(self, message: str, details: Optional[str] = None):
        """Log warning message."""
        self._add_log(LogLevel.WARNING, message, details)

    def error(self, message: str, details: Optional[str] = None):
        """Log error message."""
        self._add_log(LogLevel.ERROR, message, details)

    def agent(self, message: str, details: Optional[str] = None):
        """Log agent activity."""
        self._add_log(LogLevel.AGENT, message, details)

    def tool(self, message: str, details: Optional[str] = None):
        """Log tool call."""
        self._add_log(LogLevel.TOOL, message, details)

    def file_op(self, message: str, details: Optional[str] = None):
        """Log file operation."""
        self._add_log(LogLevel.FILE, message, details)

    def db(self, message: str, details: Optional[str] = None):
        """Log database operation."""
        self._add_log(LogLevel.DB, message, details)

    def get_logs(self, limit: int = 50) -> List[LogEntry]:
        """Get recent logs."""
        return self._logs[-limit:]

    def clear(self):
        """Clear all logs."""
        self._logs = []

    def format_for_display(self, limit: int = 30) -> str:
        """Format logs for Streamlit display."""
        logs = self.get_logs(limit)
        if not logs:
            return "No activity yet..."

        lines = []
        level_icons = {
            LogLevel.INFO: "ℹ️",
            LogLevel.SUCCESS: "✅",
            LogLevel.WARNING: "⚠️",
            LogLevel.ERROR: "❌",
            LogLevel.AGENT: "🤖",
            LogLevel.TOOL: "🔧",
            LogLevel.FILE: "📁",
            LogLevel.DB: "🗄️",
        }

        for log in reversed(logs):  # Show newest first
            icon = level_icons.get(log.level, "•")
            line = f"{log.timestamp} {icon} {log.message}"
            if log.details:
                line += f"\n         └─ {log.details}"
            lines.append(line)

        return "\n".join(lines)


# Global logger instance
app_logger = AppLogger()


def get_logger() -> AppLogger:
    """Get the global logger instance."""
    return app_logger

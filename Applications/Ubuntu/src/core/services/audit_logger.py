"""
Audit logging service for tracking tool executions and authorization decisions.
"""
import os
from pathlib import Path
from datetime import datetime
from typing import Optional
import threading

from ..models import AuditLogEntry, AuthorizationDecision


class AuditLogger:
    """Manages audit logging for tool executions and authorization decisions."""

    def __init__(self, log_dir: str = "~/.local/share/ubuntu-mcp-agent/logs"):
        """
        Initialize audit logger.

        Args:
            log_dir: Directory for log files
        """
        self.log_dir = Path(log_dir).expanduser()
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Thread lock for file writes
        self._lock = threading.Lock()

        # Ensure log files exist
        self._ensure_log_files()

    def _ensure_log_files(self):
        """Ensure log files exist with proper permissions."""
        log_files = [
            self._get_audit_log_path(),
            self._get_authorization_log_path(),
            self._get_connection_log_path(),
        ]

        for log_file in log_files:
            if not log_file.exists():
                log_file.touch()
                os.chmod(log_file, 0o640)

    def _get_audit_log_path(self) -> Path:
        """Get current audit log file path."""
        date_str = datetime.now().strftime("%Y%m%d")
        return self.log_dir / f"audit_{date_str}.log"

    def _get_authorization_log_path(self) -> Path:
        """Get current authorization log file path."""
        date_str = datetime.now().strftime("%Y%m%d")
        return self.log_dir / f"authorization_{date_str}.log"

    def _get_connection_log_path(self) -> Path:
        """Get current connection log file path."""
        date_str = datetime.now().strftime("%Y%m%d")
        return self.log_dir / f"connection_{date_str}.log"

    def log_audit(self, entry: AuditLogEntry) -> None:
        """
        Log a tool execution audit entry.

        Args:
            entry: Audit log entry
        """
        log_line = entry.to_log_line()
        self._write_log(self._get_audit_log_path(), log_line)

    def log_authorization(self, decision: AuthorizationDecision,
                         tool_name: str, role: str) -> None:
        """
        Log an authorization decision.

        Args:
            decision: Authorization decision
            tool_name: Name of the tool
            role: User role
        """
        log_line = (
            f"{decision.timestamp.isoformat()} | "
            f"Tool: {tool_name} | "
            f"Role: {role} | "
            f"{decision.to_log_line()}"
        )
        self._write_log(self._get_authorization_log_path(), log_line)

    def log_connection(self, event: str, details: Optional[str] = None) -> None:
        """
        Log a connection event.

        Args:
            event: Event type (connected, disconnected, error, etc.)
            details: Additional details
        """
        timestamp = datetime.utcnow().isoformat()
        log_line = f"{timestamp} | Event: {event}"
        if details:
            log_line += f" | Details: {details}"

        self._write_log(self._get_connection_log_path(), log_line)

    def _write_log(self, log_file: Path, log_line: str) -> None:
        """
        Write a log line to file (thread-safe).

        Args:
            log_file: Path to log file
            log_line: Log line to write
        """
        with self._lock:
            try:
                with open(log_file, "a") as f:
                    f.write(log_line + "\n")
            except IOError as e:
                print(f"Error writing to log file {log_file}: {e}")

    def get_recent_audit_logs(self, count: int = 100) -> list:
        """
        Get recent audit log entries.

        Args:
            count: Number of entries to retrieve

        Returns:
            List of log lines
        """
        return self._read_recent_lines(self._get_audit_log_path(), count)

    def get_recent_authorization_logs(self, count: int = 100) -> list:
        """
        Get recent authorization log entries.

        Args:
            count: Number of entries to retrieve

        Returns:
            List of log lines
        """
        return self._read_recent_lines(self._get_authorization_log_path(), count)

    def get_recent_connection_logs(self, count: int = 100) -> list:
        """
        Get recent connection log entries.

        Args:
            count: Number of entries to retrieve

        Returns:
            List of log lines
        """
        return self._read_recent_lines(self._get_connection_log_path(), count)

    def _read_recent_lines(self, log_file: Path, count: int) -> list:
        """
        Read recent lines from a log file.

        Args:
            log_file: Path to log file
            count: Number of lines to read

        Returns:
            List of log lines
        """
        if not log_file.exists():
            return []

        try:
            with open(log_file, "r") as f:
                lines = f.readlines()
                return [line.strip() for line in lines[-count:]]
        except IOError as e:
            print(f"Error reading log file {log_file}: {e}")
            return []

    def clear_old_logs(self, days_to_keep: int = 30) -> None:
        """
        Clear log files older than specified days.

        Args:
            days_to_keep: Number of days to keep logs
        """
        import time

        cutoff_time = time.time() - (days_to_keep * 86400)

        for log_file in self.log_dir.glob("*.log"):
            try:
                if log_file.stat().st_mtime < cutoff_time:
                    log_file.unlink()
                    print(f"Deleted old log file: {log_file}")
            except OSError as e:
                print(f"Error deleting log file {log_file}: {e}")

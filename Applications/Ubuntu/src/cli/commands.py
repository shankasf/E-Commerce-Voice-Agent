"""
CLI command handlers.
"""
import logging

logger = logging.getLogger(__name__)


class CommandHandler:
    """Handle CLI commands."""

    def __init__(self, app_state=None):
        """
        Initialize command handler.

        Args:
            app_state: Application state manager
        """
        self._app_state = app_state

    async def handle_status(self) -> dict:
        """
        Handle status command.

        Returns:
            Status information
        """
        if not self._app_state:
            return {"error": "Application state not available"}

        try:
            status = self._app_state.get_connection_status()
            return {
                "connected": status.is_connected,
                "backend_url": status.backend_url,
                "last_connected": status.last_connected.isoformat() if status.last_connected else None,
                "retry_count": status.retry_count,
            }
        except Exception as e:
            logger.error(f"Error getting status: {e}")
            return {"error": str(e)}

    async def handle_tools(self) -> dict:
        """
        Handle tools command (list available tools).

        Returns:
            Tools information
        """
        if not self._app_state:
            return {"error": "Application state not available"}

        try:
            registry = self._app_state.get_tool_registry()
            tools = registry.get_all_tools()

            return {
                "count": len(tools),
                "tools": tools,
            }
        except Exception as e:
            logger.error(f"Error getting tools: {e}")
            return {"error": str(e)}

    async def handle_logs(self, lines: int = 50) -> dict:
        """
        Handle logs command.

        Args:
            lines: Number of log lines to retrieve

        Returns:
            Log information
        """
        if not self._app_state:
            return {"error": "Application state not available"}

        try:
            # Get recent logs from audit logger
            audit_logger = self._app_state.get_audit_logger()
            if audit_logger:
                logs = await audit_logger.get_recent_logs(lines)
                return {
                    "count": len(logs),
                    "logs": logs,
                }
            else:
                return {"error": "Audit logger not available"}

        except Exception as e:
            logger.error(f"Error getting logs: {e}")
            return {"error": str(e)}

    async def handle_quit(self):
        """Handle quit command."""
        if self._app_state:
            self._app_state.shutdown()

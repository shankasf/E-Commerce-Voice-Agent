"""
CLI application using Rich library.
"""
import asyncio
import logging
from typing import Optional

try:
    from rich.console import Console
    from rich.live import Live
    from rich.panel import Panel
    from rich.layout import Layout
    from rich.table import Table
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

from .display import DisplayFormatter

logger = logging.getLogger(__name__)


class CLIApplication:
    """CLI application for Ubuntu MCP Agent."""

    def __init__(self, app_state=None):
        """
        Initialize CLI application.

        Args:
            app_state: Application state manager
        """
        if not RICH_AVAILABLE:
            raise ImportError("Rich library is not available")

        self._app_state = app_state
        self._console = Console()
        self._formatter = DisplayFormatter(self._console)
        self._is_running = False

    async def run(self):
        """Run the CLI application."""
        self._is_running = True

        # Display welcome message
        self._formatter.show_welcome()

        # Start update loop
        try:
            await self._update_loop()
        except KeyboardInterrupt:
            self._console.print("\n[yellow]Shutting down...[/yellow]")
            self._is_running = False

    async def _update_loop(self):
        """Main update loop for status display."""
        with Live(
            self._formatter.create_status_layout(),
            refresh_per_second=1,
            console=self._console,
        ) as live:
            while self._is_running:
                try:
                    # Update status display
                    if self._app_state:
                        status = self._app_state.get_connection_status()
                        layout = self._formatter.create_status_layout(status)
                        live.update(layout)

                    await asyncio.sleep(1)

                except Exception as e:
                    logger.error(f"Error in update loop: {e}")
                    await asyncio.sleep(1)

    def show_connection_status(self, is_connected: bool, backend_url: str):
        """
        Show connection status message.

        Args:
            is_connected: Whether connected
            backend_url: Backend URL
        """
        if is_connected:
            self._console.print(
                f"[green]Connected to {backend_url}[/green]"
            )
        else:
            self._console.print(
                f"[red]Disconnected from {backend_url}[/red]"
            )

    def show_tool_execution(
        self,
        tool_name: str,
        role: str,
        status: str,
        execution_time_ms: int,
    ):
        """
        Show tool execution result.

        Args:
            tool_name: Tool name
            role: Execution role
            status: Execution status
            execution_time_ms: Execution time in milliseconds
        """
        status_color = {
            "success": "green",
            "failure": "red",
            "unauthorized": "yellow",
            "timeout": "red",
        }.get(status, "white")

        self._console.print(
            f"[{status_color}]Tool '{tool_name}' executed by {role}: "
            f"{status.upper()} ({execution_time_ms}ms)[/{status_color}]"
        )

    def show_error(self, message: str):
        """
        Show error message.

        Args:
            message: Error message
        """
        self._console.print(f"[red]Error: {message}[/red]")

    def show_info(self, message: str):
        """
        Show info message.

        Args:
            message: Info message
        """
        self._console.print(f"[cyan]{message}[/cyan]")

    def stop(self):
        """Stop the CLI application."""
        self._is_running = False

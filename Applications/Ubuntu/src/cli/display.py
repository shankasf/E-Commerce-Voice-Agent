"""
Terminal output formatting using Rich.
"""
from datetime import datetime
from typing import Optional

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.layout import Layout
    from rich.text import Text
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


class DisplayFormatter:
    """Format and display output in terminal."""

    def __init__(self, console=None):
        """
        Initialize display formatter.

        Args:
            console: Rich Console instance
        """
        if not RICH_AVAILABLE:
            raise ImportError("Rich library is not available")

        self._console = console or Console()

    def show_welcome(self):
        """Show welcome banner."""
        banner = """
  _   _ _                 _         __  __  ____ ____     _                    _
 | | | | |__  _   _ _ __ | |_ _   _|  \/  |/ ___|  _ \   / \   __ _  ___ _ __ | |_
 | | | | '_ \| | | | '_ \| __| | | | |\/| | |   | |_) | / _ \ / _` |/ _ \ '_ \| __|
 | |_| | |_) | |_| | | | | |_| |_| | |  | | |___|  __/ / ___ \ (_| |  __/ | | | |_
  \___/|_.__/ \__,_|_| |_|\__|\__,_|_|  |_|\____|_|   /_/   \_\__, |\___|_| |_|\__|
                                                               |___/
        """

        self._console.print(banner, style="bold cyan")
        self._console.print(
            Panel(
                "[yellow]Ubuntu MCP Agent - CLI Mode[/yellow]\n"
                "Connecting to backend...\n\n"
                "Press Ctrl+C to quit",
                title="Welcome",
                border_style="cyan",
            )
        )
        self._console.print()

    def create_status_layout(self, status=None) -> Layout:
        """
        Create status layout.

        Args:
            status: Optional ConnectionStatus object

        Returns:
            Rich Layout
        """
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="main"),
            Layout(name="footer", size=3),
        )

        # Header
        header_text = Text("Ubuntu MCP Agent", style="bold cyan", justify="center")
        layout["header"].update(Panel(header_text, border_style="cyan"))

        # Main content
        if status:
            main_content = self._create_status_table(status)
        else:
            main_content = Panel(
                "[yellow]Initializing...[/yellow]",
                title="Status",
                border_style="yellow",
            )

        layout["main"].update(main_content)

        # Footer
        footer_text = Text(
            f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            style="dim",
            justify="center",
        )
        layout["footer"].update(Panel(footer_text, border_style="cyan"))

        return layout

    def _create_status_table(self, status) -> Panel:
        """
        Create status information table.

        Args:
            status: ConnectionStatus object

        Returns:
            Rich Panel with status table
        """
        table = Table(show_header=False, box=None, padding=(0, 2))
        table.add_column("Key", style="cyan")
        table.add_column("Value")

        # Connection status
        conn_status = "[green]Connected[/green]" if status.is_connected else "[red]Disconnected[/red]"
        table.add_row("Connection Status", conn_status)

        # Backend URL
        table.add_row("Backend URL", status.backend_url)

        # Last connected
        if status.last_connected:
            last_conn = status.last_connected.strftime("%Y-%m-%d %H:%M:%S")
        else:
            last_conn = "Never"
        table.add_row("Last Connected", last_conn)

        # Retry count
        if status.retry_count > 0:
            retry_str = f"[yellow]{status.retry_count}[/yellow]"
        else:
            retry_str = str(status.retry_count)
        table.add_row("Retry Count", retry_str)

        # Last error
        if status.last_error:
            table.add_row("Last Error", f"[red]{status.last_error}[/red]")

        return Panel(
            table,
            title="[bold]Agent Status[/bold]",
            border_style="green" if status.is_connected else "red",
        )

    def show_tool_list(self, tools: list):
        """
        Display list of tools.

        Args:
            tools: List of tool names
        """
        table = Table(title="Available Tools")
        table.add_column("Tool Name", style="cyan")
        table.add_column("Count", justify="right")

        for i, tool in enumerate(tools, 1):
            table.add_row(tool, str(i))

        self._console.print(table)

    def show_logs(self, logs: list):
        """
        Display logs.

        Args:
            logs: List of log entries
        """
        table = Table(title="Recent Logs")
        table.add_column("Timestamp", style="cyan")
        table.add_column("Tool", style="yellow")
        table.add_column("Status", style="green")
        table.add_column("Time (ms)", justify="right")

        for log in logs:
            status_style = "green" if log["status"] == "success" else "red"
            table.add_row(
                log["timestamp"],
                log["tool_name"],
                f"[{status_style}]{log['status']}[/{status_style}]",
                str(log["execution_time_ms"]),
            )

        self._console.print(table)

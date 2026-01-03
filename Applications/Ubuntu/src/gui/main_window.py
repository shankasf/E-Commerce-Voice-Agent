"""
Main GUI window using PyQt6.
"""
import sys
from typing import Optional

try:
    from PyQt6.QtWidgets import (
        QMainWindow,
        QWidget,
        QVBoxLayout,
        QHBoxLayout,
        QPushButton,
        QLabel,
        QTabWidget,
    )
    from PyQt6.QtCore import Qt, QTimer, pyqtSignal
    from PyQt6.QtGui import QIcon
    PYQT6_AVAILABLE = True
except ImportError:
    PYQT6_AVAILABLE = False

if PYQT6_AVAILABLE:
    from .widgets.status_widget import StatusWidget
    from .widgets.log_viewer import LogViewer


class MainWindow(QMainWindow if PYQT6_AVAILABLE else object):
    """Main application window."""

    # Signals
    status_update_requested = pyqtSignal(dict) if PYQT6_AVAILABLE else None

    def __init__(self, app_state=None):
        """
        Initialize main window.

        Args:
            app_state: Application state manager
        """
        if not PYQT6_AVAILABLE:
            raise ImportError("PyQt6 is not available")

        super().__init__()
        self._app_state = app_state
        self._init_ui()

    def _init_ui(self):
        """Initialize user interface."""
        self.setWindowTitle("Ubuntu MCP Agent")
        self.setMinimumSize(800, 600)

        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # Main layout
        layout = QVBoxLayout(central_widget)

        # Header
        header = self._create_header()
        layout.addWidget(header)

        # Tab widget
        tabs = QTabWidget()
        layout.addWidget(tabs)

        # Status tab
        self._status_widget = StatusWidget()
        tabs.addTab(self._status_widget, "Status")

        # Logs tab
        self._log_viewer = LogViewer()
        tabs.addTab(self._log_viewer, "Logs")

        # Footer
        footer = self._create_footer()
        layout.addWidget(footer)

        # Set up timers
        self._setup_timers()

    def _create_header(self) -> QWidget:
        """Create header widget."""
        header = QWidget()
        layout = QHBoxLayout(header)

        # Title
        title = QLabel("Ubuntu MCP Agent")
        title.setStyleSheet("font-size: 18px; font-weight: bold;")
        layout.addWidget(title)

        layout.addStretch()

        # Connection status indicator
        self._conn_status_label = QLabel("Disconnected")
        self._conn_status_label.setStyleSheet(
            "padding: 5px 10px; background-color: #f44336; color: white; border-radius: 3px;"
        )
        layout.addWidget(self._conn_status_label)

        return header

    def _create_footer(self) -> QWidget:
        """Create footer widget."""
        footer = QWidget()
        layout = QHBoxLayout(footer)

        # Status text
        self._status_text = QLabel("Ready")
        layout.addWidget(self._status_text)

        layout.addStretch()

        # Action buttons
        self._hide_btn = QPushButton("Hide to Tray")
        self._hide_btn.clicked.connect(self.hide)
        layout.addWidget(self._hide_btn)

        self._quit_btn = QPushButton("Quit")
        self._quit_btn.clicked.connect(self.close)
        layout.addWidget(self._quit_btn)

        return footer

    def _setup_timers(self):
        """Set up update timers."""
        # Status update timer (every 2 seconds)
        self._status_timer = QTimer()
        self._status_timer.timeout.connect(self._update_status)
        self._status_timer.start(2000)

    def _update_status(self):
        """Update status display."""
        if not self._app_state:
            return

        try:
            status = self._app_state.get_connection_status()

            # Update connection indicator
            if status.is_connected:
                self._conn_status_label.setText("Connected")
                self._conn_status_label.setStyleSheet(
                    "padding: 5px 10px; background-color: #4CAF50; color: white; border-radius: 3px;"
                )
            else:
                self._conn_status_label.setText("Disconnected")
                self._conn_status_label.setStyleSheet(
                    "padding: 5px 10px; background-color: #f44336; color: white; border-radius: 3px;"
                )

            # Update status widget
            self._status_widget.update_status(status)

        except Exception as e:
            print(f"Error updating status: {e}")

    def update_connection_status(self, is_connected: bool, backend_url: str):
        """
        Update connection status display.

        Args:
            is_connected: Whether connected
            backend_url: Backend URL
        """
        if is_connected:
            self._conn_status_label.setText("Connected")
            self._conn_status_label.setStyleSheet(
                "padding: 5px 10px; background-color: #4CAF50; color: white; border-radius: 3px;"
            )
            self._status_text.setText(f"Connected to {backend_url}")
        else:
            self._conn_status_label.setText("Disconnected")
            self._conn_status_label.setStyleSheet(
                "padding: 5px 10px; background-color: #f44336; color: white; border-radius: 3px;"
            )
            self._status_text.setText("Disconnected")

    def add_log_message(self, message: str, level: str = "INFO"):
        """
        Add log message to log viewer.

        Args:
            message: Log message
            level: Log level
        """
        self._log_viewer.add_log(message, level)

    def closeEvent(self, event):
        """Handle window close event."""
        # Ask for confirmation
        from PyQt6.QtWidgets import QMessageBox

        reply = QMessageBox.question(
            self,
            "Quit",
            "Are you sure you want to quit Ubuntu MCP Agent?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )

        if reply == QMessageBox.StandardButton.Yes:
            event.accept()
            if self._app_state:
                self._app_state.shutdown()
        else:
            event.ignore()

    def show_message(self, title: str, message: str, icon=None):
        """
        Show message dialog.

        Args:
            title: Dialog title
            message: Dialog message
            icon: Optional icon type
        """
        from PyQt6.QtWidgets import QMessageBox

        msg = QMessageBox()
        msg.setWindowTitle(title)
        msg.setText(message)

        if icon:
            msg.setIcon(icon)

        msg.exec()

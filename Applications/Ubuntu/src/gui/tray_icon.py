"""
System tray icon using PyQt6.
"""
try:
    from PyQt6.QtWidgets import QSystemTrayIcon, QMenu
    from PyQt6.QtGui import QIcon, QAction
    from PyQt6.QtCore import pyqtSignal, QObject
    PYQT6_AVAILABLE = True
except ImportError:
    PYQT6_AVAILABLE = False


class TrayIcon(QSystemTrayIcon if PYQT6_AVAILABLE else QObject if PYQT6_AVAILABLE else object):
    """System tray icon for the application."""

    # Signals
    show_window_requested = pyqtSignal() if PYQT6_AVAILABLE else None
    quit_requested = pyqtSignal() if PYQT6_AVAILABLE else None

    def __init__(self, parent=None):
        """
        Initialize tray icon.

        Args:
            parent: Parent widget
        """
        if not PYQT6_AVAILABLE:
            raise ImportError("PyQt6 is not available")

        super().__init__(parent)

        # Set icon (use a default icon or load from file)
        # For now, using a simple icon from theme
        try:
            icon = QIcon.fromTheme("application-x-executable")
            if icon.isNull():
                # Fallback to a basic icon
                from PyQt6.QtGui import QPixmap, QPainter, QColor
                pixmap = QPixmap(32, 32)
                pixmap.fill(QColor("transparent"))
                painter = QPainter(pixmap)
                painter.setBrush(QColor("#4CAF50"))
                painter.drawEllipse(4, 4, 24, 24)
                painter.end()
                icon = QIcon(pixmap)
            self.setIcon(icon)
        except Exception:
            pass

        # Create context menu
        self._create_menu()

        # Connect activated signal
        self.activated.connect(self._on_activated)

        # Set tooltip
        self.setToolTip("Ubuntu MCP Agent")

    def _create_menu(self):
        """Create context menu."""
        menu = QMenu()

        # Show action
        show_action = QAction("Show Window", self)
        show_action.triggered.connect(self.show_window_requested.emit)
        menu.addAction(show_action)

        menu.addSeparator()

        # Status action (non-clickable)
        self._status_action = QAction("Status: Disconnected", self)
        self._status_action.setEnabled(False)
        menu.addAction(self._status_action)

        menu.addSeparator()

        # Quit action
        quit_action = QAction("Quit", self)
        quit_action.triggered.connect(self.quit_requested.emit)
        menu.addAction(quit_action)

        self.setContextMenu(menu)

    def _on_activated(self, reason):
        """
        Handle tray icon activation.

        Args:
            reason: Activation reason
        """
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            self.show_window_requested.emit()

    def update_status(self, is_connected: bool):
        """
        Update connection status in menu.

        Args:
            is_connected: Whether connected to backend
        """
        if is_connected:
            self._status_action.setText("Status: Connected")
            self.setToolTip("Ubuntu MCP Agent - Connected")
        else:
            self._status_action.setText("Status: Disconnected")
            self.setToolTip("Ubuntu MCP Agent - Disconnected")

    def show_notification(self, title: str, message: str):
        """
        Show system tray notification.

        Args:
            title: Notification title
            message: Notification message
        """
        self.showMessage(
            title,
            message,
            QSystemTrayIcon.MessageIcon.Information,
            5000,  # 5 seconds
        )

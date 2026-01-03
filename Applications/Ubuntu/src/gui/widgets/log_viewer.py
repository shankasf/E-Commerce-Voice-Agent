"""
Log viewer widget.
"""
from datetime import datetime

try:
    from PyQt6.QtWidgets import (
        QWidget,
        QVBoxLayout,
        QTextEdit,
        QHBoxLayout,
        QPushButton,
        QComboBox,
    )
    from PyQt6.QtGui import QTextCursor, QColor
    PYQT6_AVAILABLE = True
except ImportError:
    PYQT6_AVAILABLE = False


class LogViewer(QWidget if PYQT6_AVAILABLE else object):
    """Widget for viewing application logs."""

    def __init__(self, parent=None):
        """
        Initialize log viewer.

        Args:
            parent: Parent widget
        """
        if not PYQT6_AVAILABLE:
            raise ImportError("PyQt6 is not available")

        super().__init__(parent)
        self._max_lines = 1000
        self._init_ui()

    def _init_ui(self):
        """Initialize user interface."""
        layout = QVBoxLayout(self)

        # Controls
        controls = QHBoxLayout()

        # Level filter
        self._level_filter = QComboBox()
        self._level_filter.addItems(["ALL", "DEBUG", "INFO", "WARNING", "ERROR"])
        self._level_filter.setCurrentText("INFO")
        controls.addWidget(self._level_filter)

        controls.addStretch()

        # Clear button
        clear_btn = QPushButton("Clear Logs")
        clear_btn.clicked.connect(self.clear_logs)
        controls.addWidget(clear_btn)

        layout.addLayout(controls)

        # Log text area
        self._log_text = QTextEdit()
        self._log_text.setReadOnly(True)
        self._log_text.setLineWrapMode(QTextEdit.LineWrapMode.NoWrap)
        self._log_text.setStyleSheet(
            "font-family: monospace; font-size: 10pt; background-color: #1e1e1e; color: #d4d4d4;"
        )
        layout.addWidget(self._log_text)

    def add_log(self, message: str, level: str = "INFO"):
        """
        Add log message.

        Args:
            message: Log message
            level: Log level
        """
        # Check filter
        current_filter = self._level_filter.currentText()
        if current_filter != "ALL" and level != current_filter:
            return

        # Format message
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        formatted = f"[{timestamp}] [{level:8s}] {message}"

        # Get color for level
        colors = {
            "DEBUG": "#808080",
            "INFO": "#4CAF50",
            "WARNING": "#FFC107",
            "ERROR": "#f44336",
        }
        color = colors.get(level, "#d4d4d4")

        # Add to text area
        cursor = self._log_text.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)

        # Insert with color
        cursor.insertHtml(f'<span style="color: {color};">{formatted}</span><br>')

        # Scroll to bottom
        self._log_text.setTextCursor(cursor)
        self._log_text.ensureCursorVisible()

        # Trim if too many lines
        self._trim_logs()

    def clear_logs(self):
        """Clear all logs."""
        self._log_text.clear()

    def _trim_logs(self):
        """Trim logs if exceeding max lines."""
        document = self._log_text.document()
        if document.blockCount() > self._max_lines:
            cursor = QTextCursor(document)
            cursor.movePosition(QTextCursor.MoveOperation.Start)
            cursor.movePosition(
                QTextCursor.MoveOperation.Down,
                QTextCursor.MoveMode.KeepAnchor,
                document.blockCount() - self._max_lines,
            )
            cursor.removeSelectedText()

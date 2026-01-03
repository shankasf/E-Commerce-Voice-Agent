"""
Login/Registration window using PyQt6.
"""
try:
    from PyQt6.QtWidgets import (
        QDialog,
        QVBoxLayout,
        QHBoxLayout,
        QFormLayout,
        QLineEdit,
        QPushButton,
        QLabel,
    )
    from PyQt6.QtCore import Qt, pyqtSignal
    PYQT6_AVAILABLE = True
except ImportError:
    PYQT6_AVAILABLE = False


class LoginWindow(QDialog if PYQT6_AVAILABLE else object):
    """Login/Registration dialog."""

    # Signals
    registration_requested = pyqtSignal(str, str) if PYQT6_AVAILABLE else None

    def __init__(self, parent=None):
        """
        Initialize login window.

        Args:
            parent: Parent widget
        """
        if not PYQT6_AVAILABLE:
            raise ImportError("PyQt6 is not available")

        super().__init__(parent)
        self._init_ui()

    def _init_ui(self):
        """Initialize user interface."""
        self.setWindowTitle("Ubuntu MCP Agent - Device Registration")
        self.setMinimumWidth(400)

        layout = QVBoxLayout(self)

        # Title
        title = QLabel("Device Registration")
        title.setStyleSheet("font-size: 16px; font-weight: bold; margin-bottom: 10px;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        # Description
        desc = QLabel(
            "Register this device with the MCP backend.\n"
            "You'll receive a token via email."
        )
        desc.setWordWrap(True)
        desc.setAlignment(Qt.AlignmentFlag.AlignCenter)
        desc.setStyleSheet("color: #666; margin-bottom: 20px;")
        layout.addWidget(desc)

        # Form
        form = QFormLayout()
        form.setSpacing(10)

        self._email_input = QLineEdit()
        self._email_input.setPlaceholderText("your.email@company.com")
        form.addRow("Email:", self._email_input)

        self._employee_code_input = QLineEdit()
        self._employee_code_input.setPlaceholderText("Your employee code")
        form.addRow("Employee Code:", self._employee_code_input)

        layout.addLayout(form)

        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()

        self._cancel_btn = QPushButton("Cancel")
        self._cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(self._cancel_btn)

        self._register_btn = QPushButton("Register")
        self._register_btn.clicked.connect(self._on_register)
        self._register_btn.setDefault(True)
        self._register_btn.setStyleSheet(
            "background-color: #4CAF50; color: white; padding: 8px 16px; font-weight: bold;"
        )
        button_layout.addWidget(self._register_btn)

        layout.addLayout(button_layout)

        # Status label
        self._status_label = QLabel("")
        self._status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._status_label.setWordWrap(True)
        layout.addWidget(self._status_label)

    def _on_register(self):
        """Handle registration button click."""
        email = self._email_input.text().strip()
        employee_code = self._employee_code_input.text().strip()

        # Validate inputs
        if not email:
            self._show_error("Please enter your email address")
            return

        if not employee_code:
            self._show_error("Please enter your employee code")
            return

        if "@" not in email:
            self._show_error("Please enter a valid email address")
            return

        # Disable button during registration
        self._register_btn.setEnabled(False)
        self._status_label.setText("Registering...")
        self._status_label.setStyleSheet("color: #2196F3;")

        # Emit signal
        self.registration_requested.emit(email, employee_code)

    def show_success(self, message: str):
        """
        Show success message.

        Args:
            message: Success message
        """
        self._status_label.setText(message)
        self._status_label.setStyleSheet("color: #4CAF50;")
        self._register_btn.setEnabled(True)

        # Close dialog after delay
        from PyQt6.QtCore import QTimer
        QTimer.singleShot(2000, self.accept)

    def show_error(self, message: str):
        """
        Show error message.

        Args:
            message: Error message
        """
        self._show_error(message)
        self._register_btn.setEnabled(True)

    def _show_error(self, message: str):
        """Internal error display."""
        self._status_label.setText(f"Error: {message}")
        self._status_label.setStyleSheet("color: #f44336;")

    def get_credentials(self) -> tuple:
        """
        Get entered credentials.

        Returns:
            Tuple of (email, employee_code)
        """
        return (
            self._email_input.text().strip(),
            self._employee_code_input.text().strip(),
        )

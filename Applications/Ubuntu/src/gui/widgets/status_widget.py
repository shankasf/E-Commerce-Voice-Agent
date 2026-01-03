"""
Status display widget.
"""
try:
    from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QGroupBox, QGridLayout
    from PyQt6.QtCore import Qt
    PYQT6_AVAILABLE = True
except ImportError:
    PYQT6_AVAILABLE = False


class StatusWidget(QWidget if PYQT6_AVAILABLE else object):
    """Widget for displaying agent status."""

    def __init__(self, parent=None):
        """
        Initialize status widget.

        Args:
            parent: Parent widget
        """
        if not PYQT6_AVAILABLE:
            raise ImportError("PyQt6 is not available")

        super().__init__(parent)
        self._init_ui()

    def _init_ui(self):
        """Initialize user interface."""
        layout = QVBoxLayout(self)

        # Connection group
        conn_group = QGroupBox("Connection")
        conn_layout = QGridLayout()

        conn_layout.addWidget(QLabel("Backend URL:"), 0, 0)
        self._backend_url_label = QLabel("Not connected")
        conn_layout.addWidget(self._backend_url_label, 0, 1)

        conn_layout.addWidget(QLabel("Status:"), 1, 0)
        self._conn_status_label = QLabel("Disconnected")
        conn_layout.addWidget(self._conn_status_label, 1, 1)

        conn_layout.addWidget(QLabel("Last Connected:"), 2, 0)
        self._last_connected_label = QLabel("Never")
        conn_layout.addWidget(self._last_connected_label, 2, 1)

        conn_layout.addWidget(QLabel("Retry Count:"), 3, 0)
        self._retry_count_label = QLabel("0")
        conn_layout.addWidget(self._retry_count_label, 3, 1)

        conn_group.setLayout(conn_layout)
        layout.addWidget(conn_group)

        # Device group
        device_group = QGroupBox("Device Information")
        device_layout = QGridLayout()

        device_layout.addWidget(QLabel("Device ID:"), 0, 0)
        self._device_id_label = QLabel("Not registered")
        device_layout.addWidget(self._device_id_label, 0, 1)

        device_layout.addWidget(QLabel("Client ID:"), 1, 0)
        self._client_id_label = QLabel("Not registered")
        device_layout.addWidget(self._client_id_label, 1, 1)

        device_group.setLayout(device_layout)
        layout.addWidget(device_group)

        # Statistics group
        stats_group = QGroupBox("Statistics")
        stats_layout = QGridLayout()

        stats_layout.addWidget(QLabel("Tools Executed:"), 0, 0)
        self._tools_executed_label = QLabel("0")
        stats_layout.addWidget(self._tools_executed_label, 0, 1)

        stats_layout.addWidget(QLabel("Success Rate:"), 1, 0)
        self._success_rate_label = QLabel("N/A")
        stats_layout.addWidget(self._success_rate_label, 1, 1)

        stats_group.setLayout(stats_layout)
        layout.addWidget(stats_group)

        layout.addStretch()

    def update_status(self, status):
        """
        Update status display.

        Args:
            status: ConnectionStatus object
        """
        self._backend_url_label.setText(status.backend_url)

        if status.is_connected:
            self._conn_status_label.setText("Connected")
            self._conn_status_label.setStyleSheet("color: #4CAF50; font-weight: bold;")
        else:
            self._conn_status_label.setText("Disconnected")
            self._conn_status_label.setStyleSheet("color: #f44336; font-weight: bold;")

        if status.last_connected:
            self._last_connected_label.setText(
                status.last_connected.strftime("%Y-%m-%d %H:%M:%S")
            )
        else:
            self._last_connected_label.setText("Never")

        self._retry_count_label.setText(str(status.retry_count))

    def update_device_info(self, device_id: str, client_id: str):
        """
        Update device information.

        Args:
            device_id: Device ID
            client_id: Client ID
        """
        self._device_id_label.setText(device_id)
        self._client_id_label.setText(client_id)

    def update_statistics(self, executed: int, success_rate: float):
        """
        Update statistics.

        Args:
            executed: Number of tools executed
            success_rate: Success rate (0-1)
        """
        self._tools_executed_label.setText(str(executed))

        if executed > 0:
            self._success_rate_label.setText(f"{success_rate * 100:.1f}%")
        else:
            self._success_rate_label.setText("N/A")

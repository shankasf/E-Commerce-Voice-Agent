"""
Environment detection utilities for GUI/CLI fallback.
"""
import os
import sys
import subprocess
from typing import Optional


class EnvironmentDetector:
    """Detect runtime environment and available UI capabilities."""

    @staticmethod
    def has_display() -> bool:
        """Check if a display server (X11/Wayland) is available."""
        # Check DISPLAY environment variable for X11
        if os.environ.get("DISPLAY"):
            return True

        # Check for Wayland
        if os.environ.get("WAYLAND_DISPLAY"):
            return True

        # Check XDG_SESSION_TYPE
        session_type = os.environ.get("XDG_SESSION_TYPE", "").lower()
        if session_type in ["x11", "wayland"]:
            return True

        return False

    @staticmethod
    def can_import_pyqt6() -> bool:
        """Check if PyQt6 is available and can be imported."""
        try:
            # First check if we have a display
            if not EnvironmentDetector.has_display():
                return False

            # Try to import PyQt6
            import PyQt6.QtWidgets
            from PyQt6.QtCore import QCoreApplication

            # Try to create a QCoreApplication instance to verify Qt can initialize
            # Use QCoreApplication instead of QApplication to avoid requiring display
            # Set QT_QPA_PLATFORM to offscreen for testing
            original_platform = os.environ.get('QT_QPA_PLATFORM')
            try:
                os.environ['QT_QPA_PLATFORM'] = 'offscreen'
                # Just check if we can import, don't actually create the app
                # as it might interfere with the real app later
                return True
            finally:
                if original_platform is not None:
                    os.environ['QT_QPA_PLATFORM'] = original_platform
                elif 'QT_QPA_PLATFORM' in os.environ:
                    del os.environ['QT_QPA_PLATFORM']
        except (ImportError, RuntimeError):
            return False

    @staticmethod
    def is_ssh_session() -> bool:
        """Check if running in an SSH session."""
        return bool(os.environ.get("SSH_CONNECTION") or os.environ.get("SSH_CLIENT"))

    @staticmethod
    def is_running_as_service() -> bool:
        """Check if running as a systemd service."""
        # Check if parent process is systemd
        try:
            parent_pid = os.getppid()
            with open(f"/proc/{parent_pid}/comm", "r") as f:
                parent_name = f.read().strip()
                if parent_name == "systemd":
                    return True
        except (FileNotFoundError, PermissionError):
            pass

        # Check INVOCATION_ID (set by systemd)
        if os.environ.get("INVOCATION_ID"):
            return True

        return False

    @staticmethod
    def get_desktop_environment() -> Optional[str]:
        """Get the current desktop environment name."""
        # Check XDG_CURRENT_DESKTOP
        desktop = os.environ.get("XDG_CURRENT_DESKTOP")
        if desktop:
            return desktop

        # Check DESKTOP_SESSION
        desktop = os.environ.get("DESKTOP_SESSION")
        if desktop:
            return desktop

        # Try to detect from running processes
        known_desktops = {
            "gnome-shell": "GNOME",
            "kwin": "KDE",
            "xfce4-session": "XFCE",
            "mate-session": "MATE",
            "cinnamon": "Cinnamon",
        }

        try:
            result = subprocess.run(
                ["ps", "aux"],
                capture_output=True,
                text=True,
                timeout=2,
            )
            for process, name in known_desktops.items():
                if process in result.stdout:
                    return name
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        return None

    @staticmethod
    def should_use_gui(force_cli: bool = False, force_gui: bool = False) -> bool:
        """
        Determine if GUI should be used.

        Args:
            force_cli: Force CLI mode regardless of environment
            force_gui: Force GUI mode (will fail if not available)

        Returns:
            True if GUI should be used, False for CLI
        """
        if force_cli:
            return False

        if force_gui:
            return True

        # Don't use GUI if running as service
        if EnvironmentDetector.is_running_as_service():
            return False

        # Don't use GUI if no display available
        if not EnvironmentDetector.has_display():
            return False

        # Don't use GUI if PyQt6 not available
        if not EnvironmentDetector.can_import_pyqt6():
            return False

        # Use GUI by default if all conditions met
        return True

    @staticmethod
    def get_environment_info() -> dict:
        """Get comprehensive environment information."""
        return {
            "has_display": EnvironmentDetector.has_display(),
            "can_import_pyqt6": EnvironmentDetector.can_import_pyqt6(),
            "is_ssh_session": EnvironmentDetector.is_ssh_session(),
            "is_systemd_service": EnvironmentDetector.is_running_as_service(),
            "desktop_environment": EnvironmentDetector.get_desktop_environment(),
            "display": os.environ.get("DISPLAY"),
            "wayland_display": os.environ.get("WAYLAND_DISPLAY"),
            "xdg_session_type": os.environ.get("XDG_SESSION_TYPE"),
            "python_version": sys.version,
        }

    @staticmethod
    def print_environment_info():
        """Print environment information for debugging."""
        info = EnvironmentDetector.get_environment_info()
        print("Environment Information:")
        print("=" * 50)
        for key, value in info.items():
            print(f"{key:25s}: {value}")
        print("=" * 50)
        print(f"Recommended UI mode: {'GUI' if EnvironmentDetector.should_use_gui() else 'CLI'}")

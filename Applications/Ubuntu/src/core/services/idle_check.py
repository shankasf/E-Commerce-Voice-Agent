"""
User idle time checking service.
"""
import logging
import subprocess
import os
from typing import Optional

logger = logging.getLogger(__name__)


class IdleCheckService:
    """Check user idle time using xprintidle or D-Bus."""

    def __init__(self, idle_threshold_seconds: int = 300):
        """
        Initialize idle check service.

        Args:
            idle_threshold_seconds: Idle threshold in seconds (default: 5 minutes)
        """
        self._idle_threshold_seconds = idle_threshold_seconds
        self._method = self._detect_method()

    def _detect_method(self) -> str:
        """Detect available idle detection method."""
        # Check for xprintidle
        try:
            result = subprocess.run(
                ["which", "xprintidle"],
                capture_output=True,
                timeout=2,
            )
            if result.returncode == 0:
                return "xprintidle"
        except Exception:
            pass

        # Check if running under X11
        if os.environ.get("DISPLAY"):
            # Try xdotool as alternative
            try:
                result = subprocess.run(
                    ["which", "xdotool"],
                    capture_output=True,
                    timeout=2,
                )
                if result.returncode == 0:
                    return "xdotool"
            except Exception:
                pass

        # Check for GNOME session (can use D-Bus)
        if os.environ.get("GNOME_DESKTOP_SESSION_ID") or \
           os.environ.get("XDG_CURRENT_DESKTOP") == "GNOME":
            return "dbus"

        # No method available
        return "none"

    def is_user_idle(self) -> bool:
        """
        Check if user is idle.

        Returns:
            True if user has been idle longer than threshold
        """
        idle_time = self.get_idle_time_seconds()

        if idle_time is None:
            # If we can't determine idle time, assume not idle
            logger.warning("Could not determine idle time, assuming user is active")
            return False

        return idle_time >= self._idle_threshold_seconds

    def get_idle_time_seconds(self) -> Optional[int]:
        """
        Get user idle time in seconds.

        Returns:
            Idle time in seconds, or None if unavailable
        """
        if self._method == "xprintidle":
            return self._get_idle_xprintidle()
        elif self._method == "xdotool":
            return self._get_idle_xdotool()
        elif self._method == "dbus":
            return self._get_idle_dbus()
        else:
            return None

    def _get_idle_xprintidle(self) -> Optional[int]:
        """Get idle time using xprintidle (milliseconds to seconds)."""
        try:
            result = subprocess.run(
                ["xprintidle"],
                capture_output=True,
                timeout=2,
                text=True,
            )

            if result.returncode == 0:
                idle_ms = int(result.stdout.strip())
                return idle_ms // 1000

        except Exception as e:
            logger.warning(f"Failed to get idle time from xprintidle: {e}")

        return None

    def _get_idle_xdotool(self) -> Optional[int]:
        """Get idle time using xdotool."""
        try:
            result = subprocess.run(
                ["xdotool", "get_idle_time"],
                capture_output=True,
                timeout=2,
                text=True,
            )

            if result.returncode == 0:
                idle_ms = int(result.stdout.strip())
                return idle_ms // 1000

        except Exception as e:
            logger.warning(f"Failed to get idle time from xdotool: {e}")

        return None

    def _get_idle_dbus(self) -> Optional[int]:
        """Get idle time using D-Bus (GNOME)."""
        try:
            # Query GNOME screensaver idle time
            result = subprocess.run(
                [
                    "dbus-send",
                    "--print-reply",
                    "--dest=org.gnome.Mutter.IdleMonitor",
                    "/org/gnome/Mutter/IdleMonitor/Core",
                    "org.gnome.Mutter.IdleMonitor.GetIdletime",
                ],
                capture_output=True,
                timeout=2,
                text=True,
            )

            if result.returncode == 0:
                # Parse output: "   uint64 12345"
                for line in result.stdout.split('\n'):
                    if 'uint64' in line or 'int64' in line:
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            idle_ms = int(parts[-1])
                            return idle_ms // 1000

        except Exception as e:
            logger.warning(f"Failed to get idle time from D-Bus: {e}")

        return None

    def set_threshold(self, seconds: int):
        """
        Set idle threshold.

        Args:
            seconds: Idle threshold in seconds
        """
        self._idle_threshold_seconds = seconds

    def get_threshold(self) -> int:
        """Get current idle threshold in seconds."""
        return self._idle_threshold_seconds

    def get_method(self) -> str:
        """Get detection method being used."""
        return self._method

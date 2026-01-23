"""
Connection Cleanup Utilities.

Provides background tasks for cleaning up stale connections
and preventing memory leaks over long uptimes.
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .connection_manager import DeviceConnectionManager

logger = logging.getLogger(__name__)


@dataclass
class CleanupConfig:
    """Configuration for cleanup tasks."""
    # Stale connection sweep
    sweep_interval: int = 60  # seconds between sweeps
    stale_threshold: int = 120  # seconds since last heartbeat to consider stale

    # Rate limiter cleanup
    rate_limit_cleanup_interval: int = 300  # 5 minutes


@dataclass
class CleanupStats:
    """Statistics from cleanup operations."""
    stale_connections_removed: int = 0
    rate_limit_entries_cleared: int = 0
    last_sweep_time: Optional[datetime] = None
    total_sweeps: int = 0


class ConnectionCleaner:
    """
    Background task for cleaning up stale connections.

    Handles edge cases where connections become stale but didn't
    disconnect cleanly (network issues, client crashes, etc.).
    """

    def __init__(
        self,
        manager: "DeviceConnectionManager",
        config: CleanupConfig = None,
    ):
        self._manager = manager
        self._config = config or CleanupConfig()
        self._stats = CleanupStats()
        self._task: Optional[asyncio.Task] = None
        self._running = False

    @property
    def stats(self) -> CleanupStats:
        """Get cleanup statistics."""
        return self._stats

    @property
    def is_running(self) -> bool:
        """Check if cleaner is running."""
        return self._running

    def start(self) -> None:
        """Start the background cleanup task."""
        if self._running:
            logger.warning("Connection cleaner already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._sweep_loop())
        logger.info("Connection cleaner started")

    def stop(self) -> None:
        """Stop the background cleanup task."""
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
        logger.info("Connection cleaner stopped")

    async def _sweep_loop(self) -> None:
        """Main loop for periodic cleanup."""
        while self._running:
            try:
                await asyncio.sleep(self._config.sweep_interval)

                if not self._running:
                    break

                removed = await self._sweep_stale_connections()
                self._stats.stale_connections_removed += removed
                self._stats.last_sweep_time = datetime.utcnow()
                self._stats.total_sweeps += 1

                if removed > 0:
                    logger.info(f"[Cleanup] Removed {removed} stale connections")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[Cleanup] Sweep error: {e}")

    async def _sweep_stale_connections(self) -> int:
        """
        Find and remove stale connections.

        A connection is stale if:
        1. Last heartbeat exceeds stale_threshold
        2. Connection is marked as connected but WebSocket is dead

        Returns:
            Number of connections removed
        """
        removed = 0
        now = datetime.utcnow()
        threshold = timedelta(seconds=self._config.stale_threshold)

        # Get all connection IDs (snapshot to avoid iteration issues)
        connection_ids = list(self._manager.get_all_connection_ids())

        for conn_id in connection_ids:
            session = self._manager.get(conn_id)
            if not session:
                continue

            # Check if stale
            is_stale = False
            reason = ""

            # Check heartbeat timeout
            if hasattr(session, 'last_heartbeat'):
                elapsed = now - session.last_heartbeat
                if elapsed > threshold:
                    is_stale = True
                    reason = f"heartbeat timeout ({elapsed.total_seconds():.0f}s)"

            # Check if marked connected but actually dead
            if hasattr(session, 'is_connected') and hasattr(session, 'websocket'):
                if session.is_connected:
                    try:
                        # Try to detect dead socket
                        state = getattr(session.websocket, 'client_state', None)
                        if state and hasattr(state, 'name') and state.name == 'DISCONNECTED':
                            is_stale = True
                            reason = "websocket disconnected"
                    except Exception:
                        pass

            if is_stale:
                logger.warning(f"[Cleanup] Removing stale connection {conn_id}: {reason}")

                # Trigger cleanup on the session
                try:
                    if hasattr(session, '_cleanup'):
                        await session._cleanup()
                    else:
                        await self._manager.unregister(conn_id)
                    removed += 1
                except Exception as e:
                    logger.error(f"[Cleanup] Failed to clean {conn_id}: {e}")

        return removed

    async def force_sweep(self) -> int:
        """Manually trigger a sweep. Returns count removed."""
        return await self._sweep_stale_connections()


class RateLimitCleaner:
    """
    Background task for cleaning up expired rate limit entries.

    Prevents memory growth over long uptimes from accumulated
    IP addresses in the rate limiter.
    """

    def __init__(self, config: CleanupConfig = None):
        self._config = config or CleanupConfig()
        self._stats = CleanupStats()
        self._task: Optional[asyncio.Task] = None
        self._running = False

    def start(self) -> None:
        """Start the background cleanup task."""
        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._cleanup_loop())
        logger.info("Rate limit cleaner started")

    def stop(self) -> None:
        """Stop the background cleanup task."""
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None

    async def _cleanup_loop(self) -> None:
        """Main loop for periodic cleanup."""
        from .rate_limiter import get_auth_rate_limiter

        while self._running:
            try:
                await asyncio.sleep(self._config.rate_limit_cleanup_interval)

                if not self._running:
                    break

                limiter = get_auth_rate_limiter()
                removed = await limiter.cleanup_expired()
                self._stats.rate_limit_entries_cleared += removed

                if removed > 0:
                    logger.debug(f"[Cleanup] Cleared {removed} expired rate limit entries")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[Cleanup] Rate limit cleanup error: {e}")


# ============================================
# Combined Cleanup Manager
# ============================================

class CleanupManager:
    """
    Manages all cleanup background tasks.

    Usage:
        cleanup = CleanupManager(connection_manager)
        cleanup.start_all()
        # ... on shutdown ...
        cleanup.stop_all()
    """

    def __init__(
        self,
        connection_manager: "DeviceConnectionManager",
        config: CleanupConfig = None,
    ):
        self._config = config or CleanupConfig()
        self._connection_cleaner = ConnectionCleaner(connection_manager, self._config)
        self._rate_limit_cleaner = RateLimitCleaner(self._config)

    def start_all(self) -> None:
        """Start all cleanup tasks."""
        self._connection_cleaner.start()
        self._rate_limit_cleaner.start()
        logger.info("All cleanup tasks started")

    def stop_all(self) -> None:
        """Stop all cleanup tasks."""
        self._connection_cleaner.stop()
        self._rate_limit_cleaner.stop()
        logger.info("All cleanup tasks stopped")

    @property
    def connection_stats(self) -> CleanupStats:
        """Get connection cleanup stats."""
        return self._connection_cleaner.stats

    async def force_connection_sweep(self) -> int:
        """Manually trigger connection sweep."""
        return await self._connection_cleaner.force_sweep()


# Singleton instance
_cleanup_manager: Optional[CleanupManager] = None


def get_cleanup_manager(
    connection_manager: "DeviceConnectionManager" = None,
) -> Optional[CleanupManager]:
    """
    Get or create the cleanup manager singleton.

    Args:
        connection_manager: Required on first call

    Returns:
        CleanupManager instance or None if not initialized
    """
    global _cleanup_manager

    if _cleanup_manager is None and connection_manager is not None:
        _cleanup_manager = CleanupManager(connection_manager)

    return _cleanup_manager

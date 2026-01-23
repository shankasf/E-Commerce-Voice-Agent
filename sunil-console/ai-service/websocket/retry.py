"""
Retry Utilities for WebSocket Operations.

Provides exponential backoff retry logic for commands and operations
that may fail transiently.
"""

import asyncio
import logging
import random
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, TypeVar, Awaitable

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    initial_delay: float = 1.0  # seconds
    max_delay: float = 30.0  # seconds
    multiplier: float = 2.0  # exponential factor
    jitter: bool = True  # add randomness to prevent thundering herd


@dataclass
class RetryResult:
    """Result of a retry operation."""
    success: bool
    value: Any = None
    attempts: int = 0
    total_time: float = 0.0
    last_error: Optional[Exception] = None


def calculate_delay(
    attempt: int,
    config: RetryConfig,
) -> float:
    """
    Calculate delay for next retry attempt.

    Uses exponential backoff with optional jitter.

    Args:
        attempt: Current attempt number (0-indexed)
        config: Retry configuration

    Returns:
        Delay in seconds
    """
    delay = config.initial_delay * (config.multiplier ** attempt)
    delay = min(delay, config.max_delay)

    if config.jitter:
        # Add ±25% jitter
        jitter_range = delay * 0.25
        delay += random.uniform(-jitter_range, jitter_range)

    return max(0.1, delay)  # Minimum 100ms


async def retry_async(
    func: Callable[[], Awaitable[T]],
    config: RetryConfig = None,
    should_retry: Callable[[Exception], bool] = None,
    on_retry: Callable[[int, Exception, float], None] = None,
) -> RetryResult:
    """
    Execute an async function with exponential backoff retry.

    Args:
        func: Async function to execute (no arguments)
        config: Retry configuration
        should_retry: Optional function to determine if error is retryable
        on_retry: Optional callback on each retry (attempt, error, delay)

    Returns:
        RetryResult with success status and value or error

    Example:
        result = await retry_async(
            lambda: fetch_data(),
            config=RetryConfig(max_attempts=3),
        )
        if result.success:
            print(result.value)
    """
    config = config or RetryConfig()
    should_retry = should_retry or (lambda _: True)

    import time
    start_time = time.time()
    last_error = None

    for attempt in range(config.max_attempts):
        try:
            value = await func()
            return RetryResult(
                success=True,
                value=value,
                attempts=attempt + 1,
                total_time=time.time() - start_time,
            )
        except Exception as e:
            last_error = e

            # Check if we should retry
            if attempt >= config.max_attempts - 1:
                break
            if not should_retry(e):
                break

            # Calculate delay and wait
            delay = calculate_delay(attempt, config)

            if on_retry:
                on_retry(attempt + 1, e, delay)

            logger.debug(
                f"Retry attempt {attempt + 1}/{config.max_attempts} "
                f"after {delay:.2f}s: {e}"
            )

            await asyncio.sleep(delay)

    return RetryResult(
        success=False,
        attempts=config.max_attempts,
        total_time=time.time() - start_time,
        last_error=last_error,
    )


# ============================================
# Command Queue with Priority
# ============================================

@dataclass(order=True)
class PrioritizedCommand:
    """Command with priority for queue ordering."""
    priority: int  # Lower = higher priority
    command_id: str = field(compare=False)
    command: str = field(compare=False)
    description: str = field(compare=False)
    requires_consent: bool = field(compare=False, default=True)


class CommandPriority:
    """Standard priority levels."""
    URGENT = 0      # System critical (e.g., security)
    HIGH = 10       # User-requested actions
    NORMAL = 50     # Standard diagnostic commands
    LOW = 100       # Background/optional commands


class CommandQueue:
    """
    Priority queue for commands.

    Ensures urgent commands are processed first.
    Useful when multiple commands are queued rapidly.
    """

    def __init__(self, max_size: int = 100):
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue(maxsize=max_size)
        self._pending: set = set()

    async def put(
        self,
        command_id: str,
        command: str,
        description: str,
        priority: int = CommandPriority.NORMAL,
        requires_consent: bool = True,
    ) -> bool:
        """
        Add command to queue.

        Args:
            command_id: Unique command ID
            command: PowerShell command
            description: Human-readable description
            priority: Command priority (lower = higher priority)
            requires_consent: Whether user approval needed

        Returns:
            True if added, False if queue full
        """
        if command_id in self._pending:
            logger.warning(f"Command already queued: {command_id}")
            return False

        try:
            item = PrioritizedCommand(
                priority=priority,
                command_id=command_id,
                command=command,
                description=description,
                requires_consent=requires_consent,
            )
            self._queue.put_nowait(item)
            self._pending.add(command_id)
            return True
        except asyncio.QueueFull:
            logger.warning("Command queue full")
            return False

    async def get(self) -> Optional[PrioritizedCommand]:
        """Get next command (blocks until available)."""
        try:
            item = await self._queue.get()
            self._pending.discard(item.command_id)
            return item
        except Exception:
            return None

    def get_nowait(self) -> Optional[PrioritizedCommand]:
        """Get next command without blocking."""
        try:
            item = self._queue.get_nowait()
            self._pending.discard(item.command_id)
            return item
        except asyncio.QueueEmpty:
            return None

    def is_pending(self, command_id: str) -> bool:
        """Check if command is in queue."""
        return command_id in self._pending

    def size(self) -> int:
        """Get current queue size."""
        return self._queue.qsize()

    def clear(self) -> int:
        """Clear all queued commands. Returns count cleared."""
        count = 0
        while True:
            try:
                self._queue.get_nowait()
                count += 1
            except asyncio.QueueEmpty:
                break
        self._pending.clear()
        return count

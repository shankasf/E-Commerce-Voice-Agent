"""
Message Debouncing and Batching for AI Triggers.

Prevents overwhelming the LLM API when users send rapid messages.
Combines rapid messages into a single AI request.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Awaitable, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class DebounceConfig:
    """Configuration for message debouncing."""
    delay: float = 0.5  # seconds to wait for more messages
    max_delay: float = 2.0  # max wait time before forcing trigger
    max_batch_size: int = 5  # max messages to batch together


@dataclass
class BatchedMessage:
    """A batched message with metadata."""
    content: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


class MessageDebouncer:
    """
    Debounces rapid messages into batched AI triggers.

    When a user sends multiple messages quickly (e.g., typing corrections),
    this combines them into a single AI request instead of triggering
    multiple concurrent AI calls.

    Usage:
        debouncer = MessageDebouncer(
            on_trigger=lambda msgs: process_ai(msgs),
            config=DebounceConfig(delay=0.5),
        )
        await debouncer.add_message("Hello")
        await debouncer.add_message("I meant Hi")  # Combined with first
    """

    def __init__(
        self,
        on_trigger: Callable[[List[str]], Awaitable[None]],
        config: DebounceConfig = None,
    ):
        self._on_trigger = on_trigger
        self._config = config or DebounceConfig()
        self._pending: List[BatchedMessage] = []
        self._timer_task: Optional[asyncio.Task] = None
        self._first_message_time: Optional[datetime] = None
        self._lock = asyncio.Lock()
        self._processing = False

    async def add_message(self, content: str) -> None:
        """
        Add a message to the debounce queue.

        Message will be batched with other rapid messages
        and triggered after the debounce delay.

        Args:
            content: Message content from user
        """
        async with self._lock:
            now = datetime.utcnow()

            # Add to pending
            self._pending.append(BatchedMessage(content=content, timestamp=now))

            # Track first message time for max_delay
            if self._first_message_time is None:
                self._first_message_time = now

            # Check if we should force trigger (max_delay or max_batch)
            elapsed = (now - self._first_message_time).total_seconds()
            should_force = (
                elapsed >= self._config.max_delay or
                len(self._pending) >= self._config.max_batch_size
            )

            if should_force:
                await self._trigger_now()
            else:
                # Reset/start debounce timer
                self._reset_timer()

    def _reset_timer(self) -> None:
        """Reset the debounce timer."""
        if self._timer_task:
            self._timer_task.cancel()

        self._timer_task = asyncio.create_task(self._timer_callback())

    async def _timer_callback(self) -> None:
        """Called when debounce timer expires."""
        try:
            await asyncio.sleep(self._config.delay)
            async with self._lock:
                if self._pending and not self._processing:
                    await self._trigger_now()
        except asyncio.CancelledError:
            pass

    async def _trigger_now(self) -> None:
        """Trigger the callback with pending messages."""
        if not self._pending or self._processing:
            return

        self._processing = True

        # Cancel timer
        if self._timer_task:
            self._timer_task.cancel()
            self._timer_task = None

        # Collect messages
        messages = [msg.content for msg in self._pending]
        self._pending.clear()
        self._first_message_time = None

        logger.debug(f"[Debounce] Triggering with {len(messages)} messages")

        # Release lock before callback (callback may be slow)
        self._processing = False

        try:
            await self._on_trigger(messages)
        except Exception as e:
            logger.error(f"[Debounce] Trigger callback error: {e}")

    async def flush(self) -> None:
        """Force trigger any pending messages immediately."""
        async with self._lock:
            if self._pending:
                await self._trigger_now()

    def cancel(self) -> int:
        """Cancel pending messages. Returns count discarded."""
        count = len(self._pending)
        self._pending.clear()
        self._first_message_time = None

        if self._timer_task:
            self._timer_task.cancel()
            self._timer_task = None

        return count

    @property
    def pending_count(self) -> int:
        """Get count of pending messages."""
        return len(self._pending)

    @property
    def is_pending(self) -> bool:
        """Check if there are pending messages."""
        return len(self._pending) > 0


def combine_messages(messages: List[str]) -> str:
    """
    Combine multiple messages into a single string.

    For AI processing, combines rapid user messages sensibly.

    Args:
        messages: List of message contents

    Returns:
        Combined message string
    """
    if not messages:
        return ""

    if len(messages) == 1:
        return messages[0]

    # Combine with newlines, but collapse if they're short corrections
    total_length = sum(len(m) for m in messages)

    if total_length < 100:
        # Short messages - likely corrections, use last one
        return messages[-1]
    else:
        # Longer messages - combine them
        return "\n".join(messages)


class AITriggerDebouncer:
    """
    Specialized debouncer for AI response triggers.

    Wraps MessageDebouncer with AI-specific logic:
    - Combines messages intelligently
    - Handles session context
    - Provides status feedback

    Usage:
        debouncer = AITriggerDebouncer(session_id, ai_callback)
        await debouncer.on_user_message("Hello")
    """

    def __init__(
        self,
        session_id: str,
        ai_callback: Callable[[str], Awaitable[None]],
        config: DebounceConfig = None,
    ):
        self.session_id = session_id
        self._ai_callback = ai_callback
        self._config = config or DebounceConfig()

        self._debouncer = MessageDebouncer(
            on_trigger=self._process_batch,
            config=self._config,
        )

    async def _process_batch(self, messages: List[str]) -> None:
        """Process a batch of messages."""
        combined = combine_messages(messages)

        if combined:
            logger.info(
                f"[AI Debounce] Processing {len(messages)} messages "
                f"as single request ({len(combined)} chars)"
            )
            # IMPORTANT: Run AI callback as a separate task to avoid blocking
            # the message loop. This allows WebSocket messages (like command results)
            # to be processed while the AI is running.
            asyncio.create_task(self._ai_callback(combined))

    async def on_user_message(self, content: str) -> None:
        """Handle incoming user message."""
        await self._debouncer.add_message(content)

    async def flush(self) -> None:
        """Force process pending messages."""
        await self._debouncer.flush()

    def cancel(self) -> int:
        """Cancel pending messages."""
        return self._debouncer.cancel()

    @property
    def has_pending(self) -> bool:
        """Check if there are pending messages."""
        return self._debouncer.is_pending

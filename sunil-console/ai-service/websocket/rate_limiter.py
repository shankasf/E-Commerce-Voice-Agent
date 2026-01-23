"""
Rate Limiter for WebSocket Authentication.

Provides in-memory sliding window rate limiting to prevent
brute-force attacks on connection codes.
"""

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class RateLimitConfig:
    """Configuration for rate limiter."""
    max_attempts: int = 5
    window_seconds: int = 60


@dataclass
class RateLimitResult:
    """Result of rate limit check."""
    allowed: bool
    remaining_attempts: int
    reset_seconds: int


class RateLimiter:
    """
    Sliding window rate limiter.

    Thread-safe for async operations. Uses in-memory storage,
    suitable for single-instance deployments.

    For distributed deployments, swap with Redis-based implementation.
    """

    def __init__(self, config: RateLimitConfig = None):
        self._config = config or RateLimitConfig()
        self._attempts: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    @property
    def max_attempts(self) -> int:
        return self._config.max_attempts

    @property
    def window_seconds(self) -> int:
        return self._config.window_seconds

    async def check(self, key: str) -> RateLimitResult:
        """
        Check if request is allowed and record the attempt.

        Args:
            key: Identifier (e.g., IP address)

        Returns:
            RateLimitResult with allowed status and metadata
        """
        async with self._lock:
            now = time.time()
            window_start = now - self._config.window_seconds

            # Remove expired attempts
            self._attempts[key] = [t for t in self._attempts[key] if t > window_start]

            current_count = len(self._attempts[key])
            remaining = max(0, self._config.max_attempts - current_count)

            # Calculate reset time
            if self._attempts[key]:
                oldest = min(self._attempts[key])
                reset_seconds = int(oldest + self._config.window_seconds - now)
            else:
                reset_seconds = 0

            if current_count >= self._config.max_attempts:
                return RateLimitResult(
                    allowed=False,
                    remaining_attempts=0,
                    reset_seconds=max(0, reset_seconds),
                )

            # Record this attempt
            self._attempts[key].append(now)

            return RateLimitResult(
                allowed=True,
                remaining_attempts=remaining - 1,
                reset_seconds=self._config.window_seconds,
            )

    async def is_allowed(self, key: str) -> bool:
        """Simple check - returns True if allowed."""
        result = await self.check(key)
        return result.allowed

    async def remaining(self, key: str) -> int:
        """Get remaining attempts without recording."""
        async with self._lock:
            now = time.time()
            window_start = now - self._config.window_seconds
            self._attempts[key] = [t for t in self._attempts[key] if t > window_start]
            return max(0, self._config.max_attempts - len(self._attempts[key]))

    async def reset(self, key: str) -> None:
        """Reset rate limit for a key (e.g., after successful auth)."""
        async with self._lock:
            self._attempts.pop(key, None)

    async def cleanup_expired(self) -> int:
        """Remove all expired entries. Returns count removed."""
        async with self._lock:
            now = time.time()
            window_start = now - self._config.window_seconds
            removed = 0

            keys_to_delete = []
            for key, attempts in self._attempts.items():
                valid = [t for t in attempts if t > window_start]
                if not valid:
                    keys_to_delete.append(key)
                    removed += 1
                else:
                    self._attempts[key] = valid

            for key in keys_to_delete:
                del self._attempts[key]

            return removed


# Singleton instance for auth rate limiting
_auth_limiter: RateLimiter = None


def get_auth_rate_limiter() -> RateLimiter:
    """Get the singleton auth rate limiter instance."""
    global _auth_limiter
    if _auth_limiter is None:
        _auth_limiter = RateLimiter(RateLimitConfig(max_attempts=5, window_seconds=60))
    return _auth_limiter

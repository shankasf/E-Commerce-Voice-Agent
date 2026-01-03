"""
Message Queue - Handles async message passing between backend and devices
"""

from typing import Dict, Optional
import asyncio
from datetime import datetime


class MessageQueue:
    """
    Simple in-memory message queue for tool call/result matching
    """
    
    def __init__(self):
        self._pending_results: Dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()
    
    async def wait_for_result(self, call_id: str, timeout: float = 30.0) -> dict:
        """Wait for a tool result with the given call_id"""
        async with self._lock:
            if call_id in self._pending_results:
                future = self._pending_results[call_id]
            else:
                future = asyncio.Future()
                self._pending_results[call_id] = future
        
        try:
            result = await asyncio.wait_for(future, timeout=timeout)
            async with self._lock:
                if call_id in self._pending_results:
                    del self._pending_results[call_id]
            return result
        except asyncio.TimeoutError:
            async with self._lock:
                if call_id in self._pending_results:
                    del self._pending_results[call_id]
            return {
                "id": call_id,
                "status": "error",
                "error": "Tool execution timeout"
            }
    
    async def set_result(self, call_id: str, result: dict):
        """Set the result for a pending call_id"""
        async with self._lock:
            if call_id in self._pending_results:
                future = self._pending_results[call_id]
                if not future.done():
                    future.set_result(result)
            # If no pending future, create one (shouldn't happen but handle gracefully)
            else:
                future = asyncio.Future()
                future.set_result(result)
                self._pending_results[call_id] = future


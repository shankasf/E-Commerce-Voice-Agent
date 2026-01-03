"""
Tool execution dispatcher with validation and authorization.
"""
import asyncio
import logging
import time
from typing import Optional

from ..models import (
    ToolCallMessage,
    ToolResultMessage,
    ToolStatus,
    AuditLogEntry,
)
from ..tools.registry import ToolRegistry
from ..tools.authorization import AuthorizationEngine
from ..services.audit_logger import AuditLogger

logger = logging.getLogger(__name__)


class ToolDispatcher:
    """Orchestrates tool execution with validation, authorization, and logging."""

    def __init__(
        self,
        registry: ToolRegistry,
        authorization: AuthorizationEngine,
        audit_logger: Optional[AuditLogger] = None,
        notification_service=None,
    ):
        """
        Initialize dispatcher.

        Args:
            registry: Tool registry
            authorization: Authorization engine
            audit_logger: Optional audit logger
            notification_service: Optional notification service
        """
        self._registry = registry
        self._authorization = authorization
        self._audit_logger = audit_logger
        self._notification_service = notification_service

    async def dispatch(self, tool_call: ToolCallMessage) -> ToolResultMessage:
        """
        Dispatch a tool call for execution.

        Args:
            tool_call: Tool call message from backend

        Returns:
            Tool result message
        """
        start_time = time.time()

        logger.info(
            f"Dispatching tool '{tool_call.name}' "
            f"(id={tool_call.id}, role={tool_call.role.name})"
        )

        # Get tool and policy
        tool = self._registry.get_tool(tool_call.name)
        if not tool:
            result = ToolResultMessage(
                message_type="tool_result",
                id=tool_call.id,
                status=ToolStatus.FAILURE.value,
                output="",
                error=f"Tool '{tool_call.name}' not found",
                execution_time_ms=0,
            )
            await self._log_execution(tool_call, result, False)
            return result

        policy = self._registry.get_policy(tool_call.name)

        # Authorize
        auth_decision = self._authorization.authorize(
            tool_name=tool_call.name,
            policy=policy,
            role=tool_call.role,
        )

        if not auth_decision.allowed:
            logger.warning(
                f"Authorization denied for '{tool_call.name}': {auth_decision.reason}"
            )

            result = ToolResultMessage(
                message_type="tool_result",
                id=tool_call.id,
                status=ToolStatus.UNAUTHORIZED.value,
                output="",
                error=auth_decision.reason,
                execution_time_ms=0,
            )
            await self._log_execution(tool_call, result, False)
            return result

        logger.info(f"Authorization granted: {auth_decision.reason}")

        # Send notification if required
        if policy.requires_confirmation and self._notification_service:
            try:
                await self._notification_service.notify_tool_execution(
                    tool_name=tool_call.name,
                    role=tool_call.role,
                    risk_level=policy.risk_level,
                )
            except Exception as e:
                logger.warning(f"Failed to send notification: {e}")

        # Execute tool
        try:
            logger.info(f"Executing tool '{tool_call.name}'...")

            tool_result = await tool.execute_with_timeout(
                arguments=tool_call.arguments,
                timeout_seconds=policy.timeout_seconds,
            )

            execution_time_ms = int((time.time() - start_time) * 1000)

            logger.info(
                f"Tool '{tool_call.name}' completed with status {tool_result.status.value} "
                f"in {execution_time_ms}ms"
            )

            # Build result message
            result = ToolResultMessage(
                message_type="tool_result",
                id=tool_call.id,
                status=tool_result.status.value,
                output=tool_result.output,
                error=tool_result.error,
                execution_time_ms=execution_time_ms,
            )

            await self._log_execution(tool_call, result, True)
            return result

        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)
            error_msg = f"Unexpected error during execution: {str(e)}"
            logger.error(error_msg, exc_info=True)

            result = ToolResultMessage(
                message_type="tool_result",
                id=tool_call.id,
                status=ToolStatus.FAILURE.value,
                output="",
                error=error_msg,
                execution_time_ms=execution_time_ms,
            )

            await self._log_execution(tool_call, result, True)
            return result

    async def _log_execution(
        self,
        tool_call: ToolCallMessage,
        result: ToolResultMessage,
        authorized: bool,
    ):
        """
        Log tool execution to audit log.

        Args:
            tool_call: Original tool call
            result: Execution result
            authorized: Whether execution was authorized
        """
        if not self._audit_logger:
            return

        try:
            entry = AuditLogEntry(
                timestamp=__import__("datetime").datetime.utcnow(),
                tool_name=tool_call.name,
                role=tool_call.role,
                authorized=authorized,
                status=ToolStatus(result.status),
                output=result.output[:500] if result.output else "",  # Truncate
                error=result.error,
                execution_time_ms=result.execution_time_ms,
            )

            await self._audit_logger.log(entry)

        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

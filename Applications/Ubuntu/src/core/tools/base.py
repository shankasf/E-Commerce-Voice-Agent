"""
Base tool interface and implementation.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any
import asyncio

from ..models import ToolResult, ToolStatus


class ITool(ABC):
    """Interface for all tools."""

    @abstractmethod
    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute the tool with given arguments.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Tool name."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Tool description."""
        pass

    @property
    def parameters(self) -> Dict[str, Any]:
        """
        Tool parameters schema.

        Returns:
            JSON schema for parameters
        """
        return {"type": "object", "properties": {}}


class BaseTool(ITool):
    """Base implementation for tools."""

    def __init__(self):
        """Initialize base tool."""
        self._name = self.__class__.__name__.replace("Tool", "").lower()
        self._description = self.__doc__ or "No description available"

    @property
    def name(self) -> str:
        """Tool name."""
        return self._name

    @property
    def description(self) -> str:
        """Tool description."""
        return self._description.strip()

    async def execute_with_timeout(
        self,
        arguments: Dict[str, Any],
        timeout_seconds: int,
    ) -> ToolResult:
        """
        Execute tool with timeout.

        Args:
            arguments: Tool arguments
            timeout_seconds: Execution timeout

        Returns:
            ToolResult
        """
        try:
            result = await asyncio.wait_for(
                self.execute(arguments),
                timeout=timeout_seconds,
            )
            return result
        except asyncio.TimeoutError:
            return ToolResult(
                status=ToolStatus.TIMEOUT,
                error=f"Tool execution timed out after {timeout_seconds}s",
            )
        except Exception as e:
            return ToolResult(
                status=ToolStatus.FAILURE,
                error=f"Unexpected error: {str(e)}",
            )

    def _success(self, output: str, **metadata) -> ToolResult:
        """
        Create a success result.

        Args:
            output: Output message
            **metadata: Additional metadata

        Returns:
            ToolResult
        """
        return ToolResult(
            status=ToolStatus.SUCCESS,
            output=output,
            metadata=metadata,
        )

    def _failure(self, error: str, **metadata) -> ToolResult:
        """
        Create a failure result.

        Args:
            error: Error message
            **metadata: Additional metadata

        Returns:
            ToolResult
        """
        return ToolResult(
            status=ToolStatus.FAILURE,
            error=error,
            metadata=metadata,
        )

    async def _run_command(
        self,
        command: list,
        timeout: int = 30,
        require_sudo: bool = False,
    ) -> tuple[str, str, int]:
        """
        Run a shell command asynchronously.

        Args:
            command: Command and arguments as list
            timeout: Command timeout in seconds
            require_sudo: Whether to prepend sudo

        Returns:
            Tuple of (stdout, stderr, return_code)
        """
        if require_sudo:
            command = ["sudo", "-n"] + command

        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )

            return (
                stdout.decode("utf-8", errors="replace"),
                stderr.decode("utf-8", errors="replace"),
                process.returncode or 0,
            )

        except asyncio.TimeoutError:
            if 'process' in locals() and process:
                try:
                    process.kill()
                    await process.wait()
                except Exception:
                    pass  # Ignore errors during cleanup
            return "", f"Command timed out after {timeout}s", 124  # 124 is common timeout exit code
        except Exception as e:
            return "", str(e), 1

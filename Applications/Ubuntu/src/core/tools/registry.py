"""
Tool registry for managing and looking up tools.
"""
from typing import Dict, List, Optional, Type
import logging

from .base import ITool
from ..models import ToolDefinition, ToolPolicy

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Central registry for all available tools."""

    def __init__(self):
        """Initialize the tool registry."""
        self._tools: Dict[str, ITool] = {}
        self._policies: Dict[str, ToolPolicy] = {}

    def register(
        self,
        tool: ITool,
        policy: ToolPolicy,
    ) -> None:
        """
        Register a tool with its policy.

        Args:
            tool: Tool instance to register
            policy: Policy configuration for the tool
        """
        tool_name = tool.name
        if tool_name in self._tools:
            logger.warning(f"Tool '{tool_name}' is already registered. Overwriting.")

        self._tools[tool_name] = tool
        self._policies[tool_name] = policy
        logger.info(
            f"Registered tool: {tool_name} "
            f"(min_role={policy.min_role.name}, "
            f"risk={policy.risk_level.value})"
        )

    def get_tool(self, tool_name: str) -> Optional[ITool]:
        """
        Get a tool by name.

        Args:
            tool_name: Name of the tool

        Returns:
            Tool instance or None if not found
        """
        return self._tools.get(tool_name)

    def get_policy(self, tool_name: str) -> Optional[ToolPolicy]:
        """
        Get policy for a tool.

        Args:
            tool_name: Name of the tool

        Returns:
            Tool policy or None if not found
        """
        return self._policies.get(tool_name)

    def get_all_tools(self) -> List[str]:
        """
        Get list of all registered tool names.

        Returns:
            List of tool names
        """
        return list(self._tools.keys())

    def get_tools_for_role(self, role) -> List[str]:
        """
        Get tools available for a specific role.

        Args:
            role: Role to filter by

        Returns:
            List of tool names available to the role
        """
        from ..models import Role

        if not isinstance(role, Role):
            role = Role.from_string(str(role))

        available_tools = []
        for tool_name, policy in self._policies.items():
            if role >= policy.min_role:
                available_tools.append(tool_name)

        return available_tools

    def get_tool_definitions(self) -> List[Dict]:
        """
        Get tool definitions for MCP protocol.

        Returns:
            List of tool definitions
        """
        definitions = []
        for tool_name, tool in self._tools.items():
            definitions.append({
                "name": tool_name,
                "description": tool.description,
                "inputSchema": tool.parameters,
            })
        return definitions

    def unregister(self, tool_name: str) -> bool:
        """
        Unregister a tool.

        Args:
            tool_name: Name of tool to unregister

        Returns:
            True if tool was unregistered, False if not found
        """
        if tool_name in self._tools:
            del self._tools[tool_name]
            del self._policies[tool_name]
            logger.info(f"Unregistered tool: {tool_name}")
            return True
        return False

    def clear(self) -> None:
        """Clear all registered tools."""
        self._tools.clear()
        self._policies.clear()
        logger.info("Cleared all tools from registry")

    def __len__(self) -> int:
        """Get number of registered tools."""
        return len(self._tools)

    def __contains__(self, tool_name: str) -> bool:
        """Check if tool is registered."""
        return tool_name in self._tools

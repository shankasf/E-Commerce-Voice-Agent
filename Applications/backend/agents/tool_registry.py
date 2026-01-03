"""
Tool Registry - Centralized registry of all available tools with metadata
"""

from typing import Dict, List, Optional
from enum import Enum


class ToolRisk(Enum):
    SAFE = "safe"
    CAUTION = "caution"
    ELEVATED = "elevated"


class ToolRole(Enum):
    AI_AGENT = "ai_agent"
    HUMAN_AGENT = "human_agent"
    ADMIN = "admin"


class ToolMetadata:
    """Metadata for a tool"""
    def __init__(
        self,
        name: str,
        description: str,
        min_role: ToolRole,
        risk: ToolRisk,
        requires_user_notice: bool = False,
        requires_idle_check: bool = False,
        requires_admin: bool = False,
        arguments: Optional[Dict] = None
    ):
        self.name = name
        self.description = description
        self.min_role = min_role
        self.risk = risk
        self.requires_user_notice = requires_user_notice
        self.requires_idle_check = requires_idle_check
        self.requires_admin = requires_admin
        self.arguments = arguments or {}


class ToolRegistry:
    """
    Centralized registry of all available tools.
    This is the single source of truth for tool availability.
    """
    
    def __init__(self):
        self._tools: Dict[str, ToolMetadata] = {}
        self._initialize_tools()
    
    def _initialize_tools(self):
        """Initialize all available tools based on Project_requirements.md"""
        
        # AI_AGENT - SAFE tools
        self._register_tool(ToolMetadata(
            name="check_cpu_usage",
            description="Check CPU utilization percentage",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE
        ))
        
        self._register_tool(ToolMetadata(
            name="check_memory_usage",
            description="Check memory (RAM) usage",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE
        ))
        
        self._register_tool(ToolMetadata(
            name="check_disk_usage",
            description="Check disk space usage",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE
        ))
        
        self._register_tool(ToolMetadata(
            name="check_system_uptime",
            description="Check system uptime",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE
        ))
        
        self._register_tool(ToolMetadata(
            name="check_event_logs_summary",
            description="Summary of event logs (last 24h)",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE
        ))
        
        self._register_tool(ToolMetadata(
            name="check_network_status",
            description="Check network interface status and configuration",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE
        ))
        
        self._register_tool(ToolMetadata(
            name="check_ip_address",
            description="Show IP addresses (IPv4/IPv6), gateways, DNS servers, and MAC addresses for all network interfaces",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE
        ))
        
        # AI_AGENT - CAUTION tools
        self._register_tool(ToolMetadata(
            name="flush_dns_cache",
            description="Flush DNS cache",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True
        ))
        
        self._register_tool(ToolMetadata(
            name="renew_ip_address",
            description="Renew IP address",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True
        ))
        
        self._register_tool(ToolMetadata(
            name="reset_network_stack",
            description="Reset network stack (requires admin)",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True,
            requires_admin=True
        ))
        
        self._register_tool(ToolMetadata(
            name="restart_whitelisted_service",
            description="Restart safe services (Spooler, Themes, AudioSrv, BITS, WSearch)",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True,
            arguments={"service_name": "string"}
        ))
        
        self._register_tool(ToolMetadata(
            name="clear_windows_temp",
            description="Clear Windows temp files",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True
        ))
        
        self._register_tool(ToolMetadata(
            name="clear_user_temp",
            description="Clear user temp files",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True
        ))
        
        # AI_AGENT - Special case: restart_system with guards
        self._register_tool(ToolMetadata(
            name="restart_system",
            description="Restart the system with idle check, countdown, and cancel option",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True,
            requires_idle_check=True,
            arguments={"delay_seconds": "integer (optional, default 60)"}
        ))
        
        # HUMAN_AGENT tools
        self._register_tool(ToolMetadata(
            name="restart_any_service",
            description="Restart any whitelisted service",
            min_role=ToolRole.HUMAN_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True,
            arguments={"service_name": "string"}
        ))
        
        self._register_tool(ToolMetadata(
            name="restart_application",
            description="Restart an application by Windows process name (e.g., 'chrome' for Chrome, 'msedge' for Edge, 'notepad' for Notepad). Process name should be the executable name without .exe extension. If application is not running, this will start it. Handles multiple instances automatically.",
            min_role=ToolRole.HUMAN_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True,
            arguments={"process_name": "string (Windows process name without .exe, e.g., 'chrome', 'msedge', 'notepad')"}
        ))
        
        self._register_tool(ToolMetadata(
            name="network_adapter_reset",
            description="Reset network adapter",
            min_role=ToolRole.HUMAN_AGENT,
            risk=ToolRisk.CAUTION,
            requires_user_notice=True,
            requires_admin=True
        ))
        
        self._register_tool(ToolMetadata(
            name="windows_update_repair",
            description="Repair Windows Update components",
            min_role=ToolRole.HUMAN_AGENT,
            risk=ToolRisk.ELEVATED,
            requires_user_notice=True,
            requires_admin=True
        ))
        
        self._register_tool(ToolMetadata(
            name="immediate_restart",
            description="Immediate system restart (no delay)",
            min_role=ToolRole.HUMAN_AGENT,
            risk=ToolRisk.ELEVATED,
            requires_user_notice=True
        ))
        
        # ADMIN tools
        self._register_tool(ToolMetadata(
            name="registry_fix",
            description="Fix registry issues (whitelisted keys only)",
            min_role=ToolRole.ADMIN,
            risk=ToolRisk.ELEVATED,
            requires_user_notice=True,
            requires_admin=True
        ))
        
        self._register_tool(ToolMetadata(
            name="firewall_rule_repair",
            description="Repair firewall rules",
            min_role=ToolRole.ADMIN,
            risk=ToolRisk.ELEVATED,
            requires_user_notice=True,
            requires_admin=True
        ))
        
        self._register_tool(ToolMetadata(
            name="signed_driver_reinstall",
            description="Reinstall signed drivers",
            min_role=ToolRole.ADMIN,
            risk=ToolRisk.ELEVATED,
            requires_user_notice=True,
            requires_admin=True,
            arguments={"driver_name": "string"}
        ))
        
        self._register_tool(ToolMetadata(
            name="system_restart_no_delay",
            description="System restart with no delay (admin only)",
            min_role=ToolRole.ADMIN,
            risk=ToolRisk.ELEVATED,
            requires_user_notice=True,
            requires_admin=True
        ))
        
        # AI_AGENT, HUMAN_AGENT, ADMIN - execute_terminal_command
        # AI_AGENT requires user consent before execution (handled in backend)
        self._register_tool(ToolMetadata(
            name="execute_terminal_command",
            description="Execute a terminal/shell command and return output. Use this when no other tool can handle the user's request. For AI_AGENT: Requires user consent before execution (regular user privileges, no admin elevation). For HUMAN_AGENT/ADMIN: Elevated privileges available. Dangerous commands are blocked for security. For Linux: Commands requiring root can start with 'sudo ' or use use_sudo=true parameter.",
            min_role=ToolRole.AI_AGENT,  # AI_AGENT can use it but requires consent
            risk=ToolRisk.CAUTION,  # CAUTION for ai_agent (no elevated privileges)
            requires_user_notice=True,
            arguments={"command": "string (required)", "shell": "string (optional, default: powershell on Windows, /bin/bash on Linux)", "use_sudo": "boolean (optional, default: false, auto-detected if command starts with 'sudo ')", "timeout_seconds": "integer (optional, default: 60, max: 300)"}
        ))

        # AI_AGENT - search_files (Safe - Read-only file discovery)
        self._register_tool(ToolMetadata(
            name="search_files",
            description="Search for files across user directories using optimized BFS algorithm. Supports patterns like '*.xlsx', '.pdf', or 'report'. Can search by file extension, name fragment, or category (e.g., 'excel', 'documents'). Automatically searches Documents, Desktop, Downloads, Pictures, Videos. Returns file path, size, dates, and metadata. Max 100 results by default, max 1000 total. Safe read-only operation.",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE,
            arguments={
                "pattern": "string (required) - File pattern to search (e.g., '*.xlsx', 'report', '.pdf')",
                "search_paths": "array of strings (optional) - Custom directories to search, defaults to user folders",
                "max_results": "integer (optional) - Maximum results to return (default: 100, max: 1000)",
                "max_depth": "integer (optional) - Maximum directory depth to search (default: 5, max: 10)",
                "category": "string (optional) - Category shortcut: 'excel', 'word', 'pdf', 'documents', 'spreadsheets', 'images', 'videos', 'audio', 'code', 'archives'"
            }
        ))

        # AI_AGENT - list_files (Safe - Read-only directory listing)
        self._register_tool(ToolMetadata(
            name="list_files",
            description="List files in a specific directory. Can list recursively with depth control. Optional pattern filtering. Returns detailed file information including size, dates, and type. Safe read-only operation. Useful for exploring directory contents.",
            min_role=ToolRole.AI_AGENT,
            risk=ToolRisk.SAFE,
            arguments={
                "directory": "string (required) - Directory path to list (e.g., 'C:\\Users\\username\\Documents')",
                "recursive": "boolean (optional) - List subdirectories recursively (default: false)",
                "pattern": "string (optional) - Optional file pattern to filter (e.g., '*.txt')",
                "max_depth": "integer (optional) - Maximum depth for recursive listing (default: 3, max: 5)"
            }
        ))
    
    def _register_tool(self, metadata: ToolMetadata):
        """Register a tool"""
        self._tools[metadata.name] = metadata
    
    def get_tool(self, name: str) -> Optional[ToolMetadata]:
        """Get tool metadata by name"""
        return self._tools.get(name)

    def get_tool_metadata(self, name: str) -> Optional[ToolMetadata]:
        """Get tool metadata by name (alias for get_tool)"""
        return self.get_tool(name)
    
    def get_tools_for_role(self, role: str) -> List[ToolMetadata]:
        """Get all tools available for a role"""
        role_enum = ToolRole(role) if isinstance(role, str) else role
        
        available = []
        for tool in self._tools.values():
            if role_enum.value == "admin" or \
               (role_enum.value == "human_agent" and tool.min_role.value in ["ai_agent", "human_agent"]) or \
               (role_enum.value == "ai_agent" and tool.min_role.value == "ai_agent"):
                available.append(tool)
        
        return available
    
    def get_tool_names_for_role(self, role: str) -> List[str]:
        """Get tool names available for a role"""
        return [tool.name for tool in self.get_tools_for_role(role)]
    
    def get_all_tools(self) -> List[ToolMetadata]:
        """Get all tools regardless of role (TEST FEATURE)"""
        return list(self._tools.values())
    
    def get_all_tools_dict(self) -> List[Dict]:
        """Get all tools as dictionaries for API responses (TEST FEATURE)"""
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "min_role": tool.min_role.value,
                "risk": tool.risk.value,
                "requires_user_notice": tool.requires_user_notice,
                "requires_idle_check": tool.requires_idle_check,
                "requires_admin": tool.requires_admin,
                "arguments": tool.arguments
            }
            for tool in self._tools.values()
        ]

    def get_safe_diagnostic_tools(self, role: str) -> List[str]:
        """
        Get safe diagnostic/informational tools for a role.
        These are SAFE risk tools that gather information without modifying the system.
        This is dynamic - any SAFE tool can be used for diagnostics.
        """
        role_enum = ToolRole(role) if isinstance(role, str) else role

        diagnostic_tools = []
        for tool in self._tools.values():
            # Include if:
            # 1. Tool is SAFE risk (read-only, no system changes)
            # 2. User has permission (role check)
            # 3. Does NOT require user notice or idle check (truly passive)
            if (tool.risk == ToolRisk.SAFE and
                not tool.requires_user_notice and
                not tool.requires_idle_check):
                # Check role permission
                if role_enum.value == "admin" or \
                   (role_enum.value == "human_agent" and tool.min_role.value in ["ai_agent", "human_agent"]) or \
                   (role_enum.value == "ai_agent" and tool.min_role.value == "ai_agent"):
                    diagnostic_tools.append(tool.name)

        return diagnostic_tools

    def get_action_tools(self, role: str) -> List[str]:
        """
        Get action tools for a role.
        These are CAUTION or ELEVATED risk tools that modify the system.
        This is dynamic - based on risk level, not tool name patterns.
        """
        role_enum = ToolRole(role) if isinstance(role, str) else role

        action_tools = []
        for tool in self._tools.values():
            # Include if:
            # 1. Tool is CAUTION or ELEVATED risk (modifies system)
            # 2. User has permission (role check)
            if tool.risk in [ToolRisk.CAUTION, ToolRisk.ELEVATED]:
                # Check role permission
                if role_enum.value == "admin" or \
                   (role_enum.value == "human_agent" and tool.min_role.value in ["ai_agent", "human_agent"]) or \
                   (role_enum.value == "ai_agent" and tool.min_role.value == "ai_agent"):
                    action_tools.append(tool.name)

        return action_tools
    
    def format_tools_for_prompt(self, role: str) -> str:
        """Format tools as a string for LLM prompts"""
        tools = self.get_tools_for_role(role)
        
        # Group by risk level
        safe_tools = [t for t in tools if t.risk == ToolRisk.SAFE]
        caution_tools = [t for t in tools if t.risk == ToolRisk.CAUTION]
        elevated_tools = [t for t in tools if t.risk == ToolRisk.ELEVATED]
        
        lines = []
        
        if safe_tools:
            lines.append(f"{role.upper()} (Safe - Auto-approved):")
            for tool in safe_tools:
                desc = f"- {tool.name}: {tool.description}"
                if tool.arguments:
                    desc += f" (args: {', '.join(tool.arguments.keys())})"
                lines.append(desc)
        
        if caution_tools:
            lines.append(f"\n{role.upper()} (Caution - Temporary disruption):")
            for tool in caution_tools:
                desc = f"- {tool.name}: {tool.description}"
                if tool.requires_idle_check:
                    desc += " [requires idle check]"
                if tool.requires_admin:
                    desc += " [requires admin]"
                if tool.requires_user_notice and role == "ai_agent" and tool.name == "execute_terminal_command":
                    desc += " [requires user consent before execution]"
                if tool.arguments:
                    desc += f" (args: {', '.join(tool.arguments.keys())})"
                lines.append(desc)
        
        if elevated_tools:
            lines.append(f"\n{role.upper()} (Elevated - Requires admin):")
            for tool in elevated_tools:
                desc = f"- {tool.name}: {tool.description}"
                if tool.arguments:
                    desc += f" (args: {', '.join(tool.arguments.keys())})"
                lines.append(desc)
        
        return "\n".join(lines)


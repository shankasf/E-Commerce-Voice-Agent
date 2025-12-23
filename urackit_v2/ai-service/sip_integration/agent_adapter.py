"""
Agent adapter for integrating URackIT V2 agents with voice.
Updated to work with the v2 AI service structure.
"""

import asyncio
import inspect
import json
import logging
from typing import Any, Callable, Dict, List, Optional

from .interfaces import IAgentAdapter

logger = logging.getLogger(__name__)


class URackITAgentAdapter(IAgentAdapter):
    """
    Adapts the URackIT V2 agent system for voice interactions.
    
    This adapter bridges the OpenAI Realtime API with the existing
    triage agent and specialist agents.
    """
    
    def __init__(self):
        self._triage_agent = None
        self._tools_cache: Optional[list[dict]] = None
        self._tool_functions: Dict[str, Callable] = {}
    
    def _ensure_agents_loaded(self) -> None:
        """Lazy load the agent system."""
        if self._triage_agent is None:
            from app_agents.triage_agent import triage_agent
            self._triage_agent = triage_agent
            self._build_tools_registry()
    
    def _build_tools_registry(self) -> None:
        """Build registry of all available tools from agents."""
        from app_agents.email_agent import email_agent
        from app_agents.computer_agent import computer_agent
        from app_agents.network_agent import network_agent
        from app_agents.printer_agent import printer_agent
        from app_agents.phone_agent import phone_agent
        from app_agents.security_agent import security_agent
        from app_agents.ticket_agent import ticket_agent
        from app_agents.device_agent import device_agent
        from app_agents.lookup_agent import lookup_agent
        
        # Import all core database tools from queries.py
        from db.queries import (
            find_organization_by_ue_code,
            find_organization_by_name,
            create_organization,
            create_contact,
            find_contact_by_phone,
            get_contact_devices,
            get_device_status,
            get_device_details,
            create_ticket,
            lookup_ticket,
            get_tickets_by_contact,
            get_tickets_by_organization,
            update_ticket_status,
            add_ticket_message,
            escalate_ticket,
            assign_ticket,
            get_available_agents,
            get_organization_locations,
            transfer_to_human,
            get_ticket_statuses,
            get_ticket_priorities,
            get_account_manager,
            get_ticket_history,
            # Organization-scoped lookup tools
            lookup_organization_data,
            get_organization_devices,
            get_organization_contacts,
            get_organization_tickets,
            get_organization_summary,
            get_device_by_name_for_org,
            # FULL DETAILS tools
            get_device_full_details,
            get_contact_full_details,
            get_ticket_full_details,
            get_location_full_details,
        )
        
        # Register all core database tools
        core_tools = [
            lookup_organization_data,
            find_organization_by_ue_code,
            find_organization_by_name,
            create_organization,
            create_contact,
            find_contact_by_phone,
            get_organization_devices,
            get_organization_contacts,
            get_organization_tickets,
            get_organization_locations,
            get_organization_summary,
            get_device_by_name_for_org,
            get_device_full_details,
            get_contact_full_details,
            get_ticket_full_details,
            get_location_full_details,
            get_contact_devices,
            get_device_status,
            get_device_details,
            create_ticket,
            lookup_ticket,
            get_tickets_by_contact,
            get_tickets_by_organization,
            update_ticket_status,
            add_ticket_message,
            escalate_ticket,
            assign_ticket,
            get_available_agents,
            transfer_to_human,
            get_ticket_statuses,
            get_ticket_priorities,
            get_account_manager,
            get_ticket_history,
        ]
        
        for tool in core_tools:
            if hasattr(tool, 'name'):
                self._tool_functions[tool.name] = tool
            elif hasattr(tool, '__name__'):
                self._tool_functions[tool.__name__] = tool
        
        # Collect tools from all specialist agents
        all_agents = [
            email_agent,
            computer_agent,
            network_agent,
            printer_agent,
            phone_agent,
            security_agent,
            ticket_agent,
            device_agent,
            lookup_agent,
        ]
        
        for agent in all_agents:
            if hasattr(agent, 'tools') and agent.tools:
                for tool in agent.tools:
                    if hasattr(tool, 'name'):
                        self._tool_functions[tool.name] = tool
                    elif hasattr(tool, '__name__'):
                        self._tool_functions[tool.__name__] = tool
        
        logger.info(f"Registered {len(self._tool_functions)} tools for voice agent")
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for voice interactions."""
        self._ensure_agents_loaded()
        base_prompt = self._triage_agent.instructions if self._triage_agent else ""
        
        voice_additions = """

VOICE-SPECIFIC RULES:
- Keep responses under 2 sentences when possible
- Speak slowly and clearly
- Confirm important information by repeating it back
- If you need to perform an action, tell the caller what you're doing
- Wait for caller responses before proceeding

REMEMBER: You are speaking to a real person on a phone call.
"""
        return base_prompt + voice_additions
    
    def get_tools_schema(self) -> list[dict]:
        """Get OpenAI function calling schema for all available tools."""
        self._ensure_agents_loaded()
        
        if self._tools_cache is not None:
            return self._tools_cache
        
        tools = []
        for name, func in self._tool_functions.items():
            schema = self._function_to_schema(name, func)
            if schema:
                tools.append(schema)
        
        self._tools_cache = tools
        logger.info(f"Generated schema for {len(tools)} tools")
        return tools
    
    def _function_to_schema(self, name: str, func: Callable) -> Optional[dict]:
        """Convert a function to OpenAI tool schema."""
        try:
            sig = inspect.signature(func)
            doc = inspect.getdoc(func) or f"Execute {name}"
            parameters = {"type": "object", "properties": {}, "required": []}
            
            for param_name, param in sig.parameters.items():
                if param_name in ("self", "cls"):
                    continue
                
                param_type = "string"
                if param.annotation != inspect.Parameter.empty:
                    if param.annotation == int:
                        param_type = "integer"
                    elif param.annotation == float:
                        param_type = "number"
                    elif param.annotation == bool:
                        param_type = "boolean"
                
                parameters["properties"][param_name] = {
                    "type": param_type,
                    "description": f"Parameter: {param_name}"
                }
                
                if param.default == inspect.Parameter.empty:
                    parameters["required"].append(param_name)
            
            return {
                "type": "function",
                "name": name,
                "description": doc[:500],
                "parameters": parameters
            }
        except Exception as e:
            logger.warning(f"Failed to generate schema for {name}: {e}")
            return None
    
    async def execute_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool and return its result."""
        self._ensure_agents_loaded()
        
        if name not in self._tool_functions:
            return f"Unknown tool: {name}"
        
        func = self._tool_functions[name]
        
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(**arguments)
            else:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, lambda: func(**arguments))
            return result
        except Exception as e:
            logger.error(f"Tool {name} failed: {e}")
            return f"Error executing {name}: {str(e)}"


def create_agent_adapter(use_full_agents: bool = True) -> URackITAgentAdapter:
    """Factory function to create an agent adapter."""
    return URackITAgentAdapter()

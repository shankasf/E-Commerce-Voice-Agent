"""
Agent adapter for integrating U Rack IT agents with voice.
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
    Adapts the U Rack IT agent system for voice interactions.
    
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
        from app_agents.servicedesk_agent import servicedesk_agent
        
        # Import all core database tools from queries.py
        from db.queries import (
            find_organization_by_ue_code,
            find_organization_by_name,
            create_organization,
            create_contact,
            get_contact_devices,
            find_device_by_name,
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
            # Organization-scoped lookup tools (CRITICAL for device/contact queries)
            lookup_organization_data,
            get_organization_devices,
            get_organization_contacts,
            get_organization_tickets,
            get_organization_summary,
            get_device_by_name_for_org,
            # FULL DETAILS tools - return ALL columns with foreign key data
            get_device_full_details,
            get_contact_full_details,
            get_ticket_full_details,
            get_location_full_details,
        )
        
        # Register all core database tools
        core_tools = [
            # UNIVERSAL LOOKUP - USE THIS FIRST
            lookup_organization_data,
            # Organization auth
            find_organization_by_ue_code,
            find_organization_by_name,
            create_organization,
            create_contact,
            # Organization-scoped lookups (for devices, contacts, tickets)
            get_organization_devices,
            get_organization_contacts,
            get_organization_tickets,
            get_organization_locations,
            get_organization_summary,
            get_device_by_name_for_org,
            # FULL DETAILS tools - return ALL columns with foreign key data
            get_device_full_details,
            get_contact_full_details,
            get_ticket_full_details,
            get_location_full_details,
            # Legacy tools
            get_contact_devices,
            find_device_by_name,
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
            servicedesk_agent,
        ]
        
        for agent in all_agents:
            if hasattr(agent, 'tools') and agent.tools:
                for tool in agent.tools:
                    if hasattr(tool, 'name'):
                        self._tool_functions[tool.name] = tool
                    elif hasattr(tool, '__name__'):
                        self._tool_functions[tool.__name__] = tool
    
    def get_system_prompt(self) -> str:
        """Get the system prompt from the triage agent."""
        self._ensure_agents_loaded()
        
        if self._triage_agent and hasattr(self._triage_agent, 'instructions'):
            return self._triage_agent.instructions
        
        # Fallback minimal prompt
        return "You are a helpful IT support assistant. Be concise and friendly."
    
    async def process_input(self, session_id: str, text: str) -> str:
        """Process text input through the agent system."""
        self._ensure_agents_loaded()
        
        try:
            from agents import Runner, SQLiteSession
            
            session = SQLiteSession(session_id, "conversations.db")
            result = await Runner.run(self._triage_agent, text, session=session)
            
            return result.final_output or "I'm sorry, I couldn't process that request."
            
        except Exception as e:
            logger.error(f"Error processing input: {e}")
            return "I apologize, but I encountered an error. Could you please repeat that?"
    
    def get_tools_schema(self) -> list[dict]:
        """Get JSON schema for all available tools."""
        if self._tools_cache is not None:
            return self._tools_cache
        
        self._ensure_agents_loaded()
        
        tools_schema = []
        
        for tool_name, tool_func in self._tool_functions.items():
            schema = self._build_tool_schema(tool_name, tool_func)
            if schema:
                tools_schema.append(schema)
        
        self._tools_cache = tools_schema
        return tools_schema
    
    def _build_tool_schema(self, name: str, func: Callable) -> Optional[dict]:
        """Build OpenAI function schema from a tool function."""
        try:
            sig = inspect.signature(func)
            description = getattr(func, 'description', '') or (func.__doc__ or '').strip()
            
            parameters = {
                "type": "object",
                "properties": {},
                "required": []
            }
            
            for param_name, param in sig.parameters.items():
                if param_name in ('self', 'cls'):
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
                "description": description[:500] if description else f"Tool: {name}",
                "parameters": parameters
            }
            
        except Exception as e:
            logger.warning(f"Could not build schema for {name}: {e}")
            return None
    
    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool and return result."""
        self._ensure_agents_loaded()
        
        tool_func = self._tool_functions.get(tool_name)
        if not tool_func:
            return f"Unknown tool: {tool_name}"
        
        try:
            if asyncio.iscoroutinefunction(tool_func):
                result = await tool_func(**arguments)
            else:
                result = tool_func(**arguments)
            
            logger.info(f"Executed tool {tool_name}: success")
            return result
            
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return f"Error executing {tool_name}: {str(e)}"
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the voice agent."""
        self._ensure_agents_loaded()
        
        if self._triage_agent and hasattr(self._triage_agent, 'instructions'):
            return self._triage_agent.instructions
        
        return "You are a helpful IT support assistant for U Rack IT."


def create_agent_adapter(use_full_agents: bool = True) -> URackITAgentAdapter:
    """Factory function to create an agent adapter."""
    return URackITAgentAdapter()

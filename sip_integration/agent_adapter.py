"""
Agent adapter for integrating existing multi-agent system with voice.

Follows Open/Closed and Dependency Inversion principles.
"""

import asyncio
import inspect
import json
import logging
from typing import Any, Callable, Dict, List, Optional

from .interfaces import IAgentAdapter

logger = logging.getLogger(__name__)


class ToyShopAgentAdapter(IAgentAdapter):
    """
    Adapts the existing multi-agent chatbot system for voice interactions.
    
    This adapter bridges the OpenAI Realtime API with the existing
    triage agent and specialist agents.
    """
    
    def __init__(self):
        # Lazy import to avoid circular dependencies
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
        from app_agents.admission_agent import admission_agent
        from app_agents.catalog_agent import catalog_agent
        from app_agents.info_agent import info_agent
        from app_agents.order_agent import order_agent
        from app_agents.party_agent import party_agent
        
        # Collect tools from all specialist agents
        all_agents = [
            info_agent,
            catalog_agent,
            admission_agent,
            party_agent,
            order_agent,
        ]
        
        for agent in all_agents:
            if hasattr(agent, 'tools') and agent.tools:
                for tool in agent.tools:
                    # Extract tool name and function
                    if hasattr(tool, 'name'):
                        self._tool_functions[tool.name] = tool
                    elif hasattr(tool, '__name__'):
                        self._tool_functions[tool.__name__] = tool
    
    async def process_input(self, session_id: str, text: str) -> str:
        """
        Process text input through the agent system.
        
        Args:
            session_id: Voice session ID for conversation context
            text: User's transcribed speech
            
        Returns:
            Agent's text response
        """
        self._ensure_agents_loaded()
        
        try:
            # Import runner
            from agents import Runner, SQLiteSession
            
            # Create session for conversation persistence
            session = SQLiteSession(session_id, "conversations.db")
            
            # Run through the triage agent
            result = await Runner.run(self._triage_agent, text, session=session)
            
            return result.final_output or "I'm sorry, I couldn't process that request."
            
        except Exception as e:
            logger.error(f"Error processing input: {e}")
            return "I apologize, but I encountered an error. Could you please repeat that?"
    
    def get_tools_schema(self) -> list[dict]:
        """
        Get JSON schema for all available tools.
        
        Returns OpenAI function-calling compatible schema.
        """
        if self._tools_cache is not None:
            return self._tools_cache
        
        self._ensure_agents_loaded()
        
        tools_schema = []
        
        # Core tools for voice interaction (Supabase REST-backed)
        core_tools = [
            {
                "type": "function",
                "name": "search_products",
                "description": "Search the toy catalog by keyword, category, or age group.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "keyword": {"type": "string", "description": "Search term (name, brand, SKU)."},
                        "category": {"type": "string", "description": "Optional category filter."},
                        "age_group": {"type": "string", "description": "Optional age group filter."},
                        "max_results": {"type": "integer", "description": "Number of results (1-20)."},
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "get_product_details",
                "description": "Get detailed information about a specific toy product.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "integer", "description": "Product ID to look up."}
                    },
                    "required": ["product_id"]
                }
            },
            {
                "type": "function",
                "name": "get_ticket_pricing",
                "description": "Get admission ticket pricing, optionally filtered by location.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location_name": {"type": "string", "description": "Optional location name filter."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "get_store_policies",
                "description": "Retrieve active store policies (grip socks, waivers, age rules, etc.).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "topic": {"type": "string", "description": "Optional keyword to filter policies."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "list_store_locations",
                "description": "List store locations and contact details.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "only_active": {"type": "boolean", "description": "If true, only show active locations."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "lookup_store_info",
                "description": "Search the knowledge base (kidz4fun.txt) for FAQs and info.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string", "description": "Question to search for."},
                        "top_k": {"type": "integer", "description": "Number of snippets to return."}
                    },
                    "required": ["question"]
                }
            },
            {
                "type": "function",
                "name": "list_party_packages",
                "description": "Get available birthday party packages and pricing.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location_name": {"type": "string", "description": "Optional location filter."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "get_party_availability",
                "description": "Check booked party slots within a time window.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "start_datetime": {"type": "string", "description": "Window start (ISO, e.g., 2025-01-15T14:00)."},
                        "end_datetime": {"type": "string", "description": "Window end (ISO)."},
                        "location_name": {"type": "string", "description": "Optional location filter."}
                    },
                    "required": ["start_datetime", "end_datetime"]
                }
            },
            {
                "type": "function",
                "name": "search_orders",
                "description": "Search orders by status or customer name.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "description": "Optional status filter."},
                        "customer_name": {"type": "string", "description": "Optional customer name filter."},
                        "limit": {"type": "integer", "description": "Max results (1-20)."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "get_order_details",
                "description": "Get detailed information about a specific order.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "integer", "description": "Order ID to look up."}
                    },
                    "required": ["order_id"]
                }
            },
            {
                "type": "function",
                "name": "list_faqs",
                "description": "List FAQs and answers.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "only_active": {"type": "boolean", "description": "If true, only active FAQs."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "list_staff",
                "description": "List staff with roles and contact info.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "only_active": {"type": "boolean", "description": "If true, only active staff."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "list_testimonials",
                "description": "List customer testimonials.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "only_featured": {"type": "boolean", "description": "If true, only featured testimonials."},
                        "limit": {"type": "integer", "description": "Max results (1-20)."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "list_promotions",
                "description": "List promotion codes and discounts.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "only_active": {"type": "boolean", "description": "If true, only active promos."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "list_waivers",
                "description": "List waivers, optionally filtered by customer.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "customer_id": {"type": "integer", "description": "Optional customer filter."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "list_payments",
                "description": "List payments, optionally by order or status.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "integer", "description": "Optional order filter."},
                        "status": {"type": "string", "description": "Optional status filter."},
                        "limit": {"type": "integer", "description": "Max results (1-50)."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "list_refunds",
                "description": "List refunds, optionally by order or status.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "integer", "description": "Optional order filter."},
                        "status": {"type": "string", "description": "Optional status filter."},
                        "limit": {"type": "integer", "description": "Max results (1-50)."}
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "create_customer_profile",
                "description": "Create a customer profile with guardian/child details.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "full_name": {"type": "string"},
                        "email": {"type": "string"},
                        "phone": {"type": "string"},
                        "guardian_name": {"type": "string"},
                        "child_name": {"type": "string"},
                        "child_birthdate": {"type": "string", "description": "YYYY-MM-DD"},
                        "notes": {"type": "string"}
                    },
                    "required": ["full_name", "guardian_name", "child_name"]
                }
            },
            {
                "type": "function",
                "name": "create_party_booking",
                "description": "Create a party booking record; will reuse or create a customer automatically if customer_id is not provided.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "customer_id": {"type": "integer", "description": "Optional; reuse if provided."},
                        "full_name": {"type": "string", "description": "Required if creating new customer."},
                        "email": {"type": "string"},
                        "phone": {"type": "string"},
                        "guardian_name": {"type": "string"},
                        "child_name": {"type": "string"},
                        "child_birthdate": {"type": "string", "description": "YYYY-MM-DD"},
                        "package_id": {"type": "integer"},
                        "resource_id": {"type": "integer"},
                        "scheduled_start": {"type": "string", "description": "ISO datetime"},
                        "scheduled_end": {"type": "string", "description": "ISO datetime"},
                        "additional_kids": {"type": "integer"},
                        "additional_guests": {"type": "integer"},
                        "special_requests": {"type": "string"},
                        "status": {"type": "string"},
                        "notes": {"type": "string"}
                    },
                    "required": ["package_id", "resource_id", "scheduled_start", "scheduled_end"]
                }
            },
            {
                "type": "function",
                "name": "update_party_booking",
                "description": "Update fields on a party booking.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "booking_id": {"type": "integer"},
                        "status": {"type": "string"},
                        "scheduled_start": {"type": "string"},
                        "scheduled_end": {"type": "string"},
                        "additional_kids": {"type": "integer"},
                        "additional_guests": {"type": "integer"},
                        "special_requests": {"type": "string"},
                        "reschedule_reason": {"type": "string"}
                    },
                    "required": ["booking_id"]
                }
            },
            {
                "type": "function",
                "name": "create_order_with_item",
                "description": "Create an order with one item (product/ticket/party); will reuse or create customer automatically if customer_id is missing.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "customer_id": {"type": "integer", "description": "Optional; reuse if provided."},
                        "full_name": {"type": "string", "description": "Required if creating new customer."},
                        "email": {"type": "string"},
                        "phone": {"type": "string"},
                        "guardian_name": {"type": "string"},
                        "child_name": {"type": "string"},
                        "child_birthdate": {"type": "string", "description": "YYYY-MM-DD"},
                        "item_type": {"type": "string", "description": "Product|Ticket|Party"},
                        "reference_id": {"type": "integer", "description": "product_id / ticket_type_id / booking_id"},
                        "quantity": {"type": "integer"},
                        "order_type": {"type": "string"},
                        "location_id": {"type": "integer"},
                        "notes": {"type": "string"}
                    },
                    "required": ["item_type", "reference_id"]
                }
            },
            {
                "type": "function",
                "name": "add_order_item",
                "description": "Add an item to an existing order.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "integer"},
                        "item_type": {"type": "string", "description": "Product|Ticket|Party"},
                        "reference_id": {"type": "integer"},
                        "quantity": {"type": "integer"}
                    },
                    "required": ["order_id", "item_type", "reference_id"]
                }
            },
            {
                "type": "function",
                "name": "update_order_status",
                "description": "Update an order status.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "integer"},
                        "new_status": {"type": "string"}
                    },
                    "required": ["order_id", "new_status"]
                }
            },
            {
                "type": "function",
                "name": "record_payment",
                "description": "Record a payment for an order.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "integer"},
                        "amount_usd": {"type": "number"},
                        "payment_method": {"type": "string"},
                        "transaction_ref": {"type": "string"},
                        "status": {"type": "string"}
                    },
                    "required": ["order_id", "amount_usd"]
                }
            },
            {
                "type": "function",
                "name": "create_refund",
                "description": "Create a refund for an order.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "integer"},
                        "amount_usd": {"type": "number"},
                        "reason": {"type": "string"}
                    },
                    "required": ["order_id", "amount_usd"]
                }
            },
        ]
        
        self._tools_cache = core_tools
        return core_tools
    
    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """
        Execute a tool and return the result.
        
        Args:
            tool_name: Name of the tool to execute
            arguments: Tool arguments
            
        Returns:
            Tool execution result
        """
        self._ensure_agents_loaded()
        
        logger.info(f"Executing tool: {tool_name} with args: {arguments}")
        
        try:
            # Import tool functions from Supabase-backed queries
            from db.queries_supabase import (
                search_products,
                get_product_details,
                get_ticket_pricing,
                get_store_policies,
                list_store_locations,
                list_party_packages,
                get_party_availability,
                search_orders,
                get_order_details,
                list_faqs,
                list_staff,
                list_testimonials,
                list_promotions,
                list_waivers,
                list_payments,
                list_refunds,
                create_customer_profile,
                create_party_booking,
                update_party_booking,
                create_order_with_item,
                add_order_item,
                update_order_status,
                record_payment,
                create_refund,
            )
            from memory.knowledge_base import lookup_store_info
            
            # Map tool names to functions
            tool_map = {
                "search_products": search_products,
                "get_product_details": get_product_details,
                "get_ticket_pricing": get_ticket_pricing,
                "get_store_policies": get_store_policies,
                "list_store_locations": list_store_locations,
                "lookup_store_info": lookup_store_info,
                "list_party_packages": list_party_packages,
                "get_party_availability": get_party_availability,
                "search_orders": search_orders,
                "get_order_details": get_order_details,
                "list_faqs": list_faqs,
                "list_staff": list_staff,
                "list_testimonials": list_testimonials,
                "list_promotions": list_promotions,
                "list_waivers": list_waivers,
                "list_payments": list_payments,
                "list_refunds": list_refunds,
                "create_customer_profile": create_customer_profile,
                "create_party_booking": create_party_booking,
                "update_party_booking": update_party_booking,
                "create_order_with_item": create_order_with_item,
                "add_order_item": add_order_item,
                "update_order_status": update_order_status,
                "record_payment": record_payment,
                "create_refund": create_refund,
            }
            
            if tool_name not in tool_map:
                return {"error": f"Unknown tool: {tool_name}"}
            
            func = tool_map[tool_name]
            
            # Handle both sync and async functions
            if asyncio.iscoroutinefunction(func):
                result = await func(**arguments)
            else:
                # Check if it's a decorated function tool
                if hasattr(func, '__wrapped__'):
                    result = func.__wrapped__(**arguments)
                else:
                    result = func(**arguments)
            
            logger.info(f"Tool {tool_name} result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Tool execution error: {e}")
            return {"error": str(e)}


class SimpleVoiceAdapter(IAgentAdapter):
    """
    Simplified adapter that uses direct text processing without full agent system.
    
    Useful for testing or simpler deployments.
    """
    
    def __init__(self, system_prompt: Optional[str] = None):
        self.system_prompt = system_prompt or "You are a helpful voice assistant."
        self._tools_cache: list[dict] = []
    
    async def process_input(self, session_id: str, text: str) -> str:
        """Process input (returns placeholder - actual processing done by OpenAI Realtime)."""
        # In simple mode, OpenAI Realtime handles everything
        return text
    
    def get_tools_schema(self) -> list[dict]:
        """Get tools schema (empty for simple mode)."""
        return self._tools_cache
    
    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute tool (no-op for simple mode)."""
        return {"error": "Tools not available in simple mode"}


def create_agent_adapter(use_full_agents: bool = True) -> IAgentAdapter:
    """
    Factory function to create the appropriate agent adapter.
    
    Args:
        use_full_agents: If True, use full multi-agent system; otherwise use simple adapter
        
    Returns:
        IAgentAdapter implementation
    """
    if use_full_agents:
        return ToyShopAgentAdapter()
    else:
        return SimpleVoiceAdapter()

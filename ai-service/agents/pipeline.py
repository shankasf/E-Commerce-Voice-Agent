"""
Agent Pipeline - Orchestrates multi-agent conversations.

Uses OpenAI's API for chat completions with tool calling.
Manages agent handoffs and conversation flow.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

from openai import OpenAI

from config import get_config

logger = logging.getLogger(__name__)


class AgentPipeline:
    """
    Orchestrates the multi-agent pipeline for IT support.
    
    Handles:
    - Tool calling with OpenAI API
    - Agent handoffs
    - Conversation context management
    """
    
    def __init__(self):
        config = get_config()
        self.client = OpenAI(api_key=config.openai_api_key)
        self.model = config.openai_model
    
    async def process(
        self,
        agent: Any,
        user_input: str,
        context: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Any:
        """
        Process user input through the agent pipeline.
        
        Args:
            agent: The agent to process with
            user_input: User's message
            context: Optional context (organization_id, contact_id, etc.)
            conversation_history: Previous conversation turns (excluding current message)
        
        Returns:
            AgentResult with the response
        """
        from agents import AgentResult
        
        context = context or {}
        messages = self._build_messages(agent, user_input, context, conversation_history)
        tools = self._build_tools(agent)
        
        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else None,
            )
            
            message = response.choices[0].message
            
            # Handle tool calls
            if message.tool_calls:
                tool_results = await self._execute_tool_calls(agent, message.tool_calls)
                pairing_result = None
                pairing_tool_calls = []

                # If device lookup succeeded and user requested remote connection, create pairing code
                for tool_call, result in zip(message.tool_calls, tool_results):
                    if tool_call.function.name == "get_device_by_name_for_org":
                        user_text = (user_input or "").lower()
                        remote_requested = any(
                            phrase in user_text
                            for phrase in (
                                "remote",
                                "connect",
                                "pairing code",
                                "6-digit",
                                "six digit",
                                "code",
                            )
                        ) or bool(context.get("remote_connect_requested"))
                        if not remote_requested:
                            continue

                        match = re.search(r"device_id:\s*(\d+)", str(result))
                        if match and context.get("contact_id") and context.get("organization_id"):
                            device_id = int(match.group(1))
                            pairing_tool = agent.get_tool_by_name("create_remote_pairing_code")
                            if pairing_tool:
                                pairing_result = pairing_tool(
                                    contact_id=context.get("contact_id"),
                                    device_id=device_id,
                                    organization_id=context.get("organization_id"),
                                )
                                pairing_tool_calls.append({
                                    "type": "function",
                                    "function": {
                                        "name": "create_remote_pairing_code",
                                        "arguments": json.dumps({
                                            "contact_id": context.get("contact_id"),
                                            "device_id": device_id,
                                            "organization_id": context.get("organization_id"),
                                        })
                                    }
                                })

                if pairing_result:
                    return AgentResult(
                        output=str(pairing_result),
                        agent_name=agent.name,
                        tool_calls=([tc.model_dump() for tc in message.tool_calls] if message.tool_calls else []) + pairing_tool_calls,
                        handoff_to=None,
                    )
                
                # Add tool results to messages and get final response
                messages.append(message)
                for tool_call, result in zip(message.tool_calls, tool_results):
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result,
                    })
                
                # Get final response after tool execution
                final_response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                )
                
                output = final_response.choices[0].message.content or ""
            else:
                output = message.content or ""
            
            # Check for handoff keywords
            handoff_to = self._check_handoff(agent, output)
            
            return AgentResult(
                output=output,
                agent_name=agent.name,
                tool_calls=[tc.model_dump() for tc in message.tool_calls] if message.tool_calls else [],
                handoff_to=handoff_to,
            )
            
        except Exception as e:
            logger.error(f"Agent pipeline error: {e}")
            return AgentResult(
                output=f"I apologize, but I encountered an error. Please try again or say 'technician' to speak with a human.",
                agent_name=agent.name,
            )
    
    def _build_messages(
        self,
        agent: Any,
        user_input: str,
        context: Dict,
        conversation_history: Optional[List[Dict]] = None,
    ) -> List[Dict]:
        """Build the messages array for the API call."""
        system_prompt = agent.instructions
        
        # Add context to system prompt
        if context.get("organization_id"):
            system_prompt += f"\n\nCurrent organization_id: {context['organization_id']}"
        if context.get("organization_name"):
            system_prompt += f"\nOrganization: {context['organization_name']}"
        if context.get("contact_id"):
            system_prompt += f"\nContact ID: {context['contact_id']}"
        if context.get("contact_name"):
            system_prompt += f"\nCaller: {context['contact_name']}"
        
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        
        # Add conversation history (excluding the current message)
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current user message
        messages.append({"role": "user", "content": user_input})
        
        return messages
    
    def _build_tools(self, agent: Any) -> List[Dict]:
        """Build OpenAI tools array from agent tools."""
        tools = []
        
        for tool in agent.tools:
            if not hasattr(tool, "is_tool"):
                continue
            
            # Get function signature for parameters
            import inspect
            sig = inspect.signature(tool.__wrapped__ if hasattr(tool, "__wrapped__") else tool)
            
            properties = {}
            required = []
            
            for param_name, param in sig.parameters.items():
                if param_name == "self":
                    continue
                
                # Determine type
                param_type = "string"
                if param.annotation != inspect.Parameter.empty:
                    if param.annotation == int:
                        param_type = "integer"
                    elif param.annotation == float:
                        param_type = "number"
                    elif param.annotation == bool:
                        param_type = "boolean"
                
                properties[param_name] = {
                    "type": param_type,
                    "description": f"Parameter: {param_name}",
                }
                
                if param.default == inspect.Parameter.empty:
                    required.append(param_name)
            
            tools.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": required,
                    }
                }
            })
        
        return tools
    
    async def _execute_tool_calls(
        self,
        agent: Any,
        tool_calls: List,
    ) -> List[str]:
        """Execute tool calls and return results."""
        results = []
        
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            tool = agent.get_tool_by_name(function_name)
            if tool:
                try:
                    result = tool(**function_args)
                    results.append(str(result))
                except Exception as e:
                    logger.error(f"Tool execution error: {e}")
                    results.append(f"Error executing {function_name}: {str(e)}")
            else:
                results.append(f"Unknown tool: {function_name}")
        
        return results
    
    def _check_handoff(self, agent: Any, output: str) -> Optional[str]:
        """Check if the output indicates a handoff to another agent."""
        output_lower = output.lower()
        
        for handoff_agent in agent.handoffs:
            # Simple keyword matching for handoff detection
            if handoff_agent.name.lower() in output_lower:
                return handoff_agent.name
        
        return None

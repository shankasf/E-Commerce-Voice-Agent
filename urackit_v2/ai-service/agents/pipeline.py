"""
Agent Pipeline - Orchestrates multi-agent conversations.

Uses OpenAI's API for chat completions with tool calling.
Manages agent handoffs and conversation flow.
"""

import json
import logging
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
    ) -> Any:
        """
        Process user input through the agent pipeline.
        
        Args:
            agent: The agent to process with
            user_input: User's message
            context: Optional context (organization_id, contact_id, etc.)
        
        Returns:
            AgentResult with the response
        """
        from agents import AgentResult
        
        context = context or {}
        messages = self._build_messages(agent, user_input, context)
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
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ]
    
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

"""
Agent Pipeline - Orchestrates multi-agent conversations.

Uses OpenAI's API for chat completions with tool calling.
Manages agent handoffs and conversation flow.
"""

import asyncio
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
        memory: Optional[Any] = None,
        max_tool_rounds: int = 10,
    ) -> Any:
        """
        Process user input through the agent pipeline with autonomous tool execution.

        Args:
            agent: The agent to process with
            user_input: User's message
            context: Optional context (organization_id, contact_id, etc.)
            memory: Optional ConversationMemory object for history
            max_tool_rounds: Maximum number of tool call rounds (prevents infinite loops)

        Returns:
            AgentResult with the response
        """
        from agents import AgentResult

        context = context or {}
        messages = self._build_messages(agent, user_input, context, memory)
        tools = self._build_tools(agent)
        all_tool_calls = []

        try:
            # Agentic loop - keep going until AI provides a final response or max rounds
            for round_num in range(max_tool_rounds):
                logger.info(f"[PIPELINE] Round {round_num + 1}: Making OpenAI API call...")

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=tools if tools else None,
                    tool_choice="auto" if tools else None,
                )

                message = response.choices[0].message
                logger.info(f"[PIPELINE] Round {round_num + 1}: Has tool_calls={bool(message.tool_calls)}, has_content={bool(message.content)}")

                # If no tool calls, we have the final response
                if not message.tool_calls:
                    output = message.content or ""
                    logger.info(f"[PIPELINE] Final response (no tools): {output[:200]}..." if len(output) > 200 else f"[PIPELINE] Final response: {output}")
                    break

                # Execute tool calls
                logger.info(f"[PIPELINE] Executing {len(message.tool_calls)} tool calls...")
                tool_results = await self._execute_tool_calls(agent, message.tool_calls, memory)

                # Track all tool calls for the result
                all_tool_calls.extend([tc.model_dump() for tc in message.tool_calls])

                # Log tool results
                for i, res in enumerate(tool_results):
                    preview = res[:300] + "..." if len(res) > 300 else res
                    logger.info(f"[PIPELINE] Tool result {i}: {preview}")

                # Add assistant message with tool calls to conversation
                messages.append(message)

                # Add tool results to conversation
                for tool_call, result in zip(message.tool_calls, tool_results):
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result,
                    })

                # If the AI provided content alongside tool calls, that's intermediate output
                if message.content:
                    logger.info(f"[PIPELINE] Intermediate output: {message.content[:200]}...")

            else:
                # Hit max rounds without final response
                logger.warning(f"[PIPELINE] Hit max tool rounds ({max_tool_rounds}), forcing response")
                output = message.content if message.content else "I've completed my analysis. Let me know if you need anything else."

            # Check for handoff keywords
            handoff_to = self._check_handoff(agent, output)

            return AgentResult(
                output=output,
                agent_name=agent.name,
                tool_calls=all_tool_calls,
                handoff_to=handoff_to,
            )

        except Exception as e:
            logger.error(f"Agent pipeline error: {e}", exc_info=True)
            return AgentResult(
                output=f"I apologize, but I encountered an error. Please try again or say 'technician' to speak with a human.",
                agent_name=agent.name,
            )
    
    def _build_messages(
        self,
        agent: Any,
        user_input: str,
        context: Dict,
        memory: Optional[Any] = None,
    ) -> List[Dict]:
        """Build the messages array for the API call."""
        system_prompt = agent.instructions

        # Add context to system prompt
        if context.get("organization_id"):
            system_prompt += f"\n\nCurrent organization_id: {context['organization_id']}"
        if context.get("organization_name"):
            system_prompt += f"\nOrganization: {context['organization_name']}"
        if context.get("contact_id"):
            system_prompt += f"\nContact ID (user_id): {context['contact_id']}"
        if context.get("contact_name"):
            system_prompt += f"\nCaller: {context['contact_name']}"
        if context.get("session_id"):
            system_prompt += f"\nChat Session ID: {context['session_id']}"

        # Add critical reminder about device_id
        system_prompt += "\n\nIMPORTANT: When calling generate_device_connection_code, you MUST use the exact device_id from get_user_devices. Do NOT use device_id=1 or any other guessed value."

        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if memory is provided
        if memory and hasattr(memory, 'get_recent_turns'):
            recent_turns = memory.get_recent_turns(10)  # Last 10 turns
            for turn in recent_turns:
                messages.append({
                    "role": turn.role,
                    "content": turn.content,
                })

        # Add current user input
        messages.append({"role": "user", "content": user_input})

        return messages
    
    def _build_tools(self, agent: Any) -> List[Dict]:
        """Build OpenAI tools array from agent tools."""
        tools = []

        # Custom parameter descriptions for critical tools
        # These help OpenAI understand what values to use
        custom_param_descriptions = {
            "generate_device_connection_code": {
                "user_id": "The contact_id from context (user's ID)",
                "organization_id": "The organization_id from context",
                "device_id": "CRITICAL: Must be the exact device_id value from get_user_devices response. Do NOT guess or use 1.",
                "chat_session_id": "The current chat session ID from the session context",
            },
            "get_user_devices": {
                "user_id": "The contact_id from context (user's ID)",
                "organization_id": "The organization_id from context",
            },
            # Device command tools - all use session_id which is the chat_session_id
            "get_system_info": {
                "session_id": "The Chat Session ID from context (use the session_id value from system prompt)",
            },
            "check_disk_space": {
                "session_id": "The Chat Session ID from context",
            },
            "check_network_status": {
                "session_id": "The Chat Session ID from context",
            },
            "get_running_processes": {
                "session_id": "The Chat Session ID from context",
            },
            "check_event_logs": {
                "session_id": "The Chat Session ID from context",
                "log_name": "Log to query - System, Application, or Security",
                "max_entries": "Maximum entries to retrieve (default 50)",
            },
            "restart_windows_service": {
                "session_id": "The Chat Session ID from context",
                "service_name": "Name of the Windows service to restart",
            },
            "flush_dns_cache": {
                "session_id": "The Chat Session ID from context",
            },
            "clear_print_queue": {
                "session_id": "The Chat Session ID from context",
                "printer_name": "Optional specific printer name",
            },
            "kill_process": {
                "session_id": "The Chat Session ID from context",
                "process_name": "Name of the process to kill",
                "process_id": "Process ID (PID) to kill",
            },
            "reboot_device": {
                "session_id": "The Chat Session ID from context",
            },
            "check_device_connection": {
                "session_id": "The Chat Session ID from context",
            },
            "execute_device_command": {
                "session_id": "The Chat Session ID from context",
                "command_type": "Type of command to execute",
                "description": "Human-readable description of what this command does",
                "parameters": "Optional parameters for the command",
            },
        }

        for tool in agent.tools:
            if not hasattr(tool, "is_tool"):
                continue

            # Get function signature for parameters
            import inspect
            sig = inspect.signature(tool.__wrapped__ if hasattr(tool, "__wrapped__") else tool)

            properties = {}
            required = []
            tool_name = tool.name

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

                # Use custom description if available, otherwise generic
                if tool_name in custom_param_descriptions and param_name in custom_param_descriptions[tool_name]:
                    description = custom_param_descriptions[tool_name][param_name]
                else:
                    description = f"Parameter: {param_name}"

                properties[param_name] = {
                    "type": param_type,
                    "description": description,
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
        memory: Optional[Any] = None,
    ) -> List[str]:
        """Execute tool calls and return results."""
        import re

        results = []

        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)

            # DEBUG: Log exactly what OpenAI is sending as tool call arguments
            print(f"\n{'='*60}")
            print(f"[DEBUG] TOOL CALL FROM OPENAI:")
            print(f"[DEBUG]   function_name = {function_name}")
            print(f"[DEBUG]   function_args = {json.dumps(function_args, indent=2)}")
            print(f"{'='*60}\n")
            logger.info(f"[DEBUG] Tool call: {function_name} with args: {function_args}")

            tool = agent.get_tool_by_name(function_name)
            if tool:
                try:
                    # Check if tool is async and await it properly
                    result = tool(**function_args)
                    if asyncio.iscoroutine(result):
                        result = await result
                    result_str = str(result)
                    results.append(result_str)

                    # Extract and save context from tool results
                    if memory:
                        self._extract_context_from_result(result_str, memory)

                except Exception as e:
                    logger.error(f"Tool execution error: {e}")
                    results.append(f"Error executing {function_name}: {str(e)}")
            else:
                results.append(f"Unknown tool: {function_name}")

        return results

    def _extract_context_from_result(self, result: str, memory: Any) -> None:
        """
        Extract IDs and important data from tool results and save to context.
        Looks for patterns like 'organization_id: 123' and saves them.
        """
        import re

        # Patterns to extract
        # NOTE: device_id is intentionally NOT extracted here because it varies per request
        # and should come directly from tool results, not be cached in context
        patterns = {
            "organization_id": r"organization_id:\s*(\d+)",
            "contact_id": r"contact_id:\s*(\d+)",
            "ticket_id": r"[Tt]icket\s+ID:\s*(\d+)",
            "organization_name": r"Organization Name:\s*(.+?)(?:\n|$)",
            "contact_name": r"Contact found:\s*(.+?)(?:\n|$)",
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, result)
            if match:
                value = match.group(1).strip()
                # Convert to int if it's a numeric ID
                if key.endswith("_id"):
                    try:
                        value = int(value)
                    except ValueError:
                        pass

                memory.set_context(key, value)
                logger.info(f"Extracted context: {key} = {value}")
    
    def _check_handoff(self, agent: Any, output: str) -> Optional[str]:
        """Check if the output indicates a handoff to another agent."""
        output_lower = output.lower()
        
        for handoff_agent in agent.handoffs:
            # Simple keyword matching for handoff detection
            if handoff_agent.name.lower() in output_lower:
                return handoff_agent.name
        
        return None

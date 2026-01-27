"""
Agent Pipeline - Orchestrates multi-agent conversations.

Uses OpenAI's Responses API with GPT-5.2 for tool calling.
Manages agent handoffs and conversation flow.

Includes guardrails to prevent AI hallucination of options.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from openai import OpenAI

from config import get_config
from guardrails import ToolResultStore, ResponseValidator, get_tool_result_store

logger = logging.getLogger(__name__)


class AgentPipeline:
    """
    Orchestrates the multi-agent pipeline for IT support.

    Uses OpenAI Responses API for:
    - Agentic tool calling with automatic orchestration
    - Multi-turn conversations via previous_response_id
    - Better reasoning with GPT-5.2
    """

    def __init__(self):
        config = get_config()
        self.client = OpenAI(api_key=config.openai_api_key)
        self.model = config.openai_model
        self.reasoning_effort = config.reasoning_effort

        # Initialize guardrails for hallucination prevention
        self.tool_store = get_tool_result_store()
        self.validator = ResponseValidator(self.tool_store)

    async def process(
        self,
        agent: Any,
        user_input: str,
        context: Optional[Dict] = None,
        memory: Optional[Any] = None,
        max_tool_rounds: int = 10,
    ) -> Any:
        """
        Process user input through the agent pipeline using Responses API.

        The Responses API handles tool orchestration automatically, but we
        still need to execute custom function tools ourselves.

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
        tools = self._build_tools(agent)
        all_tool_calls = []

        # Get session ID for guardrails
        session_id = context.get("session_id") or context.get("chat_session_id") or "default_session"

        # Build system instructions
        instructions = self._build_instructions(agent, context)

        # Build initial input from conversation history and current message
        input_items = self._build_input(user_input, context, memory)

        try:
            # CRITICAL: Get previous response ID from memory for multi-turn context
            # This allows OpenAI to maintain conversation state server-side
            previous_response_id = None
            if memory and hasattr(memory, 'last_response_id'):
                previous_response_id = memory.last_response_id
                if previous_response_id:
                    logger.info(f"[PIPELINE] Continuing conversation with previous_response_id={previous_response_id[:30]}...")

            # Agentic loop - handle function calls that need our execution
            for round_num in range(max_tool_rounds):
                logger.info(f"[PIPELINE] Round {round_num + 1}: Making Responses API call...")

                # Build request parameters
                request_params = {
                    "model": self.model,
                    "input": input_items,
                    "tools": tools if tools else None,
                    "instructions": instructions,
                }

                # Add reasoning effort for GPT-5.2
                if self.reasoning_effort and self.reasoning_effort != "none":
                    request_params["reasoning"] = {"effort": self.reasoning_effort}

                # Continue from previous response if in multi-turn tool loop
                if previous_response_id:
                    request_params["previous_response_id"] = previous_response_id

                # Make the API call
                response = self.client.responses.create(**request_params)

                logger.info(f"[PIPELINE] Round {round_num + 1}: Response ID={response.id}, Status={response.status}")

                # Store response ID for potential continuation
                previous_response_id = response.id

                # Check for function calls that need our execution
                function_calls = self._extract_function_calls(response)

                if not function_calls:
                    # No function calls - we have the final response
                    output = self._extract_output_text(response)
                    logger.info(f"[PIPELINE] Final response: {output[:200]}..." if len(output) > 200 else f"[PIPELINE] Final response: {output}")
                    break

                # Execute function calls
                logger.info(f"[PIPELINE] Executing {len(function_calls)} function calls...")
                function_outputs = await self._execute_function_calls(agent, function_calls, memory, session_id)

                # Track all tool calls for the result
                all_tool_calls.extend(function_calls)

                # Build function call outputs for next request
                input_items = []
                for fc, output in zip(function_calls, function_outputs):
                    input_items.append({
                        "type": "function_call_output",
                        "call_id": fc["call_id"],
                        "output": output,
                    })

            else:
                # Hit max rounds without final response
                logger.warning(f"[PIPELINE] Hit max tool rounds ({max_tool_rounds}), using last response")
                output = self._extract_output_text(response) or "I've completed my analysis. Let me know if you need anything else."

            # GUARDRAILS: Validate AI response before sending to user
            validation = self.validator.validate_response(session_id, output)

            if not validation.is_valid:
                logger.warning(f"[GUARDRAILS] Hallucination detected! Violations: {[v.message for v in validation.violations]}")
                for violation in validation.violations:
                    logger.warning(f"[GUARDRAILS]   - {violation.type.value}: {violation.hallucinated_value}")

                # Use corrected response if available
                if validation.corrected_response:
                    logger.info(f"[GUARDRAILS] Using corrected response instead of AI output")
                    output = validation.corrected_response
            else:
                logger.info(f"[GUARDRAILS] Response validated successfully")

            # Check for handoff keywords
            handoff_to = self._check_handoff(agent, output)

            # CRITICAL: Save response ID to memory for next turn's context
            # This is what allows multi-turn conversations to work properly
            if memory and hasattr(memory, 'last_response_id') and previous_response_id:
                memory.last_response_id = previous_response_id
                logger.info(f"[PIPELINE] Saved response_id to memory for next turn: {previous_response_id[:30]}...")

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

    def _build_instructions(self, agent: Any, context: Dict) -> str:
        """Build the system instructions for the Responses API."""
        instructions = agent.instructions

        # Add context to instructions
        if context.get("organization_id"):
            instructions += f"\n\nCurrent organization_id: {context['organization_id']}"
        if context.get("organization_name"):
            instructions += f"\nOrganization: {context['organization_name']}"
        if context.get("contact_id"):
            instructions += f"\nContact ID (user_id): {context['contact_id']}"
        if context.get("contact_name"):
            instructions += f"\nCaller: {context['contact_name']}"
        if context.get("session_id"):
            instructions += f"\nChat Session ID: {context['session_id']}"

        # Add critical reminder about device_id
        instructions += "\n\nIMPORTANT: When calling generate_device_connection_code, you MUST use the exact device_id from get_user_devices. Do NOT use device_id=1 or any other guessed value."

        return instructions

    def _build_input(
        self,
        user_input: str,
        context: Dict,
        memory: Optional[Any] = None,
    ) -> List[Dict]:
        """Build the input array for the Responses API."""
        input_items = []

        # Add conversation history if memory is provided
        if memory and hasattr(memory, 'get_recent_turns'):
            recent_turns = memory.get_recent_turns(10)  # Last 10 turns
            for turn in recent_turns:
                input_items.append({
                    "role": turn.role,
                    "content": turn.content,
                })

        # Add current user input
        input_items.append({
            "role": "user",
            "content": user_input,
        })

        return input_items

    def _build_tools(self, agent: Any) -> List[Dict]:
        """Build tools array for the Responses API."""
        tools = []

        # Custom parameter descriptions for critical tools
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
            "get_system_info": {
                "session_id": "The Chat Session ID from context",
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

                # Use custom description if available
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

            # Responses API tool format
            tools.append({
                "type": "function",
                "name": tool.name,
                "description": tool.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                }
            })

        return tools

    def _extract_function_calls(self, response: Any) -> List[Dict]:
        """Extract function calls from Responses API response."""
        function_calls = []

        # The Responses API returns output items which may include function_call types
        if hasattr(response, 'output') and response.output:
            for item in response.output:
                if hasattr(item, 'type') and item.type == 'function_call':
                    function_calls.append({
                        "call_id": item.call_id,
                        "name": item.name,
                        "arguments": item.arguments,
                    })

        return function_calls

    def _extract_output_text(self, response: Any) -> str:
        """Extract the text output from Responses API response."""
        # The Responses API provides output_text for convenience
        if hasattr(response, 'output_text') and response.output_text:
            return response.output_text

        # Fallback: look through output items for message content
        if hasattr(response, 'output') and response.output:
            for item in response.output:
                if hasattr(item, 'type') and item.type == 'message':
                    if hasattr(item, 'content') and item.content:
                        for content_block in item.content:
                            if hasattr(content_block, 'text'):
                                return content_block.text

        return ""

    async def _execute_function_calls(
        self,
        agent: Any,
        function_calls: List[Dict],
        memory: Optional[Any],
        session_id: str,
    ) -> List[str]:
        """Execute function calls and return results."""
        results = []

        for fc in function_calls:
            function_name = fc["name"]
            function_args = json.loads(fc["arguments"]) if isinstance(fc["arguments"], str) else fc["arguments"]

            # DEBUG: Log tool call
            print(f"\n{'='*60}")
            print(f"[DEBUG] TOOL CALL FROM RESPONSES API:")
            print(f"[DEBUG]   function_name = {function_name}")
            print(f"[DEBUG]   function_args = {json.dumps(function_args, indent=2)}")
            print(f"{'='*60}\n")
            logger.info(f"[DEBUG] Tool call: {function_name} with args: {function_args}")

            tool = agent.get_tool_by_name(function_name)
            if tool:
                try:
                    # GUARDRAIL: Prevent duplicate ticket creation
                    if function_name == "create_ticket_smart":
                        existing_tickets = self.tool_store.get_tickets_created(session_id)
                        if existing_tickets:
                            logger.warning(f"[GUARDRAILS] Blocking duplicate ticket creation! Session already has tickets: {existing_tickets}")
                            warning_msg = (
                                f"DUPLICATE TICKET BLOCKED: A ticket (#{existing_tickets[-1]}) was already created for this issue. "
                                f"Do NOT create another ticket. The user's response ('yes', 'no', etc.) is about TROUBLESHOOTING, "
                                f"not a new issue. Proceed to troubleshooting or end the call."
                            )
                            results.append(warning_msg)
                            continue

                    # GUARDRAIL: Warn if prepare_ticket_context is called after ticket exists
                    if function_name == "prepare_ticket_context":
                        existing_tickets = self.tool_store.get_tickets_created(session_id)
                        if existing_tickets:
                            logger.warning(f"[GUARDRAILS] prepare_ticket_context called after ticket #{existing_tickets[-1]} exists!")
                            warning_msg = (
                                f"WARNING: A ticket (#{existing_tickets[-1]}) already exists for this session. "
                                f"You should NOT be starting a new ticket flow. The user's message is likely about "
                                f"troubleshooting the existing issue, not reporting a new one. "
                                f"Ask clarifying questions or proceed with troubleshooting."
                            )
                            results.append(warning_msg)
                            continue

                    result = tool(**function_args)
                    if asyncio.iscoroutine(result):
                        result = await result
                    result_str = str(result)
                    results.append(result_str)

                    # Store tool results for guardrails validation
                    self.tool_store.save_result(session_id, function_name, result_str)

                    # Extract and save context from tool results
                    if memory:
                        self._extract_context_from_result(result_str, memory)

                    # Log result preview
                    preview = result_str[:300] + "..." if len(result_str) > 300 else result_str
                    logger.info(f"[PIPELINE] Tool result: {preview}")

                except Exception as e:
                    logger.error(f"Tool execution error: {e}")
                    results.append(f"Error executing {function_name}: {str(e)}")
            else:
                results.append(f"Unknown tool: {function_name}")

        return results

    def _extract_context_from_result(self, result: str, memory: Any) -> None:
        """Extract IDs and important data from tool results and save to context."""
        import re

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
            if handoff_agent.name.lower() in output_lower:
                return handoff_agent.name

        return None


# Backwards compatibility alias
class Runner:
    """Alias for AgentPipeline for backwards compatibility."""

    @staticmethod
    async def run(
        agent: Any,
        text: str,
        context: Optional[Dict] = None,
        memory: Optional[Any] = None,
    ) -> Any:
        pipeline = AgentPipeline()
        return await pipeline.process(agent, text, context, memory)

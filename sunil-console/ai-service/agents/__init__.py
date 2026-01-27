"""
Agent framework for URackIT AI Service.

Provides base classes and utilities for building AI agents.
Uses the OpenAI Agents SDK for tool calling and handoffs.
"""

import asyncio
import inspect
from functools import wraps
from typing import Any, Callable, List, Optional


def function_tool(func: Callable) -> Callable:
    """
    Decorator to mark a function as a tool for AI agents.

    Preserves function metadata and marks it as callable by agents.
    The OpenAI Agents SDK will use the function's docstring as the tool description.
    Works with both sync and async functions.
    """
    # Check if the function is async
    is_async = asyncio.iscoroutinefunction(func)

    if is_async:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await func(*args, **kwargs)

        async_wrapper.name = getattr(func, "name", func.__name__)
        async_wrapper.description = (func.__doc__ or "").strip()
        async_wrapper.is_tool = True
        async_wrapper.__wrapped__ = func  # Keep reference to original
        return async_wrapper
    else:
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        wrapper.name = getattr(func, "name", func.__name__)
        wrapper.description = (func.__doc__ or "").strip()
        wrapper.is_tool = True
        wrapper.__wrapped__ = func  # Keep reference to original
        return wrapper


class Handoff:
    """
    Represents a handoff configuration to another agent.

    Handoffs are represented as tools to the LLM with names like transfer_to_<agent_name>.
    """

    def __init__(
        self,
        agent: "Agent",
        tool_name_override: Optional[str] = None,
        tool_description_override: Optional[str] = None,
        on_handoff: Optional[Callable] = None,
        input_type: Optional[Any] = None,
        input_filter: Optional[Callable] = None,
    ):
        self.agent = agent
        self.tool_name_override = tool_name_override
        self.tool_description_override = tool_description_override
        self.on_handoff = on_handoff
        self.input_type = input_type
        self.input_filter = input_filter

    @staticmethod
    def default_tool_name(agent_name: str) -> str:
        """Generate default tool name: transfer_to_<agent_name>"""
        # Convert agent name to snake_case
        name = agent_name.lower().replace(" ", "_").replace("-", "_")
        return f"transfer_to_{name}"

    @staticmethod
    def default_tool_description(agent: "Agent") -> str:
        """Generate default tool description."""
        desc = f"Transfer to {agent.name}"
        if agent.handoff_description:
            desc += f". {agent.handoff_description}"
        return desc

    @property
    def tool_name(self) -> str:
        """Get the tool name for this handoff."""
        if self.tool_name_override:
            return self.tool_name_override
        return self.default_tool_name(self.agent.name)

    @property
    def tool_description(self) -> str:
        """Get the tool description for this handoff."""
        if self.tool_description_override:
            return self.tool_description_override
        return self.default_tool_description(self.agent)


def handoff(
    agent: "Agent",
    tool_name_override: Optional[str] = None,
    tool_description_override: Optional[str] = None,
    on_handoff: Optional[Callable] = None,
    input_type: Optional[Any] = None,
    input_filter: Optional[Callable] = None,
) -> Handoff:
    """
    Create a handoff configuration to another agent.

    Args:
        agent: The agent to hand off to
        tool_name_override: Override the default tool name (transfer_to_<agent_name>)
        tool_description_override: Override the default tool description
        on_handoff: Callback function executed when handoff is invoked
        input_type: Type of input expected by the handoff (optional)
        input_filter: Filter function for the input received by the next agent

    Returns:
        Handoff configuration object
    """
    return Handoff(
        agent=agent,
        tool_name_override=tool_name_override,
        tool_description_override=tool_description_override,
        on_handoff=on_handoff,
        input_type=input_type,
        input_filter=input_filter,
    )


class Agent:
    """
    Base agent class for building specialized IT support agents.

    Each agent has:
    - name: Unique identifier
    - handoff_description: Description for when to hand off to this agent
    - instructions: System prompt defining behavior
    - tools: List of callable functions
    - handoffs: List of other agents or Handoff objects it can transfer to
    """

    def __init__(
        self,
        name: str,
        instructions: str = "",
        tools: Optional[List[Callable]] = None,
        handoffs: Optional[List[Any]] = None,  # Can be Agent or Handoff
        handoff_description: Optional[str] = None,
    ):
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        self.handoffs = handoffs or []
        self.handoff_description = handoff_description or ""
    
    def get_tool_definitions(self) -> List[dict]:
        """Get OpenAI-compatible tool definitions."""
        definitions = []
        for tool in self.tools:
            if hasattr(tool, "is_tool") and tool.is_tool:
                definitions.append({
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                    }
                })
        return definitions
    
    def get_tool_by_name(self, name: str) -> Optional[Callable]:
        """Find a tool by name."""
        for tool in self.tools:
            if hasattr(tool, "name") and tool.name == name:
                return tool
        return None

    def get_handoff_definitions(self) -> List[dict]:
        """Get OpenAI-compatible handoff tool definitions."""
        definitions = []
        for h in self.handoffs:
            # Convert Agent to Handoff if needed
            if isinstance(h, Agent):
                h = Handoff(agent=h)

            definitions.append({
                "type": "function",
                "function": {
                    "name": h.tool_name,
                    "description": h.tool_description,
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            })
        return definitions

    def get_handoff_by_tool_name(self, tool_name: str) -> Optional["Agent"]:
        """Find a handoff agent by tool name."""
        for h in self.handoffs:
            if isinstance(h, Agent):
                h = Handoff(agent=h)
            if h.tool_name == tool_name:
                return h.agent
        return None

    def get_all_tool_definitions(self) -> List[dict]:
        """Get all tool definitions including handoffs."""
        return self.get_tool_definitions() + self.get_handoff_definitions()


class AgentResult:
    """Result from running an agent."""
    
    def __init__(
        self,
        output: str,
        agent_name: str = "",
        tool_calls: Optional[List[dict]] = None,
        handoff_to: Optional[str] = None,
    ):
        self.final_output = output
        self.agent_name = agent_name
        self.tool_calls = tool_calls or []
        self.handoff_to = handoff_to


class Runner:
    """
    Simple runner for executing agent responses.
    
    In production, this integrates with OpenAI's API for tool calling.
    """
    
    @staticmethod
    async def run(
        agent: Agent,
        text: str,
        session: Optional[Any] = None,
        context: Optional[dict] = None,
        memory: Optional[Any] = None,
    ) -> AgentResult:
        """
        Run the agent with the given input text.

        Args:
            agent: The agent to run
            text: User input text
            session: Optional session for persistence
            context: Optional context dictionary
            memory: Optional ConversationMemory for history

        Returns:
            AgentResult with the final output
        """
        # Import here to avoid circular dependency
        from .pipeline import AgentPipeline

        pipeline = AgentPipeline()
        return await pipeline.process(agent, text, context, memory)


def set_trace_processors(processors: list) -> None:
    """Set trace processors for debugging/monitoring."""
    # Stub for LangSmith or other tracing integration
    pass

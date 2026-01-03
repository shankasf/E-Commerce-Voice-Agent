"""
Base Agent - Foundation for all specialized agents
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class AgentContext:
    """Context shared between agents"""
    problem_description: str
    user_role: str
    device_id: str
    diagnostic_data: Dict
    tools_executed: List[Dict]
    solution_steps: List[str]
    current_phase: str  # "diagnostic", "remediation", "verification"
    platform_info: str = ""  # Platform info: "windows", "linux", "ubuntu", etc.
    permission_denials: List[Dict] = None  # Track tools denied due to permissions

    def __post_init__(self):
        """Initialize mutable default values"""
        if self.permission_denials is None:
            self.permission_denials = []


class BaseAgent(ABC):
    """
    Base class for all agents in the multi-agent system.
    Each agent has a specific responsibility and can communicate with others.
    """
    
    def __init__(self, name: str, llm_service, tool_registry):
        self.name = name
        self.llm_service = llm_service
        self.tool_registry = tool_registry
    
    @abstractmethod
    async def analyze(self, context: AgentContext) -> List[Dict]:
        """
        Analyze the context and return a plan of tools to execute.
        Returns list of tool calls with name, arguments, role, and reason.
        """
        pass
    
    @abstractmethod
    def get_available_tools(self, role: str) -> List[str]:
        """
        Get list of tools available to this agent for the given role.
        """
        pass
    
    def validate_tool_plan(self, tool_plan: List[Dict], role: str, context: Optional[AgentContext] = None) -> List[Dict]:
        """
        Validate that all tools in the plan are allowed for the role.

        Args:
            tool_plan: List of tool calls to validate
            role: User role (ai_agent, human_agent, admin)
            context: Optional AgentContext to track permission denials

        Returns:
            List of validated tool calls
        """
        validated_plan = []
        available_tools = self.get_available_tools(role)

        for tool_call in tool_plan:
            tool_name = tool_call.get("name")
            if tool_name in available_tools:
                validated_plan.append(tool_call)
            else:
                # Track permission denial
                print(f"Warning: Tool {tool_name} not available for role {role}, skipping")

                if context is not None:
                    # Get tool metadata to provide detailed error
                    tool_metadata = self.tool_registry.get_tool_metadata(tool_name)
                    required_role = tool_metadata.min_role.value if tool_metadata else "unknown"

                    context.permission_denials.append({
                        "tool_name": tool_name,
                        "user_role": role,
                        "required_role": required_role,
                        "reason": tool_call.get("reason", "No reason provided"),
                        "description": tool_call.get("description", "")
                    })

        return validated_plan


"""
Agent Orchestrator - Coordinates multiple agents in a multi-agent system
"""

from typing import List, Dict, Optional
from .base_agent import AgentContext
from .diagnostic_agent import DiagnosticAgent
from .remediation_agent import RemediationAgent
from .verification_agent import VerificationAgent
from .tool_registry import ToolRegistry


class AgentOrchestrator:
    """
    Orchestrates the multi-agent system workflow:
    1. Diagnostic Agent analyzes problem
    2. Remediation Agent creates action plan
    3. Verification Agent confirms success (optional)
    """
    
    def __init__(self, llm_service, tool_registry: ToolRegistry):
        self.tool_registry = tool_registry
        self.diagnostic_agent = DiagnosticAgent(llm_service, tool_registry)
        self.remediation_agent = RemediationAgent(llm_service, tool_registry)
        self.verification_agent = VerificationAgent(llm_service, tool_registry)
    
    async def create_execution_plan(
        self,
        problem_description: str,
        user_role: str = "ai_agent",
        device_id: Optional[str] = None,
        platform_info: Optional[str] = None  # "windows" or "linux" or "ubuntu"
    ) -> tuple[List[Dict], AgentContext]:
        """
        Create a complete execution plan using the multi-agent system.

        Returns:
            tuple: (tool_plan, context) - Tool calls and agent context with permission denials
        """
        # Initialize context
        context = AgentContext(
            problem_description=problem_description,
            user_role=user_role,
            device_id=device_id or "",
            diagnostic_data={},
            tools_executed=[],
            solution_steps=[],
            current_phase="diagnostic",
            platform_info=platform_info or ""  # Add platform info to context
        )
        
        # Phase 1: Diagnostic (may return empty array if not needed)
        print(f"[Orchestrator] Phase 1: Diagnostic Agent analyzing problem...")
        diagnostic_plan = await self.diagnostic_agent.analyze(context)
        print(f"[Orchestrator] Diagnostic plan: {len(diagnostic_plan)} tools (may be 0 if not needed)")
        
        # Phase 2: Remediation
        print(f"[Orchestrator] Phase 2: Remediation Agent creating action plan...")
        remediation_plan = await self.remediation_agent.analyze(context)
        print(f"[Orchestrator] Remediation plan: {len(remediation_plan)} tools")
        
        # Combine plans: diagnostics first (if any), then remediation
        complete_plan = diagnostic_plan + remediation_plan
        
        # Let the LLM agents handle all logic intelligently - no hardcoded patterns
        # The remediation agent should have already created the appropriate plan based on user intent
        # We only validate and ensure the plan is complete
        
        print(f"[Orchestrator] Complete plan: {len(complete_plan)} tools")
        for i, tool in enumerate(complete_plan, 1):
            print(f"  {i}. {tool.get('name')}: {tool.get('reason', 'No reason')}")

        # Log permission denials if any
        if context.permission_denials:
            print(f"[Orchestrator] Permission denials: {len(context.permission_denials)} tool(s) denied")
            for denial in context.permission_denials:
                print(f"  - {denial['tool_name']} (requires {denial['required_role']}, user has {denial['user_role']})")

        return complete_plan, context
    
    def get_available_tools_for_role(self, role: str) -> List[str]:
        """Get all available tools for a role"""
        return self.tool_registry.get_tool_names_for_role(role)


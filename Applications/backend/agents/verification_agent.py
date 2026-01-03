"""
Verification Agent - Specialized in verifying that remediation was successful
"""

from typing import List, Dict
from .base_agent import BaseAgent, AgentContext
from .tool_registry import ToolRegistry


class VerificationAgent(BaseAgent):
    """
    Verification Agent verifies that remediation actions were successful.
    """
    
    def __init__(self, llm_service, tool_registry: ToolRegistry):
        super().__init__("VerificationAgent", llm_service, tool_registry)
        self.tool_registry = tool_registry
    
    async def analyze(self, context: AgentContext) -> List[Dict]:
        """
        Create a verification plan to confirm remediation success.
        """
        # For now, verification is simple - just re-run relevant diagnostics
        # In future, this could be more sophisticated
        
        # If restart was executed, verify system is back up (but this happens after restart)
        # For other remediations, re-check the relevant diagnostic
        
        return []  # Verification happens in orchestrator
    
    def get_available_tools(self, role: str) -> List[str]:
        """Get verification tools (diagnostic tools)"""
        all_tools = self.tool_registry.get_tools_for_role(role)
        return [t.name for t in all_tools if t.name.startswith("check_")]



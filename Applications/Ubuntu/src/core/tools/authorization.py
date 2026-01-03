"""
Role-based authorization engine for tool execution.
"""
import logging
from typing import Optional
from datetime import datetime

from ..models import (
    Role,
    RiskLevel,
    ToolPolicy,
    AuthorizationDecision,
)

logger = logging.getLogger(__name__)


class AuthorizationEngine:
    """Handles authorization decisions for tool execution."""

    def __init__(self, idle_checker=None):
        """
        Initialize authorization engine.

        Args:
            idle_checker: Optional idle time checker service
        """
        self._idle_checker = idle_checker

    def authorize(
        self,
        tool_name: str,
        policy: ToolPolicy,
        role: Role,
        is_user_idle: Optional[bool] = None,
    ) -> AuthorizationDecision:
        """
        Authorize a tool execution request.

        Args:
            tool_name: Name of the tool
            policy: Tool's policy configuration
            role: Role making the request
            is_user_idle: Optional override for idle check

        Returns:
            AuthorizationDecision
        """
        # Check role hierarchy
        if role < policy.min_role:
            return AuthorizationDecision(
                allowed=False,
                reason=f"Insufficient privileges. Required: {policy.min_role.name}, "
                f"Provided: {role.name}",
            )

        # Check idle requirement
        if policy.requires_idle:
            if is_user_idle is None and self._idle_checker:
                is_user_idle = self._idle_checker.is_user_idle()

            if is_user_idle is False:
                return AuthorizationDecision(
                    allowed=False,
                    reason=f"Tool '{tool_name}' requires user to be idle",
                )

        # Check if confirmation is needed
        if policy.requires_confirmation:
            # For now, we allow it but flag that confirmation should be sought
            # The dispatcher will handle this with notifications
            logger.info(
                f"Tool '{tool_name}' requires confirmation "
                f"(risk={policy.risk_level.value})"
            )

        # Authorization granted
        return AuthorizationDecision(
            allowed=True,
            reason=f"Authorized for role {role.name}",
        )

    def check_role_hierarchy(self, role: Role, required_role: Role) -> bool:
        """
        Check if role meets minimum requirement.

        Args:
            role: Actual role
            required_role: Required minimum role

        Returns:
            True if role is sufficient
        """
        return role >= required_role

    def is_elevated_risk(self, policy: ToolPolicy) -> bool:
        """
        Check if tool has elevated risk level.

        Args:
            policy: Tool policy

        Returns:
            True if risk level is ELEVATED
        """
        return policy.risk_level == RiskLevel.ELEVATED

    def requires_sudo(self, policy: ToolPolicy) -> bool:
        """
        Check if tool requires sudo privileges.

        Args:
            policy: Tool policy

        Returns:
            True if sudo is required
        """
        return policy.requires_sudo

    def get_timeout(self, policy: ToolPolicy) -> int:
        """
        Get timeout for tool execution.

        Args:
            policy: Tool policy

        Returns:
            Timeout in seconds
        """
        return policy.timeout_seconds

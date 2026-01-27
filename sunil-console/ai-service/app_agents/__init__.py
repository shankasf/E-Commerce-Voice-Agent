"""
Specialist Agents for URackIT AI Service.

This package contains the consolidated agent architecture:
- triage_agent: Entry point, verification, ticket creation, routing
- device_support_agent: Hardware & connectivity (computer, network, printer, phone)
- account_support_agent: Email, security, ticket management
- data_lookup_agent: Organization data queries

Handoff structure:
- triage_agent -> specialists (defined in triage_agent.py)
- specialists -> triage_agent (configured here for back-routing)
"""

from agents import handoff

# Import specialist agents first (they don't have handoffs yet)
from .device_support_agent import device_support_agent
from .account_support_agent import account_support_agent
from .data_lookup_agent import data_lookup_agent

# Import triage agent (it imports specialists and sets its own handoffs)
from .triage_agent import triage_agent


# ============================================
# Configure Back-Routes (specialists -> triage)
# ============================================
# Specialists can hand back to triage when issue is resolved
# or when user has a different type of request

device_support_agent.handoffs = [
    handoff(
        agent=triage_agent,
        tool_description_override="Transfer back to triage agent when the device issue is resolved, user has a different request, or needs to be routed elsewhere."
    )
]

account_support_agent.handoffs = [
    handoff(
        agent=triage_agent,
        tool_description_override="Transfer back to triage agent when the issue is resolved or user has a different request."
    ),
    handoff(
        agent=device_support_agent,
        tool_description_override="Transfer to device support if user's issue turns out to be hardware/connectivity related."
    )
]

data_lookup_agent.handoffs = [
    handoff(
        agent=triage_agent,
        tool_description_override="Transfer back to triage agent when lookup is complete or user has a different request."
    ),
    handoff(
        agent=device_support_agent,
        tool_description_override="Transfer to device support if user needs help with a device issue after lookup."
    ),
    handoff(
        agent=account_support_agent,
        tool_description_override="Transfer to account support if user needs help with email/security/tickets after lookup."
    )
]


__all__ = [
    "triage_agent",
    "device_support_agent",
    "account_support_agent",
    "data_lookup_agent",
]

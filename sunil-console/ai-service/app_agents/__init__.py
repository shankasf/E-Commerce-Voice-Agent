"""
Specialist Agents for URackIT AI Service.

This package contains all the specialized agents for IT support.
Handoffs are configured here after all agents are imported to avoid circular imports.
"""

from .triage_agent import triage_agent
from .device_agent import device_agent
from .ticket_agent import ticket_agent
from .email_agent import email_agent
from .computer_agent import computer_agent
from .network_agent import network_agent
from .printer_agent import printer_agent
from .phone_agent import phone_agent
from .security_agent import security_agent
from .lookup_agent import lookup_agent


# ============================================
# Configure Handoffs (after all imports)
# ============================================

# Triage agent can hand off to all specialist agents
triage_agent.handoffs = [
    email_agent,
    computer_agent,
    network_agent,
    printer_agent,
    phone_agent,
    security_agent,
    ticket_agent,
    device_agent,
    lookup_agent,
]

# All specialist agents can hand back to triage
email_agent.handoffs = [triage_agent]
computer_agent.handoffs = [triage_agent]
network_agent.handoffs = [triage_agent]
printer_agent.handoffs = [triage_agent]
phone_agent.handoffs = [triage_agent]
security_agent.handoffs = [triage_agent]
ticket_agent.handoffs = [triage_agent]
device_agent.handoffs = [triage_agent]
lookup_agent.handoffs = [triage_agent]


__all__ = [
    "triage_agent",
    "device_agent",
    "ticket_agent",
    "email_agent",
    "computer_agent",
    "network_agent",
    "printer_agent",
    "phone_agent",
    "security_agent",
    "lookup_agent",
]

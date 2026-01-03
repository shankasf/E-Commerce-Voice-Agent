"""
Specialist Agents for URackIT AI Service.

This package contains all the specialized agents for IT support.
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

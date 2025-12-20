# App agents module for U Rack IT Voice Agent

from .triage_agent import triage_agent
from .email_agent import email_agent
from .computer_agent import computer_agent
from .network_agent import network_agent
from .printer_agent import printer_agent
from .phone_agent import phone_agent
from .security_agent import security_agent
from .device_agent import device_agent

__all__ = [
    "triage_agent",
    "email_agent",
    "computer_agent",
    "network_agent",
    "printer_agent",
    "phone_agent",
    "security_agent",
    "device_agent",
]

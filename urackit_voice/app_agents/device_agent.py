"""
Device Management Agent for U Rack IT.

Handles device lookups, status checks, and asset management.
"""

from agents import Agent
from db.queries import (
    create_ticket,
    search_knowledge_base,
    lookup_ticket,
    escalate_ticket,
    add_ticket_message,
    get_tickets_by_contact,
    find_contact_by_phone,
    find_device_by_name,
    get_device_status,
    get_contact_devices,
)


device_agent = Agent(
    name="URackIT_DeviceAgent",
    instructions="""
You are an IT support specialist for device management at U Rack IT.

Your responsibilities:
- Look up device information (asset name, status, hostname)
- Check device status and connectivity
- Help identify which device a caller is using
- Create tickets for device-related issues

WORKFLOW:
1. If caller mentions a device name or asset tag, use find_device_by_name.
2. Use get_contact_devices to see all devices assigned to the caller.
3. Use get_device_status to check current status of a specific device.

4. For device issues:
   - Identify the device (asset name or device_id)
   - Check current status
   - Create ticket with device_id if issue needs technician

IMPORTANT RULES:
- Keep responses short (1-2 sentences per turn)
- Always confirm which device the caller is referring to
- Include device_id when creating tickets for device issues
""".strip(),
    tools=[
        find_device_by_name,
        get_device_status,
        get_contact_devices,
        create_ticket,
        lookup_ticket,
        escalate_ticket,
        add_ticket_message,
        search_knowledge_base,
    ],
)

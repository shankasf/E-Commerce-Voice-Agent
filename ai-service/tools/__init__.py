"""
Tools package for URackIT AI Service.

Consolidates all AI agent tools in one location.
"""

# Database query tools
from .database import (
    find_organization_by_ue_code,
    find_organization_by_name,
    create_organization,
    find_contact_by_phone,
    create_contact,
    get_contact_devices,
    find_device_by_name,
    get_device_status,
    get_device_details,
    get_organization_devices,
    create_ticket,
    lookup_ticket,
    get_tickets_by_contact,
    get_tickets_by_organization,
    update_ticket_status,
    add_ticket_message,
    escalate_ticket,
    get_ticket_statuses,
    get_ticket_priorities,
    lookup_organization_data,
    get_organization_locations,
    get_organization_contacts,
    get_organization_summary,
    get_device_by_name_for_org,
    get_contact_by_name_for_org,
    get_account_manager,
    transfer_to_human,
)

# Device command execution tools
from .device import (
    execute_powershell,
    check_device_connection,
)

# Device connection/pairing tools
from .device_connection import (
    generate_device_connection_code,
    get_user_devices,
    DeviceInfo,
    GetUserDevicesResult,
    GenerateCodeResult,
)

# Knowledge base tools
from .knowledge import (
    lookup_support_info,
    reload_knowledge_base,
    get_knowledge_base_stats,
)

__all__ = [
    # Database tools
    "find_organization_by_ue_code",
    "find_organization_by_name",
    "create_organization",
    "find_contact_by_phone",
    "create_contact",
    "get_contact_devices",
    "find_device_by_name",
    "get_device_status",
    "get_device_details",
    "get_organization_devices",
    "create_ticket",
    "lookup_ticket",
    "get_tickets_by_contact",
    "get_tickets_by_organization",
    "update_ticket_status",
    "add_ticket_message",
    "escalate_ticket",
    "get_ticket_statuses",
    "get_ticket_priorities",
    "lookup_organization_data",
    "get_organization_locations",
    "get_organization_contacts",
    "get_organization_summary",
    "get_device_by_name_for_org",
    "get_contact_by_name_for_org",
    "get_account_manager",
    "transfer_to_human",
    # Device tools
    "execute_powershell",
    "check_device_connection",
    # Device connection tools
    "generate_device_connection_code",
    "get_user_devices",
    "DeviceInfo",
    "GetUserDevicesResult",
    "GenerateCodeResult",
    # Knowledge tools
    "lookup_support_info",
    "reload_knowledge_base",
    "get_knowledge_base_stats",
]

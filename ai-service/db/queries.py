"""
Database queries for URackIT AI Service.

Provides function tools for AI agents to interact with the database.
All functions are decorated with @function_tool to make them callable by agents.
"""

from datetime import datetime
from typing import Optional
import logging
import requests

from agents import function_tool
from lib.api_client import get_api_client

logger = logging.getLogger(__name__)


def _format_request_error(err: Exception) -> str:
    """Return user-friendly message from a requests error."""
    body = ""
    if isinstance(err, requests.exceptions.RequestException) and err.response is not None:
        try:
            body = err.response.text or ""
        except Exception:
            body = ""
    return body or str(err)


# ============================================
# Organization Management
# ============================================

@function_tool
def find_organization_by_ue_code(u_e_code: int) -> str:
    """
    Look up an organization by its U&E code (Unique Enterprise Code).
    This is the PRIMARY method to identify callers - always ask for U&E code first.
    
    Args:
        u_e_code: The unique enterprise code (4-digit number, e.g., 3450, 3629)
    
    Returns:
        Organization details if found, or error message if not found.
    """
    try:
        # Normalize inputs (the model may pass a string despite the schema being integer).
        if isinstance(u_e_code, str):
            normalized = "".join(ch for ch in u_e_code.strip() if ch.isdigit())
            if not normalized:
                return "U&E code must be numeric. Please say only the digits of your U&E code."
            u_e_code = int(normalized)

        api_client = get_api_client()
        rows = api_client.get("/api/agents/organizations", params={"u_e_code": u_e_code})
        
        # Handle both array and single object responses
        if not rows:
            return f"No organization found with U&E code: {u_e_code}. Please ask the caller to confirm their code."
        
        # API Gateway returns array, take first item
        if isinstance(rows, list):
            org = rows[0] if rows else None
        else:
            org = rows
        
        if not org:
            return f"No organization found with U&E code: {u_e_code}. Please ask the caller to confirm their code."
        
        manager = org.get("manager", {}) or {}
        
        return (
            f"Organization verified successfully!\n"
            f"Organization Name: {org.get('name')}\n"
            f"U&E Code: {org.get('u_e_code')}\n"
            f"Account Manager: {manager.get('full_name', 'Not Assigned')}\n"
            f"organization_id: {org.get('organization_id')}"
        )
    except Exception as e:
        return f"Error looking up organization: {_format_request_error(e)}"


@function_tool
def find_organization_by_name(name: str) -> str:
    """
    Look up an organization by name.
    """
    if not name.strip():
        return "Organization name is required."
    
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/organizations", params={"name": name.strip()})
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No organization found with name: {name}"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = f"Found {len(rows)} organization(s):\n"
        for org in rows:
            manager = org.get("manager", {}) or {}
            result += f"- {org.get('name')} (U&E: {org.get('u_e_code')}) - Manager: {manager.get('full_name', 'N/A')}\n"
        
        return result
    except Exception as e:
        return f"Error looking up organization: {_format_request_error(e)}"


@function_tool
def create_organization(name: str, u_e_code: int) -> str:
    """
    Create a new organization.
    
    Args:
        name: Organization name
        u_e_code: Unique enterprise code
    """
    if not name.strip():
        return "Organization name is required."
    
    try:
        api_client = get_api_client()
        result = api_client.post("/api/agents/organizations", data={
            "name": name.strip(),
            "u_e_code": u_e_code,
        })
        
        if result:
            org_id = result.get("organization_id")
            return f"Organization created successfully. organization_id: {org_id}"
        return "Failed to create organization."
    except Exception as e:
        return f"Error creating organization: {_format_request_error(e)}"


# ============================================
# Contact Management
# ============================================

@function_tool
def find_contact_by_phone(phone: str) -> str:
    """
    Look up a contact by their phone number.
    """
    if not phone.strip():
        return "Phone number is required."
    
    try:
        clean_phone = phone.strip().replace("-", "").replace("(", "").replace(")", "").replace(" ", "")
        
        api_client = get_api_client()
        rows = api_client.get("/api/agents/contacts", params={"phone": clean_phone})
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No contact found with phone: {phone}"
        
        # Take first result
        if isinstance(rows, list):
            contact = rows[0]
        else:
            contact = rows
        
        org = contact.get("organization", {}) or {}
        
        return (
            f"Contact found: {contact.get('full_name')}\n"
            f"Organization: {org.get('name', 'N/A')}\n"
            f"Phone: {contact.get('phone')}\n"
            f"Email: {contact.get('email', 'N/A')}\n"
            f"contact_id: {contact.get('contact_id')}\n"
            f"organization_id: {contact.get('organization_id')}"
        )
    except Exception as e:
        return f"Error looking up contact: {_format_request_error(e)}"


@function_tool
def create_contact(
    full_name: str,
    phone: str,
    organization_id: int,
    email: str = "",
) -> str:
    """
    Create a new contact record.
    
    Args:
        full_name: Contact's full name
        phone: Contact's phone number
        organization_id: ID of the organization
        email: Contact's email address (optional)
    """
    if not full_name.strip():
        return "Full name is required."
    if not phone.strip():
        return "Phone number is required."
    if not organization_id:
        return "organization_id is required."
    
    try:
        contact_data = {
            "full_name": full_name.strip(),
            "phone": phone.strip(),
            "organization_id": organization_id,
        }
        if email.strip():
            contact_data["email"] = email.strip()
        
        api_client = get_api_client()
        result = api_client.post("/api/agents/contacts", data=contact_data)
        
        if result:
            return (
                f"Contact created successfully.\n"
                f"contact_id: {result.get('contact_id')}\n"
                f"organization_id: {organization_id}"
            )
        return "Failed to create contact."
    except Exception as e:
        return f"Error creating contact: {_format_request_error(e)}"


@function_tool
def get_contact_devices(contact_id: int) -> str:
    """
    Get all devices assigned to a contact.
    """
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/devices", params={"contact_id": contact_id})
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No devices assigned to contact {contact_id}"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = f"Found {len(rows)} device(s):\n"
        for d in rows:
            result += f"- {d.get('asset_name')} ({d.get('status')}) - device_id: {d.get('device_id')}\n"
        
        return result
    except Exception as e:
        return f"Error getting devices: {_format_request_error(e)}"


# ============================================
# Device Management
# ============================================

@function_tool
def find_device_by_name(asset_name: str) -> str:
    """
    Look up a device by its asset name.
    """
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/devices", params={"asset_name": asset_name.strip()})
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No device found with name: {asset_name}"
        
        # Take first result
        if isinstance(rows, list):
            device = rows[0]
        else:
            device = rows
        
        org = device.get("organization", {}) or {}
        
        return (
            f"Device: {device.get('asset_name')}\n"
            f"Status: {device.get('status')}\n"
            f"Hostname: {device.get('host_name', 'N/A')}\n"
            f"IP: {device.get('public_ip', 'N/A')}\n"
            f"Organization: {org.get('name', 'N/A')}\n"
            f"device_id: {device.get('device_id')}"
        )
    except Exception as e:
        return f"Error finding device: {_format_request_error(e)}"


@function_tool
def get_device_status(device_id: int) -> str:
    """
    Get the current status and details of a device.
    """
    try:
        api_client = get_api_client()
        device = api_client.get("/api/agents/devices", params={"device_id": device_id, "status_only": "true"})
        
        if not device:
            return f"Device {device_id} not found."
        
        return (
            f"Device: {device.get('asset_name')}\n"
            f"Status: {device.get('status')}\n"
            f"Hostname: {device.get('host_name', 'N/A')}\n"
            f"Last Reported: {device.get('last_reported_time', 'N/A')}\n"
            f"Uptime: {device.get('system_uptime', 'N/A')}\n"
            f"Last User: {device.get('last_logged_in_by', 'N/A')}"
        )
    except Exception as e:
        return f"Error getting device: {_format_request_error(e)}"


@function_tool
def get_device_details(device_id: int) -> str:
    """
    Get full details of a device including hardware specs.
    """
    try:
        api_client = get_api_client()
        d = api_client.get("/api/agents/devices", params={"device_id": device_id})
        
        if not d:
            return f"Device {device_id} not found."
        
        org = d.get("organization", {}) or {}
        loc = d.get("location", {}) or {}
        
        return (
            f"=== Device Details ===\n"
            f"Asset Name: {d.get('asset_name')}\n"
            f"Hostname: {d.get('host_name', 'N/A')}\n"
            f"Status: {d.get('status')}\n"
            f"Organization: {org.get('name', 'N/A')}\n"
            f"Location: {loc.get('name', 'N/A')}\n"
            f"Public IP: {d.get('public_ip', 'N/A')}\n"
            f"Gateway IP: {d.get('gateway_ip', 'N/A')}\n"
            f"OS: {d.get('os_name', 'N/A')}\n"
            f"Memory: {d.get('total_memory', 'N/A')}\n"
            f"Last Reported: {d.get('last_reported_time', 'N/A')}\n"
            f"device_id: {d.get('device_id')}"
        )
    except Exception as e:
        return f"Error getting device details: {_format_request_error(e)}"


@function_tool
def create_remote_pairing_code(
    contact_id: int,
    device_id: int,
    organization_id: int,
    session_id: Optional[str] = None,
) -> str:
    """
    Create a 6-digit pairing code for remote troubleshooting.
    """
    try:
        api_client = get_api_client()
        payload = {
            "user_id": contact_id,
            "device_id": device_id,
            "organization_id": organization_id,
        }
        if session_id:
            payload["session_id"] = session_id

        result = api_client.post(
            "/api/client-application/device-connections/create-six-digit-code",
            data=payload,
        )

        if not result or not result.get("success"):
            return f"Failed to create pairing code. Error: {result.get('error', 'Unknown error')}"

        code = result.get("code")
        session_id = result.get("session_id")
        expires = result.get("expires_in_seconds")

        return (
            f"Your 6-digit pairing code is {code}. "
            f"Expires in: {expires} seconds\n"
            "Please open the Windows app and enter this code to connect."
        )

    except Exception as e:
        return f"Error creating pairing code: {_format_request_error(e)}"


@function_tool
def get_organization_devices(organization_id: int) -> str:
    """
    Get ALL devices for an organization.
    Use this when user asks about devices for their organization.
    """
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/devices", params={"organization_id": organization_id})
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No devices found for organization {organization_id}"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        online = sum(1 for d in rows if d.get('status') == 'ONLINE')
        offline = len(rows) - online
        
        result = f"Found {len(rows)} device(s) ({online} online, {offline} offline):\n\n"
        for d in rows:
            loc = d.get("location", {}) or {}
            status_icon = "✅" if d.get('status') == 'ONLINE' else "❌"
            result += f"{status_icon} {d.get('asset_name')} - {d.get('status')} @ {loc.get('name', 'Unknown')}\n"
        
        return result
    except Exception as e:
        return f"Error getting devices: {_format_request_error(e)}"


# ============================================
# Ticket Management
# ============================================

@function_tool
def create_ticket(
    subject: str,
    description: str,
    contact_id: int,
    organization_id: int = 0,
    priority: str = "Medium",
    device_id: int = 0,
) -> str:
    """
    Create a new support ticket.
    
    Args:
        subject: Brief description of the issue
        description: Detailed description of the problem
        contact_id: ID of the contact creating the ticket (REQUIRED)
        organization_id: ID of the organization
        priority: Critical, High, Medium, or Low
        device_id: ID of the affected device (optional)
    """
    if not subject.strip():
        return "Subject is required."
    if not contact_id:
        return "contact_id is required."
    
    try:
        api_client = get_api_client()
        
        # Get organization from contact if not provided
        if not organization_id:
            contacts = api_client.get("/api/agents/contacts", params={"contact_id": contact_id})
            if contacts:
                if isinstance(contacts, list):
                    organization_id = contacts[0].get("organization_id")
                else:
                    organization_id = contacts.get("organization_id")
        
        if not organization_id:
            return "Could not determine organization."
        
        # Map priority to ID
        priority_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        priority_id = priority_map.get(priority.lower().strip(), 2)
        
        ticket_data = {
            "subject": subject.strip(),
            "description": description.strip() or None,
            "contact_id": contact_id,
            "organization_id": organization_id,
            "status_id": 1,  # Open
            "priority_id": priority_id,
            "requires_human_agent": False,
        }
        if device_id:
            ticket_data["device_id"] = device_id
        
        result = api_client.post("/api/agents/tickets", data=ticket_data)
        if result:
            return f"Ticket created successfully. Ticket ID: {result.get('ticket_id')}"
        return "Failed to create ticket."
    except Exception as e:
        return f"Error creating ticket: {_format_request_error(e)}"


@function_tool
def lookup_ticket(ticket_id: int) -> str:
    """
    Look up a ticket by its ID.
    """
    try:
        api_client = get_api_client()
        ticket = api_client.get("/api/agents/tickets", params={"ticket_id": ticket_id})
        
        if not ticket:
            return f"Ticket {ticket_id} not found."
        
        contact = ticket.get("contact", {}) or {}
        org = ticket.get("organization", {}) or {}
        status = ticket.get("status", {}) or {}
        priority = ticket.get("priority", {}) or {}
        
        return (
            f"Ticket #{ticket_id}\n"
            f"Subject: {ticket.get('subject')}\n"
            f"Status: {status.get('name', 'Unknown')}\n"
            f"Priority: {priority.get('name', 'Unknown')}\n"
            f"Description: {ticket.get('description', 'N/A')}\n"
            f"Contact: {contact.get('full_name', 'N/A')}\n"
            f"Organization: {org.get('name', 'N/A')}\n"
            f"Created: {ticket.get('created_at')}"
        )
    except Exception as e:
        return f"Error looking up ticket: {_format_request_error(e)}"


@function_tool
def get_tickets_by_contact(contact_id: int) -> str:
    """
    Get all tickets for a specific contact.
    """
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/tickets", params={"contact_id": contact_id})
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No tickets found for contact {contact_id}"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = f"Found {len(rows)} ticket(s):\n"
        for t in rows:
            status = t.get("status", {}) or {}
            priority = t.get("priority", {}) or {}
            result += f"- #{t.get('ticket_id')}: {t.get('subject')} [{status.get('name')}]\n"
        
        return result
    except Exception as e:
        return f"Error getting tickets: {_format_request_error(e)}"


@function_tool
def get_tickets_by_organization(organization_id: int) -> str:
    """
    Get all open tickets for an organization.
    """
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/tickets", params={"organization_id": organization_id})
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No open tickets for organization {organization_id}"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = f"Found {len(rows)} open ticket(s):\n"
        for t in rows:
            contact = t.get("contact", {}) or {}
            status = t.get("status", {}) or {}
            result += f"- #{t.get('ticket_id')}: {t.get('subject')} - {contact.get('full_name', 'Unknown')} [{status.get('name')}]\n"
        
        return result
    except Exception as e:
        return f"Error getting tickets: {_format_request_error(e)}"


@function_tool
def update_ticket_status(ticket_id: int, status: str) -> str:
    """
    Update the status of a ticket.
    
    Args:
        ticket_id: The ticket ID
        status: Open, In Progress, Awaiting Customer, Escalated, Resolved, Closed
    """
    status_map = {
        "open": 1,
        "in progress": 2,
        "awaiting customer": 3,
        "escalated": 4,
        "resolved": 5,
        "closed": 6
    }
    
    status_id = status_map.get(status.lower().strip())
    if not status_id:
        return f"Invalid status. Use: {', '.join(status_map.keys())}"
    
    try:
        api_client = get_api_client()
        update_data = {"status": status_id}
        if status_id in [5, 6]:
            update_data["closed_at"] = datetime.utcnow().isoformat()
        
        result = api_client.put("/api/agents/tickets", data=update_data, params={"ticket_id": ticket_id})
        if result:
            return f"Ticket {ticket_id} status updated to: {status}"
        return f"Failed to update ticket {ticket_id}"
    except Exception as e:
        return f"Error updating ticket: {_format_request_error(e)}"


@function_tool
def add_ticket_message(ticket_id: int, message: str) -> str:
    """
    Add a message/note to a ticket.
    """
    if not message.strip():
        return "Message content is required."
    
    try:
        api_client = get_api_client()
        result = api_client.post(f"/api/agents/tickets/{ticket_id}/messages", data={"message": message.strip()})
        
        if result:
            return f"Message added to ticket {ticket_id}"
        return "Failed to add message."
    except Exception as e:
        return f"Error adding message: {_format_request_error(e)}"


@function_tool
def escalate_ticket(ticket_id: int, reason: str, to_human: bool = True) -> str:
    """
    Escalate a ticket and mark for human agent.
    
    Args:
        ticket_id: The ticket ID
        reason: Reason for escalation
        to_human: Whether to mark as requiring human agent
    """
    try:
        api_client = get_api_client()
        result = api_client.put("/api/agents/tickets", data={
            "escalate": True,
            "reason": reason,
            "to_human": to_human
        }, params={"ticket_id": ticket_id})
        
        if result:
            return f"Ticket {ticket_id} escalated. Reason: {reason}"
        return f"Failed to escalate ticket {ticket_id}"
    except Exception as e:
        return f"Error escalating ticket: {_format_request_error(e)}"


@function_tool
def get_ticket_statuses() -> str:
    """Get all available ticket statuses."""
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/tickets/statuses")
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return "No statuses found."
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = "Available statuses:\n"
        for s in rows:
            result += f"- {s.get('name')} (ID: {s.get('status_id')})\n"
        return result
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_ticket_priorities() -> str:
    """Get all available ticket priorities."""
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/tickets/priorities")
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return "No priorities found."
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = "Available priorities:\n"
        for p in rows:
            result += f"- {p.get('name')} (ID: {p.get('priority_id')})\n"
        return result
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


# ============================================
# Organization Data Lookup (Universal)
# ============================================

@function_tool
def lookup_organization_data(
    organization_id: int,
    query_type: str,
    search_term: str = "",
) -> str:
    """
    Universal lookup tool for organization data.
    
    Args:
        organization_id: The organization ID from U&E code verification
        query_type: devices, locations, contacts, tickets, summary, find_device, find_contact
        search_term: Search term for find_* query types
    
    Returns:
        Requested data for the organization
    """
    query_type = query_type.lower().strip()
    
    try:
        if query_type == "devices":
            return get_organization_devices(organization_id)
        
        elif query_type == "locations":
            return get_organization_locations(organization_id)
        
        elif query_type == "contacts":
            return get_organization_contacts(organization_id)
        
        elif query_type == "tickets":
            return get_tickets_by_organization(organization_id)
        
        elif query_type == "summary":
            return get_organization_summary(organization_id)
        
        elif query_type == "find_device" and search_term:
            api_client = get_api_client()
            rows = api_client.get(f"/api/agents/organizations/{organization_id}/lookup", params={
                "query_type": "find_device",
                "search_term": search_term
            })
            if not rows or (isinstance(rows, list) and len(rows) == 0):
                return f"No device found matching '{search_term}' in this organization"
            if not isinstance(rows, list):
                rows = [rows]
            result = f"Found {len(rows)} matching device(s):\n"
            for d in rows:
                result += f"- {d.get('asset_name')} ({d.get('status')}) - {d.get('host_name', 'N/A')}\n"
            return result
        
        elif query_type == "find_contact" and search_term:
            return get_contact_by_name_for_org(search_term, organization_id)
        
        else:
            return f"Unknown query type: {query_type}. Use: devices, locations, contacts, tickets, summary"
    
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_organization_locations(organization_id: int) -> str:
    """Get all locations for an organization."""
    try:
        api_client = get_api_client()
        rows = api_client.get(f"/api/agents/organizations/{organization_id}/locations")
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No locations found for organization {organization_id}"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = f"Found {len(rows)} location(s):\n"
        for loc in rows:
            result += f"- {loc.get('name')} ({loc.get('location_type', 'Office')})\n"
        return result
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_organization_contacts(organization_id: int) -> str:
    """Get all contacts for an organization."""
    try:
        api_client = get_api_client()
        rows = api_client.get(f"/api/agents/organizations/{organization_id}/contacts")
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No contacts found for organization {organization_id}"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = f"Found {len(rows)} contact(s):\n"
        for c in rows:
            result += f"- {c.get('full_name')} - {c.get('phone', 'N/A')}\n"
        return result
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_organization_summary(organization_id: int) -> str:
    """Get a summary overview of an organization."""
    try:
        api_client = get_api_client()
        summary = api_client.get(f"/api/agents/organizations/{organization_id}/summary")
        
        if not summary:
            return f"Organization {organization_id} not found."
        
        return (
            f"=== Organization Summary ===\n"
            f"Name: {summary.get('name', 'Unknown')}\n"
            f"U&E Code: {summary.get('u_e_code', 'N/A')}\n"
            f"Account Manager: {summary.get('account_manager', {}).get('full_name', 'Not Assigned')}\n\n"
            f"Devices: {summary.get('device_count', 0)} ({summary.get('online_devices', 0)} online, {summary.get('offline_devices', 0)} offline)\n"
            f"Contacts: {summary.get('contact_count', 0)}\n"
            f"Open Tickets: {summary.get('open_tickets', 0)}"
        )
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_device_by_name_for_org(asset_name: str, organization_id: int) -> str:
    """Find a device by name within an organization."""
    try:
        api_client = get_api_client()
        rows = api_client.get("/api/agents/devices", params={
            "organization_id": organization_id,
            "asset_name": asset_name.strip()
        })
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No device found matching '{asset_name}' in this organization"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        # If exactly one match, return the device_id explicitly
        if len(rows) == 1:
            d = rows[0]
            return (
                f"Device: {d.get('asset_name')}\n"
                f"Status: {d.get('status')}\n"
                f"Hostname: {d.get('host_name', 'N/A')}\n"
                f"device_id: {d.get('device_id')}\n"
                f"organization_id: {organization_id}"
            )

        # Multiple matches - list with device_id for disambiguation
        result = f"Found {len(rows)} matching device(s):\n"
        for d in rows:
            result += (
                f"- {d.get('asset_name')} ({d.get('status')}) - "
                f"{d.get('host_name', 'N/A')} - device_id: {d.get('device_id')}\n"
            )
        return result
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_contact_by_name_for_org(name: str, organization_id: int) -> str:
    """Find a contact by name within an organization."""
    try:
        api_client = get_api_client()
        rows = api_client.get(f"/api/agents/organizations/{organization_id}/lookup", params={
            "query_type": "find_contact",
            "search_term": name.strip()
        })
        
        if not rows or (isinstance(rows, list) and len(rows) == 0):
            return f"No contact found matching '{name}' in this organization"
        
        # Ensure rows is a list
        if not isinstance(rows, list):
            rows = [rows]
        
        result = f"Found {len(rows)} matching contact(s):\n"
        for c in rows:
            result += f"- {c.get('full_name')} - {c.get('phone', 'N/A')} - {c.get('email', 'N/A')}\n"
        return result
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_account_manager(organization_id: int) -> str:
    """Get the account manager for an organization."""
    try:
        api_client = get_api_client()
        manager = api_client.get(f"/api/agents/organizations/{organization_id}/account-manager")
        
        if not manager:
            return "No account manager assigned"
        
        return (
            f"Account Manager: {manager.get('full_name', 'N/A')}\n"
            f"Email: {manager.get('email', 'N/A')}\n"
            f"Phone: {manager.get('phone', 'N/A')}"
        )
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


# ============================================
# Transfer to Human
# ============================================

@function_tool
def transfer_to_human(reason: str = "Customer requested") -> str:
    """
    Transfer the call to a human support agent.
    This will connect the caller to an available technician.
    
    Args:
        reason: Reason for transfer (e.g., "Customer requested", "Complex issue")
    """
    return f"TRANSFER_TO_HUMAN|{reason}"


# ============================================
# Remote Device Connection Management
# ============================================

@function_tool
def check_device_remote_connection(device_id: int) -> str:
    """
    Check if a device has an active remote connection for troubleshooting.
    
    Args:
        device_id: The device ID to check
    
    Returns:
        Connection status information
    """
    try:
        api_client = get_api_client()
        result = api_client.get(
            "/api/agents/device-connections",
            params={"device_id": device_id, "check_remote": "true"}
        )
        
        if not result or not result.get("has_active_connection"):
            return f"Device {device_id} is not connected for remote troubleshooting. Please ensure the MCP Agent is running on the device."
        
        connection_info = result.get("connection", {})
        remote_info = result.get("remote_connection", {})
        
        response = (
            f"Device {device_id} is connected for remote troubleshooting.\n"
            f"Connection ID: {connection_info.get('connection_id')}\n"
            f"Connected at: {connection_info.get('connected_at')}\n"
        )
        
        if remote_info and remote_info.get("connected"):
            response += f"Remote connection: Active\n"
        else:
            response += f"Remote connection: Not active\n"
        
        return response
    except Exception as e:
        return f"Error checking device connection: {str(e)}"

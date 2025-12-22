"""
Database queries for U Rack IT Ticket Management System.

Updated to work with the new ticket_management_schema.sql.
Provides function tools for AI agents to interact with the database.
"""

from datetime import datetime
from typing import Any, List, Optional
import requests

from agents import function_tool
from .database import db


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
def find_organization_by_name(name: str) -> str:
    """
    Look up an organization by name.
    Returns organization details including account manager.
    """
    if not name.strip():
        return "Organization name is required."

    # If the caller provided a numeric string, treat it as a U&E code.
    # This prevents accidental fallback behavior like find_organization_by_name({"name": "3450"}).
    stripped = name.strip()
    if stripped.isdigit():
        try:
            return find_organization_by_ue_code(int(stripped))
        except Exception:
            # Fall through to name search if parsing fails for any reason.
            pass
    
    try:
        params = {
            "name": f"ilike.*{name.strip()}*",
            "select": "organization_id,name,u_e_code,manager:manager_id(full_name,email,phone)",
            "limit": "1"
        }
        rows = db._make_request("GET", "organizations", params=params)
        
        if not rows:
            return f"No organization found with name: {name}"
        
        org = rows[0]
        manager = org.get("manager", {}) or {}
        
        return (
            f"Organization found: {org.get('name')}\n"
            f"U&E Code: {org.get('u_e_code')}\n"
            f"Account Manager: {manager.get('full_name', 'N/A')}\n"
            f"organization_id: {org.get('organization_id')}"
        )
    except Exception as e:
        return f"Error looking up organization: {_format_request_error(e)}"


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

        params = {
            "u_e_code": f"eq.{u_e_code}",
            "select": "organization_id,name,u_e_code,manager:manager_id(full_name,email,phone)"
        }
        rows = db._make_request("GET", "organizations", params=params)
        
        if not rows:
            return f"No organization found with U&E code: {u_e_code}. The code you provided was {u_e_code}. Please ask the caller to confirm or repeat their U&E code."
        
        org = rows[0]
        manager = org.get("manager", {}) or {}
        manager_name = manager.get('full_name', 'Not Assigned')
        manager_email = manager.get('email', 'N/A')
        manager_phone = manager.get('phone', 'N/A')
        
        return (
            f"Organization verified successfully!\n"
            f"Organization Name: {org.get('name')}\n"
            f"U&E Code: {org.get('u_e_code')}\n"
            f"Your Account Manager: {manager_name}\n"
            f"Manager Email: {manager_email}\n"
            f"Manager Phone: {manager_phone}\n"
            f"organization_id: {org.get('organization_id')}"
        )
    except Exception as e:
        return f"Error looking up organization by U&E code: {_format_request_error(e)}"


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
        org_data = {
            "name": name.strip(),
            "u_e_code": u_e_code,
        }
        result = db.insert("organizations", org_data)
        if result:
            org_id = result[0].get("organization_id")
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
    Returns contact details and organization information if found.
    """
    if not phone.strip():
        return "Phone number is required."
    
    try:
        clean_phone = phone.strip().replace("-", "").replace("(", "").replace(")", "").replace(" ", "")
        
        params = {
            "or": f"(phone.ilike.*{clean_phone}*,phone.ilike.*{phone.strip()}*)",
            "select": "contact_id,organization_id,full_name,email,phone,organization:organization_id(name,u_e_code)"
        }
        rows = db._make_request("GET", "contacts", params=params)
        
        if not rows:
            return f"No contact found with phone number: {phone}"
        
        contact = rows[0]
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
    organization_name: str = "",
    email: str = "",
) -> str:
    """
    Create a new contact record. If organization_name is provided and doesn't exist,
    it will be created automatically with a generated U&E code.
    
    Args:
        full_name: Contact's full name
        phone: Contact's phone number
        organization_name: Name of the organization
        email: Contact's email address
    """
    if not full_name.strip():
        return "Full name is required."
    if not phone.strip():
        return "Phone number is required."
    
    try:
        organization_id = None
        
        if organization_name.strip():
            # Search for existing organization
            org_rows = db._make_request(
                "GET", "organizations",
                params={"name": f"ilike.*{organization_name.strip()}*", "limit": "1"}
            )
            
            if org_rows:
                organization_id = org_rows[0].get("organization_id")
            else:
                # Generate unique U&E code
                import random
                u_e_code = random.randint(100000, 999999)
                
                new_org = db.insert("organizations", {
                    "name": organization_name.strip(),
                    "u_e_code": u_e_code
                })
                if new_org:
                    organization_id = new_org[0].get("organization_id")
        
        if not organization_id:
            return "Organization is required. Please provide organization_name."
        
        # Create contact
        contact_data = {
            "full_name": full_name.strip(),
            "phone": phone.strip(),
            "email": email.strip() if email.strip() else f"{full_name.lower().replace(' ', '.')}@{organization_name.lower().replace(' ', '')}.com",
            "organization_id": organization_id,
        }
        
        result = db.insert("contacts", contact_data)
        if result:
            contact = result[0]
            return (
                f"Contact created successfully.\n"
                f"contact_id: {contact.get('contact_id')}\n"
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
        params = {
            "contact_id": f"eq.{contact_id}",
            "unassigned_at": "is.null",
            "select": "device:device_id(device_id,asset_name,status,host_name)"
        }
        rows = db._make_request("GET", "contact_devices", params=params)
        
        if not rows:
            return f"No devices assigned to contact {contact_id}"
        
        devices = [r.get("device", {}) for r in rows if r.get("device")]
        result = f"Found {len(devices)} device(s):\n"
        for d in devices:
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
        params = {
            "asset_name": f"ilike.*{asset_name.strip()}*",
            "select": "device_id,asset_name,status,host_name,public_ip,organization:organization_id(name)"
        }
        rows = db._make_request("GET", "devices", params=params)
        
        if not rows:
            return f"No device found with name: {asset_name}"
        
        device = rows[0]
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
        device = db.get_by_id("devices", "device_id", device_id)
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
        organization_id: ID of the organization (auto-detected from contact if not provided)
        priority: Critical, High, Medium, or Low
        device_id: ID of the affected device (optional)
    """
    if not subject.strip():
        return "Subject is required."
    if not contact_id:
        return "contact_id is required. Use create_contact first for new callers."
    
    try:
        # Get organization from contact if not provided
        if not organization_id:
            contact = db.get_by_id("contacts", "contact_id", contact_id)
            if contact:
                organization_id = contact.get("organization_id")
        
        if not organization_id:
            return "Could not determine organization. Provide organization_id."
        
        # Look up priority ID
        priority_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        priority_id = priority_map.get(priority.lower().strip(), 2)
        
        ticket_data = {
            "subject": subject.strip(),
            "description": description.strip() or None,
            "contact_id": contact_id,
            "organization_id": organization_id,
            "device_id": device_id if device_id else None,
            "status_id": 1,  # Open
            "priority_id": priority_id,
            "requires_human_agent": False,
        }
        
        result = db.insert("support_tickets", ticket_data)
        if result:
            ticket = result[0]
            ticket_id = ticket.get("ticket_id")
            return f"Ticket created successfully. Ticket ID: {ticket_id}"
        return "Failed to create ticket."
    except Exception as e:
        return f"Error creating ticket: {_format_request_error(e)}"


@function_tool
def lookup_ticket(ticket_id: int) -> str:
    """
    Look up a ticket by its ID. Returns full ticket details.
    """
    try:
        params = {
            "ticket_id": f"eq.{ticket_id}",
            "select": "*,contact:contact_id(full_name,phone),organization:organization_id(name),status:status_id(name),priority:priority_id(name)"
        }
        rows = db._make_request("GET", "support_tickets", params=params)
        
        if not rows:
            return f"Ticket {ticket_id} not found."
        
        ticket = rows[0]
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
            f"Contact: {contact.get('full_name', 'N/A')} ({contact.get('phone', 'N/A')})\n"
            f"Organization: {org.get('name', 'N/A')}\n"
            f"Created: {ticket.get('created_at')}\n"
            f"Requires Human: {'Yes' if ticket.get('requires_human_agent') else 'No'}"
        )
    except Exception as e:
        return f"Error looking up ticket: {_format_request_error(e)}"


@function_tool
def get_tickets_by_contact(contact_id: int) -> str:
    """
    Get all tickets for a specific contact.
    """
    try:
        params = {
            "contact_id": f"eq.{contact_id}",
            "select": "ticket_id,subject,status:status_id(name),priority:priority_id(name),created_at",
            "order": "created_at.desc",
            "limit": "10"
        }
        rows = db._make_request("GET", "support_tickets", params=params)
        
        if not rows:
            return f"No tickets found for contact {contact_id}"
        
        result = f"Found {len(rows)} ticket(s):\n"
        for t in rows:
            status = t.get("status", {}) or {}
            priority = t.get("priority", {}) or {}
            result += f"- #{t.get('ticket_id')}: {t.get('subject')} [{status.get('name', 'Unknown')}] ({priority.get('name', 'Medium')})\n"
        
        return result
    except Exception as e:
        return f"Error getting tickets: {_format_request_error(e)}"


@function_tool
def get_tickets_by_organization(organization_id: int) -> str:
    """
    Get all open tickets for an organization.
    """
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "status_id": "in.(1,2,3,4)",  # Open, In Progress, Awaiting, Escalated
            "select": "ticket_id,subject,status:status_id(name),priority:priority_id(name),contact:contact_id(full_name)",
            "order": "created_at.desc",
            "limit": "20"
        }
        rows = db._make_request("GET", "support_tickets", params=params)
        
        if not rows:
            return f"No open tickets for organization {organization_id}"
        
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
        status: New status - Open, In Progress, Awaiting Customer, Escalated, Resolved, Closed
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
        update_data = {"status_id": status_id, "updated_at": datetime.utcnow().isoformat()}
        if status_id in [5, 6]:  # Resolved or Closed
            update_data["closed_at"] = datetime.utcnow().isoformat()
        
        result = db.update("support_tickets", update_data, {"ticket_id": f"eq.{ticket_id}"})
        if result:
            return f"Ticket {ticket_id} status updated to: {status}"
        return f"Failed to update ticket {ticket_id}"
    except Exception as e:
        return f"Error updating ticket: {_format_request_error(e)}"


@function_tool
def add_ticket_message(ticket_id: int, message: str, sender_type: str = "agent") -> str:
    """
    Add a message/note to a ticket.
    
    Args:
        ticket_id: The ticket ID
        message: The message content
        sender_type: 'agent' or 'contact'
    """
    if not message.strip():
        return "Message content is required."
    
    try:
        # For now, use a default bot agent (ID 1)
        message_data = {
            "ticket_id": ticket_id,
            "content": message.strip(),
            "message_type": "text",
        }
        
        if sender_type.lower() == "agent":
            message_data["sender_agent_id"] = 1  # Bot agent
        else:
            # Get contact_id from ticket
            ticket = db.get_by_id("support_tickets", "ticket_id", ticket_id)
            if ticket:
                message_data["sender_contact_id"] = ticket.get("contact_id")
        
        result = db.insert("ticket_messages", message_data)
        if result:
            return f"Message added to ticket {ticket_id}"
        return "Failed to add message."
    except Exception as e:
        return f"Error adding message: {_format_request_error(e)}"


@function_tool
def escalate_ticket(ticket_id: int, reason: str, to_human: bool = True) -> str:
    """
    Escalate a ticket and optionally mark for human agent.
    
    Args:
        ticket_id: The ticket ID
        reason: Reason for escalation
        to_human: Whether to mark as requiring human agent
    """
    try:
        # Update ticket status
        update_data = {
            "status_id": 4,  # Escalated
            "requires_human_agent": to_human,
            "updated_at": datetime.utcnow().isoformat()
        }
        db.update("support_tickets", update_data, {"ticket_id": f"eq.{ticket_id}"})
        
        # Create escalation record
        escalation_data = {
            "ticket_id": ticket_id,
            "from_agent_id": 1,  # Bot agent
            "reason": reason,
        }
        db.insert("ticket_escalations", escalation_data)
        
        if to_human:
            return f"Ticket {ticket_id} escalated and marked for human agent. Reason: {reason}"
        return f"Ticket {ticket_id} escalated. Reason: {reason}"
    except Exception as e:
        return f"Error escalating ticket: {_format_request_error(e)}"


@function_tool
def assign_ticket(ticket_id: int, agent_id: int, is_primary: bool = True) -> str:
    """
    Assign a ticket to a support agent.
    """
    try:
        assignment_data = {
            "ticket_id": ticket_id,
            "support_agent_id": agent_id,
            "is_primary": is_primary,
        }
        result = db.insert("ticket_assignments", assignment_data)
        
        # Update ticket status to In Progress
        db.update("support_tickets", {
            "status_id": 2,
            "updated_at": datetime.utcnow().isoformat()
        }, {"ticket_id": f"eq.{ticket_id}"})
        
        if result:
            return f"Ticket {ticket_id} assigned to agent {agent_id}"
        return "Failed to assign ticket."
    except Exception as e:
        return f"Error assigning ticket: {_format_request_error(e)}"


@function_tool
def get_available_agents() -> str:
    """
    Get list of available human support agents.
    """
    try:
        params = {
            "agent_type": "eq.Human",
            "is_available": "eq.true",
            "select": "support_agent_id,full_name,specialization,phone"
        }
        rows = db._make_request("GET", "support_agents", params=params)
        
        if not rows:
            return "No available human agents at the moment."
        
        result = f"Available agents ({len(rows)}):\n"
        for a in rows:
            result += f"- {a.get('full_name')} ({a.get('specialization', 'General')}) - ID: {a.get('support_agent_id')}\n"
        
        return result
    except Exception as e:
        return f"Error getting agents: {_format_request_error(e)}"


# ============================================
# Location Management
# ============================================

@function_tool
def get_organization_locations(organization_id: int) -> str:
    """
    Get ALL locations for an organization with COMPLETE details.
    Use this when user asks about locations, offices, sites.
    
    Args:
        organization_id: The organization ID from U&E code verification
    
    Returns:
        List of all locations with ALL columns including device counts.
    """
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "location_id,name,location_type,requires_human_agent,created_at,updated_at"
        }
        rows = db._make_request("GET", "locations", params=params)
        
        if not rows:
            return f"No locations found for organization {organization_id}"
        
        result = f"Found {len(rows)} location(s):\n\n"
        for loc in rows:
            result += f"=== {loc.get('name')} [location_id: {loc.get('location_id')}] ===\n"
            result += f"  Type: {loc.get('location_type', 'Office')}\n"
            result += f"  Requires Human Agent: {'Yes' if loc.get('requires_human_agent') else 'No'}\n"
            result += f"  Created At: {loc.get('created_at', 'N/A')}\n"
            result += f"  Updated At: {loc.get('updated_at', 'N/A')}\n"
            
            # Get device count for this location
            device_params = {
                "location_id": f"eq.{loc.get('location_id')}",
                "select": "device_id,status"
            }
            devices = db._make_request("GET", "devices", params=device_params)
            if devices:
                online = sum(1 for d in devices if d.get('status') == 'ONLINE')
                offline = len(devices) - online
                result += f"  Devices: {len(devices)} total ({online} online, {offline} offline)\n"
            else:
                result += f"  Devices: 0\n"
            result += "\n"
        
        return result
    except Exception as e:
        return f"Error getting locations: {_format_request_error(e)}"


@function_tool
def get_location_full_details(organization_id: int, location_id: int = None, location_name: str = None) -> str:
    """
    Get COMPLETE details for a specific location including all devices at that location.
    
    Args:
        organization_id: The organization ID from U&E code verification (REQUIRED)
        location_id: The location ID to look up (optional if location_name provided)
        location_name: The location name to search for (optional if location_id provided)
    
    Returns:
        Complete location information with ALL fields and devices at that location.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    
    if not location_id and not location_name:
        return "Please provide either location_id or location_name."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "location_id,name,location_type,requires_human_agent,created_at,updated_at"
        }
        
        if location_id:
            params["location_id"] = f"eq.{location_id}"
        elif location_name:
            params["name"] = f"ilike.*{location_name}*"
        
        rows = db._make_request("GET", "locations", params=params)
        
        if not rows:
            return f"No location found matching the criteria."
        
        loc = rows[0]
        
        result = f"=== Location Details: {loc.get('name')} ===\n\n"
        result += f"Location ID: {loc.get('location_id')}\n"
        result += f"Name: {loc.get('name')}\n"
        result += f"Type: {loc.get('location_type', 'Office')}\n"
        result += f"Requires Human Agent: {'Yes' if loc.get('requires_human_agent') else 'No'}\n"
        result += f"Created At: {loc.get('created_at', 'N/A')}\n"
        result += f"Updated At: {loc.get('updated_at', 'N/A')}\n\n"
        
        # Get all devices at this location
        device_params = {
            "location_id": f"eq.{loc.get('location_id')}",
            "select": (
                "device_id,asset_name,status,host_name,public_ip,"
                "device_type:device_type_id(name),"
                "os:os_id(name)"
            ),
            "order": "asset_name.asc"
        }
        devices = db._make_request("GET", "devices", params=device_params)
        
        if devices:
            online = sum(1 for d in devices if d.get('status') == 'ONLINE')
            offline = len(devices) - online
            result += f"--- Devices at this Location ({len(devices)}) ---\n"
            result += f"Online: {online} | Offline: {offline}\n\n"
            
            for d in devices:
                dtype = d.get("device_type", {}) or {}
                os_info = d.get("os", {}) or {}
                status = "ONLINE" if d.get('status') == 'ONLINE' else "OFFLINE"
                result += f"  {d.get('asset_name')} ({status})\n"
                if dtype.get('name'):
                    result += f"    Type: {dtype.get('name')}\n"
                if d.get('host_name'):
                    result += f"    Hostname: {d.get('host_name')}\n"
                if d.get('public_ip'):
                    result += f"    IP: {d.get('public_ip')}\n"
                if os_info.get('name'):
                    result += f"    OS: {os_info.get('name')}\n"
                result += "\n"
        else:
            result += "No devices at this location.\n"
        
        return result
    except Exception as e:
        return f"Error getting location details: {_format_request_error(e)}"


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
# Device Detail Lookups (for comprehensive device info)
# ============================================

@function_tool
def get_device_details(device_id: int) -> str:
    """
    Get comprehensive device details including manufacturer, model, OS, and specs.
    Use this when troubleshooting device-specific issues.
    
    Args:
        device_id: The device ID to look up
    """
    try:
        params = {
            "device_id": f"eq.{device_id}",
            "select": (
                "device_id,asset_name,status,host_name,public_ip,os_version,"
                "last_reported_time,total_memory,"
                "manufacturer:manufacturer_id(name),"
                "model:model_id(name),"
                "os:os_id(name),"
                "device_type:device_type_id(name),"
                "location:location_id(name),"
                "organization:organization_id(name)"
            )
        }
        rows = db._make_request("GET", "devices", params=params)
        
        if not rows:
            return f"No device found with ID: {device_id}"
        
        d = rows[0]
        manufacturer = d.get("manufacturer", {}) or {}
        model = d.get("model", {}) or {}
        os_info = d.get("os", {}) or {}
        device_type = d.get("device_type", {}) or {}
        location = d.get("location", {}) or {}
        org = d.get("organization", {}) or {}
        
        memory_gb = round(d.get("total_memory", 0) / (1024**3), 1) if d.get("total_memory") else "N/A"
        
        return (
            f"Device: {d.get('asset_name')} ({d.get('host_name', 'N/A')})\n"
            f"Status: {d.get('status')}\n"
            f"Type: {device_type.get('name', 'N/A')}\n"
            f"Manufacturer: {manufacturer.get('name', 'N/A')}\n"
            f"Model: {model.get('name', 'N/A')}\n"
            f"OS: {os_info.get('name', 'N/A')} {d.get('os_version', '')}\n"
            f"Memory: {memory_gb} GB\n"
            f"IP: {d.get('public_ip', 'N/A')}\n"
            f"Location: {location.get('name', 'N/A')}\n"
            f"Organization: {org.get('name', 'N/A')}\n"
            f"Last Seen: {d.get('last_reported_time', 'N/A')}"
        )
    except Exception as e:
        return f"Error getting device details: {_format_request_error(e)}"


@function_tool
def get_ticket_statuses() -> str:
    """
    Get all available ticket statuses.
    Use this to show status options to callers.
    """
    try:
        params = {"select": "status_id,name,description", "order": "status_id"}
        rows = db._make_request("GET", "ticket_statuses", params=params)
        
        if not rows:
            return "No ticket statuses configured."
        
        result = "Available Ticket Statuses:\n"
        for s in rows:
            result += f"  {s.get('status_id')}. {s.get('name')} - {s.get('description', '')}\n"
        return result
    except Exception as e:
        return f"Error getting statuses: {_format_request_error(e)}"


@function_tool
def get_ticket_priorities() -> str:
    """
    Get all available ticket priorities.
    Use this to explain priority levels to callers.
    """
    try:
        params = {"select": "priority_id,name,description", "order": "priority_id"}
        rows = db._make_request("GET", "ticket_priorities", params=params)
        
        if not rows:
            return "No ticket priorities configured."
        
        result = "Available Priorities:\n"
        for p in rows:
            result += f"  {p.get('priority_id')}. {p.get('name')} - {p.get('description', '')}\n"
        return result
    except Exception as e:
        return f"Error getting priorities: {_format_request_error(e)}"


@function_tool
def get_account_manager(organization_id: int) -> str:
    """
    Get the account manager for an organization.
    Use this to escalate billing or contract issues.
    
    Args:
        organization_id: The organization ID
    """
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "name,manager:manager_id(full_name,email,phone)"
        }
        rows = db._make_request("GET", "organizations", params=params)
        
        if not rows:
            return f"Organization {organization_id} not found."
        
        org = rows[0]
        manager = org.get("manager", {}) or {}
        
        if not manager:
            return f"No account manager assigned to {org.get('name')}."
        
        return (
            f"Account Manager for {org.get('name')}:\n"
            f"Name: {manager.get('full_name')}\n"
            f"Email: {manager.get('email')}\n"
            f"Phone: {manager.get('phone', 'N/A')}"
        )
    except Exception as e:
        return f"Error getting account manager: {_format_request_error(e)}"


@function_tool
def get_ticket_history(ticket_id: int) -> str:
    """
    Get the complete history of a ticket including messages and escalations.
    
    Args:
        ticket_id: The ticket ID to look up
    """
    try:
        # Get messages
        msg_params = {
            "ticket_id": f"eq.{ticket_id}",
            "select": "message_id,content,message_time,message_type,sender_agent:sender_agent_id(full_name),sender_contact:sender_contact_id(full_name)",
            "order": "message_time.asc"
        }
        messages = db._make_request("GET", "ticket_messages", params=msg_params)
        
        # Get escalations
        esc_params = {
            "ticket_id": f"eq.{ticket_id}",
            "select": "escalation_time,reason,from_agent:from_agent_id(full_name),to_agent:to_agent_id(full_name)",
            "order": "escalation_time.asc"
        }
        escalations = db._make_request("GET", "ticket_escalations", params=esc_params)
        
        result = f"=== Ticket #{ticket_id} History ===\n\n"
        
        if messages:
            result += "Messages:\n"
            for m in messages:
                sender = m.get("sender_contact", {}) or m.get("sender_agent", {}) or {}
                sender_name = sender.get("full_name", "System")
                result += f"  [{m.get('message_time', '')[:16]}] {sender_name}: {m.get('content', '')[:100]}\n"
        else:
            result += "No messages yet.\n"
        
        if escalations:
            result += "\nEscalations:\n"
            for e in escalations:
                from_agent = e.get("from_agent", {}) or {}
                to_agent = e.get("to_agent", {}) or {}
                result += f"  [{e.get('escalation_time', '')[:16]}] {from_agent.get('full_name', 'N/A')} → {to_agent.get('full_name', 'Human Agent')}: {e.get('reason', 'N/A')}\n"
        
        return result
    except Exception as e:
        return f"Error getting ticket history: {_format_request_error(e)}"


# ============================================
# Organization-Scoped Lookup Tools
# These tools REQUIRE organization_id for security.
# They only return data for the verified organization.
# ============================================

@function_tool
def get_organization_devices(organization_id: int) -> str:
    """
    Get ALL devices for a specific organization with COMPLETE details.
    Use this when user asks about devices, IPs, memory, OS, architecture, etc.
    
    Args:
        organization_id: The organization ID from U&E code verification
    
    Returns:
        List of all devices with ALL columns: status, location, IP, gateway, 
        OS, architecture, memory, processor, manufacturer, model, etc.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": (
                "device_id,asset_name,status,host_name,public_ip,gateway,"
                "os_version,system_uptime,last_logged_in_by,last_reported_time,"
                "total_memory,created_at,updated_at,"
                "location:location_id(location_id,name,location_type),"
                "device_type:device_type_id(name),"
                "manufacturer:manufacturer_id(name),"
                "model:model_id(name),"
                "os:os_id(name),"
                "domain:domain_id(name),"
                "processor:processor_id(manufacturer,model),"
                "architecture:architecture_id(name),"
                "update_status:update_status_id(name)"
            ),
            "order": "asset_name.asc"
        }
        rows = db._make_request("GET", "devices", params=params)
        
        if not rows:
            return f"No devices found for organization {organization_id}."
        
        online_count = sum(1 for d in rows if d.get('status') == 'ONLINE')
        offline_count = len(rows) - online_count
        
        result = f"Found {len(rows)} device(s) for your organization:\n"
        result += f"ONLINE: {online_count} | OFFLINE: {offline_count}\n\n"
        
        for d in rows:
            loc = d.get("location", {}) or {}
            dtype = d.get("device_type", {}) or {}
            mfr = d.get("manufacturer", {}) or {}
            model = d.get("model", {}) or {}
            os_info = d.get("os", {}) or {}
            arch = d.get("architecture", {}) or {}
            proc = d.get("processor", {}) or {}
            domain = d.get("domain", {}) or {}
            upd_status = d.get("update_status", {}) or {}
            
            status = "ONLINE" if d.get('status') == 'ONLINE' else "OFFLINE"
            result += f"=== {d.get('asset_name')} ({status}) [device_id: {d.get('device_id')}] ===\n"
            
            if dtype.get('name'):
                result += f"  Device Type: {dtype.get('name')}\n"
            if loc.get('name'):
                result += f"  Location: {loc.get('name')} ({loc.get('location_type', 'Office')})\n"
            if d.get('host_name'):
                result += f"  Hostname: {d.get('host_name')}\n"
            if d.get('public_ip'):
                result += f"  Public IP: {d.get('public_ip')}\n"
            if d.get('gateway'):
                result += f"  Gateway: {d.get('gateway')}\n"
            if mfr.get('name'):
                result += f"  Manufacturer: {mfr.get('name')}\n"
            if model.get('name'):
                result += f"  Model: {model.get('name')}\n"
            if os_info.get('name'):
                os_str = os_info.get('name')
                if d.get('os_version'):
                    os_str += f" {d.get('os_version')}"
                result += f"  Operating System: {os_str}\n"
            if arch.get('name'):
                result += f"  Architecture: {arch.get('name')}\n"
            if proc.get('manufacturer') or proc.get('model'):
                proc_str = f"{proc.get('manufacturer', '')} {proc.get('model', '')}".strip()
                result += f"  Processor: {proc_str}\n"
            if d.get('total_memory'):
                mem_gb = round(d.get('total_memory') / (1024**3), 2)
                result += f"  Total Memory: {mem_gb} GB\n"
            if domain.get('name'):
                result += f"  Domain: {domain.get('name')}\n"
            if upd_status.get('name'):
                result += f"  Update Status: {upd_status.get('name')}\n"
            if d.get('system_uptime'):
                result += f"  System Uptime: {d.get('system_uptime')}\n"
            if d.get('last_logged_in_by'):
                result += f"  Last Logged In By: {d.get('last_logged_in_by')}\n"
            if d.get('last_reported_time'):
                result += f"  Last Reported: {d.get('last_reported_time')}\n"
            if d.get('created_at'):
                result += f"  Created At: {d.get('created_at')}\n"
            if d.get('updated_at'):
                result += f"  Updated At: {d.get('updated_at')}\n"
            result += "\n"
        
        return result
    except Exception as e:
        return f"Error getting organization devices: {_format_request_error(e)}"


@function_tool
def get_device_full_details(organization_id: int, device_id: int = None, device_name: str = None) -> str:
    """
    Get COMPLETE details for a specific device including ALL columns.
    Use this when user asks about a specific device's IP, memory, OS, architecture, etc.
    
    Args:
        organization_id: The organization ID from U&E code verification (REQUIRED)
        device_id: The device ID to look up (optional if device_name provided)
        device_name: The device name to search for (optional if device_id provided)
    
    Returns:
        Complete device information with ALL fields: IP, gateway, OS, architecture, 
        memory, processor, manufacturer, model, uptime, last login, created_at, etc.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    
    if not device_id and not device_name:
        return "Please provide either device_id or device_name."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": (
                "device_id,asset_name,status,host_name,public_ip,gateway,"
                "os_version,system_uptime,last_logged_in_by,last_reported_time,"
                "total_memory,created_at,updated_at,"
                "location:location_id(location_id,name,location_type),"
                "device_type:device_type_id(name),"
                "manufacturer:manufacturer_id(name),"
                "model:model_id(name),"
                "os:os_id(name),"
                "domain:domain_id(name),"
                "processor:processor_id(manufacturer,model),"
                "architecture:architecture_id(name),"
                "update_status:update_status_id(name)"
            )
        }
        
        if device_id:
            params["device_id"] = f"eq.{device_id}"
        elif device_name:
            params["asset_name"] = f"ilike.*{device_name}*"
        
        rows = db._make_request("GET", "devices", params=params)
        
        if not rows:
            return f"No device found matching the criteria."
        
        d = rows[0]
        loc = d.get("location", {}) or {}
        dtype = d.get("device_type", {}) or {}
        mfr = d.get("manufacturer", {}) or {}
        model = d.get("model", {}) or {}
        os_info = d.get("os", {}) or {}
        arch = d.get("architecture", {}) or {}
        proc = d.get("processor", {}) or {}
        domain = d.get("domain", {}) or {}
        upd_status = d.get("update_status", {}) or {}
        
        status = "ONLINE" if d.get('status') == 'ONLINE' else "OFFLINE"
        
        result = f"=== Device Details: {d.get('asset_name')} ===\n\n"
        result += f"Device ID: {d.get('device_id')}\n"
        result += f"Asset Name: {d.get('asset_name')}\n"
        result += f"Status: {status}\n"
        result += f"Hostname: {d.get('host_name', 'N/A')}\n"
        result += f"Public IP: {d.get('public_ip', 'N/A')}\n"
        result += f"Gateway: {d.get('gateway', 'N/A')}\n"
        result += f"Device Type: {dtype.get('name', 'N/A')}\n"
        result += f"Manufacturer: {mfr.get('name', 'N/A')}\n"
        result += f"Model: {model.get('name', 'N/A')}\n"
        
        os_str = os_info.get('name', 'N/A')
        if d.get('os_version'):
            os_str += f" {d.get('os_version')}"
        result += f"Operating System: {os_str}\n"
        result += f"Architecture: {arch.get('name', 'N/A')}\n"
        proc_str = f"{proc.get('manufacturer', '')} {proc.get('model', '')}".strip() or 'N/A'
        result += f"Processor: {proc_str}\n"
        
        if d.get('total_memory'):
            mem_gb = round(d.get('total_memory') / (1024**3), 2)
            result += f"Total Memory: {mem_gb} GB ({d.get('total_memory')} bytes)\n"
        else:
            result += "Total Memory: N/A\n"
        
        result += f"Domain: {domain.get('name', 'N/A')}\n"
        result += f"Update Status: {upd_status.get('name', 'N/A')}\n"
        result += f"System Uptime: {d.get('system_uptime', 'N/A')}\n"
        result += f"Last Logged In By: {d.get('last_logged_in_by', 'N/A')}\n"
        result += f"Last Reported Time: {d.get('last_reported_time', 'N/A')}\n"
        result += f"Location: {loc.get('name', 'N/A')} ({loc.get('location_type', 'N/A')})\n"
        result += f"Created At: {d.get('created_at', 'N/A')}\n"
        result += f"Updated At: {d.get('updated_at', 'N/A')}\n"
        
        return result
    except Exception as e:
        return f"Error getting device details: {_format_request_error(e)}"


@function_tool
def get_organization_contacts(organization_id: int) -> str:
    """
    Get ALL contacts (employees) for a specific organization with COMPLETE details.
    Use this when user asks about contacts, employees, phone numbers, emails.
    
    Args:
        organization_id: The organization ID from U&E code verification
    
    Returns:
        List of all contacts with ALL fields: name, email, phone, created_at, 
        updated_at, and their assigned devices.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "contact_id,full_name,email,phone,created_at,updated_at",
            "order": "full_name.asc"
        }
        rows = db._make_request("GET", "contacts", params=params)
        
        if not rows:
            return f"No contacts found for organization {organization_id}."
        
        result = f"Found {len(rows)} contact(s) for your organization:\n\n"
        
        for c in rows:
            result += f"=== {c.get('full_name', 'N/A')} [contact_id: {c.get('contact_id')}] ===\n"
            result += f"  Email: {c.get('email', 'N/A')}\n"
            result += f"  Phone: {c.get('phone', 'N/A')}\n"
            result += f"  Created At: {c.get('created_at', 'N/A')}\n"
            result += f"  Updated At: {c.get('updated_at', 'N/A')}\n"
            result += "\n"
        
        return result
    except Exception as e:
        return f"Error getting organization contacts: {_format_request_error(e)}"


@function_tool
def get_contact_full_details(organization_id: int, contact_id: int = None, contact_name: str = None) -> str:
    """
    Get COMPLETE details for a specific contact including their assigned devices.
    
    Args:
        organization_id: The organization ID from U&E code verification (REQUIRED)
        contact_id: The contact ID to look up (optional if contact_name provided)
        contact_name: The contact name to search for (optional if contact_id provided)
    
    Returns:
        Complete contact information with ALL fields and their assigned devices.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    
    if not contact_id and not contact_name:
        return "Please provide either contact_id or contact_name."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "contact_id,full_name,email,phone,created_at,updated_at"
        }
        
        if contact_id:
            params["contact_id"] = f"eq.{contact_id}"
        elif contact_name:
            params["full_name"] = f"ilike.*{contact_name}*"
        
        rows = db._make_request("GET", "contacts", params=params)
        
        if not rows:
            return f"No contact found matching the criteria."
        
        c = rows[0]
        
        result = f"=== Contact Details: {c.get('full_name')} ===\n\n"
        result += f"Contact ID: {c.get('contact_id')}\n"
        result += f"Full Name: {c.get('full_name')}\n"
        result += f"Email: {c.get('email', 'N/A')}\n"
        result += f"Phone: {c.get('phone', 'N/A')}\n"
        result += f"Created At: {c.get('created_at', 'N/A')}\n"
        result += f"Updated At: {c.get('updated_at', 'N/A')}\n"
        
        # Get assigned devices
        device_params = {
            "contact_id": f"eq.{c.get('contact_id')}",
            "unassigned_at": "is.null",
            "select": "device:device_id(device_id,asset_name,status),assigned_at"
        }
        device_rows = db._make_request("GET", "contact_devices", params=device_params)
        
        if device_rows:
            result += f"\nAssigned Devices ({len(device_rows)}):\n"
            for cd in device_rows:
                dev = cd.get("device", {}) or {}
                status = "ONLINE" if dev.get('status') == 'ONLINE' else "OFFLINE"
                result += f"  - {dev.get('asset_name')} ({status}) [assigned: {cd.get('assigned_at')}]\n"
        else:
            result += "\nNo devices assigned to this contact.\n"
        
        return result
    except Exception as e:
        return f"Error getting contact details: {_format_request_error(e)}"


@function_tool
def get_organization_tickets(organization_id: int, include_closed: bool = False) -> str:
    """
    Get ALL tickets for a specific organization with COMPLETE details.
    Use this when user asks about tickets, issues, problems, support requests.
    
    Args:
        organization_id: The organization ID from U&E code verification
        include_closed: Whether to include closed/resolved tickets (default False)
    
    Returns:
        List of tickets with ALL fields: subject, description, status, priority, 
        contact, device, location, created_at, updated_at, closed_at, etc.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": (
                "ticket_id,subject,description,requires_human_agent,"
                "created_at,updated_at,closed_at,"
                "status:status_id(name),"
                "priority:priority_id(name),"
                "contact:contact_id(contact_id,full_name,email,phone),"
                "device:device_id(device_id,asset_name,status),"
                "location:location_id(location_id,name)"
            ),
            "order": "created_at.desc",
            "limit": "50"
        }
        
        if not include_closed:
            # Exclude Resolved (5) and Closed (6)
            params["status_id"] = "in.(1,2,3,4)"
        
        rows = db._make_request("GET", "support_tickets", params=params)
        
        if not rows:
            return f"No {'open ' if not include_closed else ''}tickets found for organization {organization_id}."
        
        result = f"Found {len(rows)} {'open ' if not include_closed else ''}ticket(s) for your organization:\n\n"
        
        for t in rows:
            status = t.get("status", {}) or {}
            priority = t.get("priority", {}) or {}
            contact = t.get("contact", {}) or {}
            device = t.get("device", {}) or {}
            location = t.get("location", {}) or {}
            
            result += f"=== Ticket #{t.get('ticket_id')}: {t.get('subject', 'N/A')} ===\n"
            result += f"  Status: {status.get('name', 'Unknown')}\n"
            result += f"  Priority: {priority.get('name', 'Medium')}\n"
            result += f"  Requires Human: {'Yes' if t.get('requires_human_agent') else 'No'}\n"
            if t.get('description'):
                desc = t.get('description')[:200] + "..." if len(t.get('description', '')) > 200 else t.get('description')
                result += f"  Description: {desc}\n"
            result += f"  Reported By: {contact.get('full_name', 'N/A')} ({contact.get('email', 'N/A')})\n"
            if device.get('asset_name'):
                dev_status = "ONLINE" if device.get('status') == 'ONLINE' else "OFFLINE"
                result += f"  Device: {device.get('asset_name')} ({dev_status})\n"
            if location.get('name'):
                result += f"  Location: {location.get('name')}\n"
            result += f"  Created: {t.get('created_at', 'N/A')}\n"
            result += f"  Updated: {t.get('updated_at', 'N/A')}\n"
            if t.get('closed_at'):
                result += f"  Closed: {t.get('closed_at')}\n"
            result += "\n"
        
        return result
    except Exception as e:
        return f"Error getting organization tickets: {_format_request_error(e)}"


@function_tool
def get_ticket_full_details(organization_id: int, ticket_id: int) -> str:
    """
    Get COMPLETE details for a specific ticket including ALL columns and messages.
    
    Args:
        organization_id: The organization ID from U&E code verification (REQUIRED)
        ticket_id: The ticket ID to look up
    
    Returns:
        Complete ticket information with ALL fields, messages, and assignment history.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    
    if not ticket_id:
        return "Please provide a ticket_id."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "ticket_id": f"eq.{ticket_id}",
            "select": (
                "ticket_id,subject,description,requires_human_agent,"
                "created_at,updated_at,closed_at,"
                "status:status_id(status_id,name),"
                "priority:priority_id(priority_id,name),"
                "contact:contact_id(contact_id,full_name,email,phone),"
                "device:device_id(device_id,asset_name,status,host_name),"
                "location:location_id(location_id,name,location_type)"
            )
        }
        
        rows = db._make_request("GET", "support_tickets", params=params)
        
        if not rows:
            return f"No ticket found with ID {ticket_id} for this organization."
        
        t = rows[0]
        status = t.get("status", {}) or {}
        priority = t.get("priority", {}) or {}
        contact = t.get("contact", {}) or {}
        device = t.get("device", {}) or {}
        location = t.get("location", {}) or {}
        
        result = f"=== Ticket Details: #{t.get('ticket_id')} ===\n\n"
        result += f"Subject: {t.get('subject', 'N/A')}\n"
        result += f"Description: {t.get('description', 'N/A')}\n"
        result += f"Status: {status.get('name', 'Unknown')} (ID: {status.get('status_id')})\n"
        result += f"Priority: {priority.get('name', 'Medium')} (ID: {priority.get('priority_id')})\n"
        result += f"Requires Human Agent: {'Yes' if t.get('requires_human_agent') else 'No'}\n\n"
        
        result += f"--- Reporter ---\n"
        result += f"Contact ID: {contact.get('contact_id')}\n"
        result += f"Name: {contact.get('full_name', 'N/A')}\n"
        result += f"Email: {contact.get('email', 'N/A')}\n"
        result += f"Phone: {contact.get('phone', 'N/A')}\n\n"
        
        if device.get('device_id'):
            result += f"--- Affected Device ---\n"
            result += f"Device ID: {device.get('device_id')}\n"
            result += f"Asset Name: {device.get('asset_name')}\n"
            result += f"Status: {'ONLINE' if device.get('status') == 'ONLINE' else 'OFFLINE'}\n"
            result += f"Hostname: {device.get('host_name', 'N/A')}\n\n"
        
        if location.get('location_id'):
            result += f"--- Location ---\n"
            result += f"Location ID: {location.get('location_id')}\n"
            result += f"Name: {location.get('name')}\n"
            result += f"Type: {location.get('location_type', 'N/A')}\n\n"
        
        result += f"--- Timestamps ---\n"
        result += f"Created At: {t.get('created_at', 'N/A')}\n"
        result += f"Updated At: {t.get('updated_at', 'N/A')}\n"
        result += f"Closed At: {t.get('closed_at', 'N/A')}\n\n"
        
        # Get ticket messages
        msg_params = {
            "ticket_id": f"eq.{ticket_id}",
            "select": "message_id,message_time,content,sender_agent_id,sender_contact_id",
            "order": "message_time.asc"
        }
        messages = db._make_request("GET", "ticket_messages", params=msg_params)
        
        if messages:
            result += f"--- Messages ({len(messages)}) ---\n"
            for m in messages:
                sender = "Agent" if m.get('sender_agent_id') else "Contact"
                result += f"[{m.get('message_time')}] {sender}: {m.get('content', '')[:100]}\n"
        
        return result
    except Exception as e:
        return f"Error getting ticket details: {_format_request_error(e)}"


@function_tool
def get_device_by_id_for_org(device_id: int, organization_id: int) -> str:
    """
    Get detailed information about a specific device.
    Verifies the device belongs to the specified organization.
    
    Args:
        device_id: The device ID to look up
        organization_id: The organization ID (for security verification)
    
    Returns:
        Full device details including specs, location, and assigned contacts.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    if not device_id:
        return "device_id is required."
    
    try:
        params = {
            "device_id": f"eq.{device_id}",
            "organization_id": f"eq.{organization_id}",
            "select": "*,location:location_id(name,location_type),device_type:device_type_id(name),manufacturer:manufacturer_id(name),model:model_id(name),os:os_id(name),processor:processor_id(manufacturer,model)"
        }
        rows = db._make_request("GET", "devices", params=params)
        
        if not rows:
            return f"Device {device_id} not found or does not belong to your organization."
        
        d = rows[0]
        loc = d.get("location", {}) or {}
        dtype = d.get("device_type", {}) or {}
        mfr = d.get("manufacturer", {}) or {}
        model = d.get("model", {}) or {}
        os_info = d.get("os", {}) or {}
        processor = d.get("processor", {}) or {}
        
        status_emoji = "📗 ONLINE" if d.get('status') == 'ONLINE' else "🔴 OFFLINE"
        
        result = f"=== Device Details ===\n"
        result += f"Asset Name: {d.get('asset_name')}\n"
        result += f"Status: {status_emoji}\n"
        result += f"Type: {dtype.get('name', 'Unknown')}\n"
        result += f"Location: {loc.get('name', 'N/A')} ({loc.get('location_type', 'N/A')})\n\n"
        
        result += f"Hardware:\n"
        result += f"  Manufacturer: {mfr.get('name', 'N/A')}\n"
        result += f"  Model: {model.get('name', 'N/A')}\n"
        if processor.get('manufacturer'):
            result += f"  Processor: {processor.get('manufacturer')} {processor.get('model', '')}\n"
        if d.get('total_memory'):
            memory_gb = round(d.get('total_memory', 0) / (1024**3), 1)
            result += f"  Memory: {memory_gb} GB\n"
        
        result += f"\nNetwork:\n"
        result += f"  Hostname: {d.get('host_name', 'N/A')}\n"
        result += f"  Public IP: {d.get('public_ip', 'N/A')}\n"
        result += f"  Gateway: {d.get('gateway', 'N/A')}\n"
        
        result += f"\nSystem:\n"
        result += f"  OS: {os_info.get('name', 'N/A')} {d.get('os_version', '')}\n"
        result += f"  Uptime: {d.get('system_uptime', 'N/A')}\n"
        result += f"  Last User: {d.get('last_logged_in_by', 'N/A')}\n"
        result += f"  Last Reported: {d.get('last_reported_time', 'N/A')}\n"
        
        # Get assigned contacts
        contact_params = {
            "device_id": f"eq.{device_id}",
            "unassigned_at": "is.null",
            "select": "contact:contact_id(full_name,email)"
        }
        contacts = db._make_request("GET", "contact_devices", params=contact_params)
        
        if contacts:
            result += f"\nAssigned Users:\n"
            for c in contacts:
                contact = c.get("contact", {}) or {}
                result += f"  👤 {contact.get('full_name', 'N/A')} ({contact.get('email', 'N/A')})\n"
        
        return result
    except Exception as e:
        return f"Error getting device details: {_format_request_error(e)}"


@function_tool
def get_devices_by_location(location_id: int, organization_id: int) -> str:
    """
    Get all devices at a specific location.
    Verifies the location belongs to the specified organization.
    
    Args:
        location_id: The location ID to filter by
        organization_id: The organization ID (for security verification)
    
    Returns:
        List of devices at that location.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    if not location_id:
        return "location_id is required."
    
    try:
        # First verify the location belongs to the org
        loc_params = {
            "location_id": f"eq.{location_id}",
            "organization_id": f"eq.{organization_id}",
            "select": "name,location_type"
        }
        loc_rows = db._make_request("GET", "locations", params=loc_params)
        
        if not loc_rows:
            return f"Location {location_id} not found or does not belong to your organization."
        
        loc = loc_rows[0]
        
        # Get devices at this location
        params = {
            "location_id": f"eq.{location_id}",
            "organization_id": f"eq.{organization_id}",
            "select": "device_id,asset_name,status,host_name,device_type:device_type_id(name)",
            "order": "asset_name.asc"
        }
        rows = db._make_request("GET", "devices", params=params)
        
        if not rows:
            return f"No devices found at {loc.get('name')}."
        
        online_count = sum(1 for d in rows if d.get('status') == 'ONLINE')
        offline_count = len(rows) - online_count
        
        result = f"Devices at {loc.get('name')} ({loc.get('location_type')}):\n"
        result += f"Total: {len(rows)} | 📗 ONLINE: {online_count} | 🔴 OFFLINE: {offline_count}\n\n"
        
        for d in rows:
            dtype = d.get("device_type", {}) or {}
            status_emoji = "📗" if d.get('status') == 'ONLINE' else "🔴"
            result += f"{status_emoji} {d.get('asset_name', 'N/A')}"
            if dtype.get('name'):
                result += f" ({dtype.get('name')})"
            result += f" [device_id: {d.get('device_id')}]\n"
        
        return result
    except Exception as e:
        return f"Error getting devices by location: {_format_request_error(e)}"


@function_tool
def get_contacts_by_device(device_id: int, organization_id: int) -> str:
    """
    Get all contacts (users) assigned to a specific device.
    Verifies the device belongs to the specified organization.
    
    Args:
        device_id: The device ID to look up
        organization_id: The organization ID (for security verification)
    
    Returns:
        List of contacts assigned to this device.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    if not device_id:
        return "device_id is required."
    
    try:
        # Verify device belongs to org
        device_params = {
            "device_id": f"eq.{device_id}",
            "organization_id": f"eq.{organization_id}",
            "select": "asset_name"
        }
        device_rows = db._make_request("GET", "devices", params=device_params)
        
        if not device_rows:
            return f"Device {device_id} not found or does not belong to your organization."
        
        device_name = device_rows[0].get('asset_name', 'Unknown')
        
        # Get assigned contacts
        params = {
            "device_id": f"eq.{device_id}",
            "unassigned_at": "is.null",
            "select": "assigned_at,contact:contact_id(contact_id,full_name,email,phone)"
        }
        rows = db._make_request("GET", "contact_devices", params=params)
        
        if not rows:
            return f"No users are currently assigned to {device_name}."
        
        result = f"Users assigned to {device_name}:\n\n"
        
        for r in rows:
            contact = r.get("contact", {}) or {}
            result += f"👤 {contact.get('full_name', 'N/A')}\n"
            result += f"   Email: {contact.get('email', 'N/A')}\n"
            result += f"   Phone: {contact.get('phone', 'N/A')}\n"
            result += f"   Assigned: {r.get('assigned_at', 'N/A')[:10] if r.get('assigned_at') else 'N/A'}\n\n"
        
        return result
    except Exception as e:
        return f"Error getting contacts by device: {_format_request_error(e)}"


@function_tool
def get_device_by_name_for_org(asset_name: str, organization_id: int) -> str:
    """
    Search for a device by name within a specific organization.
    Use this when caller mentions a device name like "the printer" or "John's laptop".
    
    Args:
        asset_name: Full or partial device name to search for
        organization_id: The organization ID (for security - only search within this org)
    
    Returns:
        Matching devices with their status and details.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    if not asset_name.strip():
        return "Device name is required."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "asset_name": f"ilike.*{asset_name.strip()}*",
            "select": "device_id,asset_name,status,host_name,location:location_id(name),device_type:device_type_id(name)",
            "limit": "10"
        }
        rows = db._make_request("GET", "devices", params=params)
        
        if not rows:
            return f"No devices found matching '{asset_name}' in your organization."
        
        result = f"Found {len(rows)} device(s) matching '{asset_name}':\n\n"
        
        for d in rows:
            loc = d.get("location", {}) or {}
            dtype = d.get("device_type", {}) or {}
            status_emoji = "📗 ONLINE" if d.get('status') == 'ONLINE' else "🔴 OFFLINE"
            
            result += f"{status_emoji}: {d.get('asset_name')}\n"
            result += f"   Type: {dtype.get('name', 'N/A')}\n"
            result += f"   Location: {loc.get('name', 'N/A')}\n"
            result += f"   Hostname: {d.get('host_name', 'N/A')}\n"
            result += f"   [device_id: {d.get('device_id')}]\n\n"
        
        return result
    except Exception as e:
        return f"Error searching devices: {_format_request_error(e)}"


@function_tool
def get_location_by_name_for_org(location_name: str, organization_id: int) -> str:
    """
    Search for a location by name within a specific organization.
    
    Args:
        location_name: Full or partial location name to search for
        organization_id: The organization ID (for security)
    
    Returns:
        Matching locations with device counts.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    if not location_name.strip():
        return "Location name is required."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "name": f"ilike.*{location_name.strip()}*",
            "select": "location_id,name,location_type,requires_human_agent",
            "limit": "10"
        }
        rows = db._make_request("GET", "locations", params=params)
        
        if not rows:
            return f"No locations found matching '{location_name}' in your organization."
        
        result = f"Found {len(rows)} location(s) matching '{location_name}':\n\n"
        
        for loc in rows:
            # Count devices at this location
            device_params = {
                "location_id": f"eq.{loc.get('location_id')}",
                "select": "device_id,status"
            }
            devices = db._make_request("GET", "devices", params=device_params)
            
            online = sum(1 for d in devices if d.get('status') == 'ONLINE')
            offline = len(devices) - online
            
            result += f"📍 {loc.get('name')} ({loc.get('location_type')})\n"
            result += f"   Devices: {len(devices)} (📗 {online} online, 🔴 {offline} offline)\n"
            if loc.get('requires_human_agent'):
                result += f"   ⚠️ This location requires human agent support\n"
            result += f"   [location_id: {loc.get('location_id')}]\n\n"
        
        return result
    except Exception as e:
        return f"Error searching locations: {_format_request_error(e)}"


@function_tool
def get_contact_by_name_for_org(contact_name: str, organization_id: int) -> str:
    """
    Search for a contact by name within a specific organization.
    
    Args:
        contact_name: Full or partial name to search for
        organization_id: The organization ID (for security)
    
    Returns:
        Matching contacts with their details and assigned devices.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    if not contact_name.strip():
        return "Contact name is required."
    
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "full_name": f"ilike.*{contact_name.strip()}*",
            "select": "contact_id,full_name,email,phone",
            "limit": "10"
        }
        rows = db._make_request("GET", "contacts", params=params)
        
        if not rows:
            return f"No contacts found matching '{contact_name}' in your organization."
        
        result = f"Found {len(rows)} contact(s) matching '{contact_name}':\n\n"
        
        for c in rows:
            result += f"👤 {c.get('full_name')}\n"
            result += f"   Email: {c.get('email', 'N/A')}\n"
            result += f"   Phone: {c.get('phone', 'N/A')}\n"
            
            # Get assigned devices
            device_params = {
                "contact_id": f"eq.{c.get('contact_id')}",
                "unassigned_at": "is.null",
                "select": "device:device_id(asset_name,status)"
            }
            devices = db._make_request("GET", "contact_devices", params=device_params)
            
            if devices:
                device_list = [d.get("device", {}).get("asset_name", "?") for d in devices if d.get("device")]
                result += f"   Devices: {', '.join(device_list)}\n"
            
            result += f"   [contact_id: {c.get('contact_id')}]\n\n"
        
        return result
    except Exception as e:
        return f"Error searching contacts: {_format_request_error(e)}"


@function_tool
def get_organization_summary(organization_id: int) -> str:
    """
    Get a complete summary of an organization including counts of devices, 
    locations, contacts, and open tickets.
    
    Args:
        organization_id: The organization ID from U&E code verification
    
    Returns:
        Organization overview with key statistics.
    """
    if not organization_id:
        return "organization_id is required. Verify U&E code first."
    
    try:
        # Get organization details
        org_params = {
            "organization_id": f"eq.{organization_id}",
            "select": "name,u_e_code,manager:manager_id(full_name,email,phone)"
        }
        org_rows = db._make_request("GET", "organizations", params=org_params)
        
        if not org_rows:
            return f"Organization {organization_id} not found."
        
        org = org_rows[0]
        manager = org.get("manager", {}) or {}
        
        # Count devices
        devices = db._make_request("GET", "devices", params={
            "organization_id": f"eq.{organization_id}",
            "select": "device_id,status"
        })
        online_devices = sum(1 for d in devices if d.get('status') == 'ONLINE')
        offline_devices = len(devices) - online_devices
        
        # Count locations
        locations = db._make_request("GET", "locations", params={
            "organization_id": f"eq.{organization_id}",
            "select": "location_id"
        })
        
        # Count contacts
        contacts = db._make_request("GET", "contacts", params={
            "organization_id": f"eq.{organization_id}",
            "select": "contact_id"
        })
        
        # Count open tickets
        tickets = db._make_request("GET", "support_tickets", params={
            "organization_id": f"eq.{organization_id}",
            "status_id": "in.(1,2,3,4)",
            "select": "ticket_id"
        })
        
        result = f"=== Organization Summary ===\n"
        result += f"Name: {org.get('name')}\n"
        result += f"U&E Code: {org.get('u_e_code')}\n\n"
        
        result += f"Account Manager:\n"
        result += f"  {manager.get('full_name', 'Not Assigned')}\n"
        result += f"  {manager.get('email', 'N/A')} | {manager.get('phone', 'N/A')}\n\n"
        
        result += f"Statistics:\n"
        result += f"  📍 Locations: {len(locations)}\n"
        result += f"  💻 Devices: {len(devices)} (📗 {online_devices} online, 🔴 {offline_devices} offline)\n"
        result += f"  👤 Contacts: {len(contacts)}\n"
        result += f"  🎫 Open Tickets: {len(tickets)}\n"
        
        if offline_devices > 0:
            result += f"\n⚠️ Note: You have {offline_devices} offline device(s) that may need attention."
        
        return result
    except Exception as e:
        return f"Error getting organization summary: {_format_request_error(e)}"


@function_tool
def lookup_organization_data(organization_id: int, query_type: str, search_term: str = "") -> str:
    """
    Universal router for organization data queries. Redirects to specialized tools
    that return COMPLETE data with ALL columns for each table.
    
    Use this for quick lookups - it will call the appropriate detailed tool.
    
    Args:
        organization_id: The organization ID from U&E code verification (REQUIRED)
        query_type: One of: "devices", "locations", "contacts", "tickets", "summary"
        search_term: Optional search term for finding specific items
    
    Returns:
        Complete data from the appropriate table with ALL columns.
    """
    if not organization_id:
        return "organization_id is required. Please verify the caller's U&E code first."
    
    query_type = query_type.lower().strip()
    
    # Route to specialized tools that return ALL columns
    if query_type == "devices":
        return get_organization_devices.__wrapped__(organization_id)
    elif query_type == "locations":
        return get_organization_locations.__wrapped__(organization_id)
    elif query_type == "contacts":
        return get_organization_contacts.__wrapped__(organization_id)
    elif query_type == "tickets":
        return get_organization_tickets.__wrapped__(organization_id, include_closed=False)
    elif query_type == "summary":
        return get_organization_summary.__wrapped__(organization_id)
    elif query_type == "find_device" and search_term:
        return get_device_full_details.__wrapped__(organization_id, device_name=search_term)
    elif query_type == "find_contact" and search_term:
        return get_contact_full_details.__wrapped__(organization_id, contact_name=search_term)
    elif query_type == "find_location" and search_term:
        return get_location_full_details.__wrapped__(organization_id, location_name=search_term)
    else:
        return f"Unknown query type: {query_type}. Use: devices, locations, contacts, tickets, summary"

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
        
        result = db.update("support_tickets", "ticket_id", ticket_id, update_data)
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
        db.update("support_tickets", "ticket_id", ticket_id, update_data)
        
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
        db.update("support_tickets", "ticket_id", ticket_id, {
            "status_id": 2,
            "updated_at": datetime.utcnow().isoformat()
        })
        
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
    Get all locations for an organization.
    """
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "location_id,name,location_type,requires_human_agent"
        }
        rows = db._make_request("GET", "locations", params=params)
        
        if not rows:
            return f"No locations found for organization {organization_id}"
        
        result = f"Found {len(rows)} location(s):\n"
        for loc in rows:
            human_flag = " [REQUIRES HUMAN]" if loc.get("requires_human_agent") else ""
            result += f"- {loc.get('name')} ({loc.get('location_type')}){human_flag}\n"
        
        return result
    except Exception as e:
        return f"Error getting locations: {_format_request_error(e)}"


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
# Knowledge Base (Simple)
# ============================================

KNOWLEDGE_BASE = {
    "wifi": "For Wi-Fi issues: 1) Restart your device, 2) Forget and reconnect to network, 3) Restart router if office-wide.",
    "email": "For email issues: 1) Check Outlook status, 2) Try webmail at outlook.office365.com, 3) Clear credentials in Credential Manager.",
    "printer": "For printer issues: 1) Check power and paper, 2) Clear print queue, 3) Restart Print Spooler service.",
    "vpn": "For VPN issues: 1) Ensure internet works first, 2) Fully close VPN and reopen, 3) Try alternate VPN server.",
    "slow computer": "For slow computer: 1) Open Task Manager (Ctrl+Shift+Esc), 2) End high-usage apps, 3) Restart computer.",
    "password": "For password issues: 1) Try password reset at portal, 2) Check Caps Lock, 3) IT can reset if locked out.",
}

@function_tool
def search_knowledge_base(query: str) -> str:
    """
    Search the knowledge base for troubleshooting steps.
    """
    query_lower = query.lower()
    
    matches = []
    for key, value in KNOWLEDGE_BASE.items():
        if key in query_lower:
            matches.append(f"{key.upper()}: {value}")
    
    if matches:
        return "\n\n".join(matches)
    
    return "No specific solution found. Consider creating a ticket for technician review."


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


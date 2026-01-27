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
from db.connection import get_db

logger = logging.getLogger(__name__)

# Get database instance
db = get_db()


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

        params = {
            "u_e_code": f"eq.{u_e_code}",
            "select": "organization_id,name,u_e_code,manager:manager_id(full_name,email,phone)"
        }
        rows = db._make_request("GET", "organizations", params=params)

        if not rows:
            return f"No organization found with U&E code: {u_e_code}. Please ask the caller to confirm their code."

        org = rows[0]
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
        params = {
            "name": f"ilike.*{name.strip()}*",
            "select": "organization_id,name,u_e_code,manager:manager_id(full_name,email,phone)",
            "limit": "5"
        }
        rows = db._make_request("GET", "organizations", params=params)

        if not rows:
            return f"No organization found with name: {name}"

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
            return f"No contact found with phone: {phone}"

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
        params = {
            "device_id": f"eq.{device_id}",
            "select": "*"
        }
        rows = db._make_request("GET", "devices", params=params)

        if not rows:
            return f"Device {device_id} not found."

        device = rows[0]
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
        params = {
            "device_id": f"eq.{device_id}",
            "select": "*,organization:organization_id(name),location:location_id(name)"
        }
        rows = db._make_request("GET", "devices", params=params)

        if not rows:
            return f"Device {device_id} not found."

        d = rows[0]
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
def get_organization_devices(organization_id: int) -> str:
    """
    Get ALL devices for an organization.
    Use this when user asks about devices for their organization.
    """
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "device_id,asset_name,status,host_name,location:location_id(name)",
            "order": "status.desc,asset_name.asc"
        }
        rows = db._make_request("GET", "devices", params=params)

        if not rows:
            return f"No devices found for organization {organization_id}"

        online = sum(1 for d in rows if d.get('status') == 'ONLINE')
        offline = len(rows) - online

        result = f"Found {len(rows)} device(s) ({online} online, {offline} offline):\n\n"
        for d in rows:
            loc = d.get("location", {}) or {}
            status_icon = "+" if d.get('status') == 'ONLINE' else "-"
            result += f"{status_icon} {d.get('asset_name')} - {d.get('status')} @ {loc.get('name', 'Unknown')}\n"

        return result
    except Exception as e:
        return f"Error getting devices: {_format_request_error(e)}"


# ============================================
# Ticket Management
# ============================================

@function_tool
def analyze_issue_priority(issue_description: str) -> str:
    """
    Analyze the user's issue description and determine the appropriate priority_id.

    YOU MUST call this tool BEFORE creating a ticket to get the correct priority_id.
    Analyze the issue description and select the category that best matches.

    PRIORITY CATEGORIES (select ONE based on your analysis of the issue):

    1 = LOW: Minor inconveniences, feature requests, cosmetic issues, "nice to have"
        Examples: font looks weird, want a shortcut added, minor UI issue

    2 = MEDIUM: Standard issues, single user affected, workarounds available,
        performance issues (slow but working)
        Examples: laptop running slow, occasional crashes, email sync delay

    3 = HIGH: Important issues needing quick resolution, multiple users affected,
        blocking work, urgent deadlines, major features broken
        Examples: can't access files for presentation, team can't print, VPN down for department

    4 = CRITICAL: System down, security incidents, data loss/corruption,
        all users affected, business-critical outage
        Examples: entire network down, security breach, server crashed, ransomware

    Args:
        issue_description: The user's description of their issue (analyze this carefully)

    Returns:
        JSON with priority_id (1-4) and explanation. Use this priority_id in create_ticket.
    """
    import json

    # Return the categories - AI will analyze and select
    return json.dumps({
        "instruction": "Based on your analysis of the issue description, select the appropriate priority_id",
        "issue_analyzed": issue_description,
        "categories": {
            "1": {"name": "Low", "description": "Minor inconvenience, feature request, cosmetic issue"},
            "2": {"name": "Medium", "description": "Standard issue, single user, workaround available"},
            "3": {"name": "High", "description": "Important, multiple users affected, blocking work"},
            "4": {"name": "Critical", "description": "System down, security incident, all users affected"}
        },
        "action": "Return your selected priority_id (1, 2, 3, or 4) based on analyzing the issue description"
    }, indent=2)


@function_tool
def get_priority_id(priority_level: int) -> str:
    """
    Validate and return the priority_id for ticket creation.

    Call this after analyzing the issue to get the validated priority_id.

    Args:
        priority_level: The priority level (1=Low, 2=Medium, 3=High, 4=Critical)

    Returns:
        The validated priority_id to use in create_ticket.
    """
    import json

    priority_names = {1: "Low", 2: "Medium", 3: "High", 4: "Critical"}

    if priority_level not in [1, 2, 3, 4]:
        return json.dumps({
            "success": False,
            "error": f"Invalid priority_level: {priority_level}. Must be 1, 2, 3, or 4."
        })

    return json.dumps({
        "success": True,
        "priority_id": priority_level,
        "priority_name": priority_names[priority_level],
        "instruction": f"Use priority_id={priority_level} when calling create_ticket"
    })


@function_tool
def create_ticket(
    subject: str,
    description: str,
    contact_id: int,
    priority_id: int,
    organization_id: int = 0,
    device_id: int = 0,
    location_id: int = 0,
) -> str:
    """
    Create a new support ticket.

    BEFORE CALLING THIS TOOL:
    1. Call analyze_issue_priority(description) to analyze the issue
    2. Based on analysis, determine priority_id (1=Low, 2=Medium, 3=High, 4=Critical)
    3. Call get_user_devices() to get valid device_id
    4. Call get_organization_locations() to get valid location_id

    Args:
        subject: Brief description of the issue
        description: Detailed description of the problem
        contact_id: ID of the contact creating the ticket (REQUIRED)
        priority_id: REQUIRED - 1=Low, 2=Medium, 3=High, 4=Critical (from your analysis)
        organization_id: ID of the organization
        device_id: ID of the affected device (from get_user_devices, or 0 if not selected)
        location_id: ID of the location (from get_organization_locations, or 0 if not selected)
    """
    if not subject.strip():
        return "Subject is required."
    if not contact_id:
        return "contact_id is required."
    if priority_id not in [1, 2, 3, 4]:
        return f"Invalid priority_id: {priority_id}. Must be 1 (Low), 2 (Medium), 3 (High), or 4 (Critical)."

    try:
        # Get organization from contact if not provided
        if not organization_id:
            params = {"contact_id": f"eq.{contact_id}", "select": "organization_id"}
            contacts = db._make_request("GET", "contacts", params=params)
            if contacts:
                organization_id = contacts[0].get("organization_id")

        if not organization_id:
            return "Could not determine organization."

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
        if location_id:
            ticket_data["location_id"] = location_id

        result = db.insert("support_tickets", ticket_data)
        if result:
            ticket = result[0]
            priority_names = {1: "Low", 2: "Medium", 3: "High", 4: "Critical"}
            return f"Ticket created successfully. Ticket ID: {ticket.get('ticket_id')}. Priority: {priority_names.get(priority_id, 'Unknown')}"
        return "Failed to create ticket."
    except Exception as e:
        return f"Error creating ticket: {_format_request_error(e)}"


# ============================================
# CONSOLIDATED TOOLS (Reduces tool count)
# ============================================

@function_tool
def prepare_ticket_context(contact_id: int, organization_id: int) -> str:
    """
    CONSOLIDATED TOOL: Get all context needed for ticket creation in ONE call.

    This replaces calling multiple tools separately:
    - get_user_devices
    - get_organization_locations
    - analyze_issue_priority

    Returns devices, locations, and priority categories so you can:
    1. Present device list to user
    2. Present location list to user
    3. Analyze issue to determine priority_id

    Args:
        contact_id: The user's contact ID
        organization_id: The organization ID

    Returns:
        JSON with devices, locations, and priority_categories for ticket creation.
    """
    import json

    result = {
        "success": True,
        "devices": [],
        "locations": [],
        "priority_categories": {
            "1": {"name": "Low", "use_when": "Minor inconvenience, feature request, cosmetic issue"},
            "2": {"name": "Medium", "use_when": "Standard issue, single user, workaround available, slow performance"},
            "3": {"name": "High", "use_when": "Blocking work, multiple users affected, urgent deadline"},
            "4": {"name": "Critical", "use_when": "System down, security incident, data loss, all users affected"}
        },
        "CRITICAL_WARNING": "You MUST present ONLY the devices and locations listed below. Do NOT make up or hallucinate options that are not in this response!",
        "instructions": "1. Present ONLY the devices listed in 'devices' array below. 2. Present ONLY the locations listed in 'locations' array below. 3. Analyze issue to pick priority_id. 4. Call create_ticket_smart."
    }

    # Fetch devices assigned to this contact (ordered by device_id for consistency)
    try:
        params = {
            "contact_id": f"eq.{contact_id}",
            "unassigned_at": "is.null",
            "select": "device:device_id(device_id,asset_name,status,host_name)",
            "order": "device_id.asc"  # CRITICAL: Same order as create_ticket_smart
        }
        rows = db._make_request("GET", "contact_devices", params=params)
        print(f"[DEBUG] prepare_ticket_context - Found {len(rows or [])} devices for contact {contact_id}")
        for i, r in enumerate(rows or [], 1):
            d = r.get("device", {})
            if d:
                result["devices"].append({
                    "number": i,
                    "device_id": d.get("device_id"),
                    "name": d.get("asset_name", "Unknown"),
                    "status": d.get("status", "UNKNOWN")
                })
                print(f"[DEBUG]   {i}. {d.get('asset_name')} (device_id={d.get('device_id')})")
    except Exception as e:
        result["device_error"] = str(e)
        print(f"[DEBUG] Device fetch error: {e}")

    # Fetch locations for this organization (ordered by location_id for consistency)
    try:
        print(f"[DEBUG] Fetching locations for organization_id={organization_id}")
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "location_id,name,location_type,organization_id",
            "order": "location_id.asc"  # CRITICAL: Same order as create_ticket_smart
        }
        print(f"[DEBUG] Location query params: {params}")
        rows = db._make_request("GET", "locations", params=params)
        print(f"[DEBUG] Raw location response: {rows}")
        print(f"[DEBUG] prepare_ticket_context - Found {len(rows or [])} locations for org {organization_id}")
        for i, loc in enumerate(rows or [], 1):
            result["locations"].append({
                "number": i,
                "location_id": loc.get("location_id"),
                "name": loc.get("name"),
                "type": loc.get("location_type", "Office")
            })
            print(f"[DEBUG]   {i}. {loc.get('name')} (location_id={loc.get('location_id')}, org_id={loc.get('organization_id')})")
    except Exception as e:
        result["location_error"] = str(e)
        print(f"[DEBUG] Location fetch error: {e}")
        import traceback
        traceback.print_exc()

    # Build user-friendly summary with explicit counts
    device_count = len(result["devices"])
    location_count = len(result["locations"])

    device_msg = f"DEVICES ({device_count} found - present ONLY these to user):\n" + "\n".join([f"  {d['number']}. {d['name']}" for d in result["devices"]]) if result["devices"] else "No devices found"
    location_msg = f"LOCATIONS ({location_count} found - present ONLY these to user):\n" + "\n".join([f"  {l['number']}. {l['name']}" for l in result["locations"]]) if result["locations"] else "No locations found"

    result["summary"] = f"{device_msg}\n\n{location_msg}\n\nDO NOT HALLUCINATE! Use ONLY the {device_count} device(s) and {location_count} location(s) listed above."

    # GUARDRAILS: Pre-formatted messages for the validator to use
    # These will be used verbatim if the AI hallucinates options
    result["_user_messages"] = {
        "device_prompt": (
            f"Please select your device by saying the number:\n"
            + "\n".join([f"{d['number']}. {d['name']}" for d in result["devices"]])
        ) if result["devices"] else None,
        "location_prompt": (
            f"Please select your location by saying the number:\n"
            + "\n".join([f"{l['number']}. {l['name']}" for l in result["locations"]])
        ) if result["locations"] else None,
        "no_devices": "I don't see any devices registered to your account. I'll create the ticket without a specific device. What issue are you experiencing?",
        "no_locations": "I don't see any locations configured for your organization. I'll create the ticket without a specific location. Which device is having the issue?",
    }

    # GUARDRAILS: Validation metadata for the validator
    result["_validation"] = {
        "valid_location_names": [l["name"] for l in result["locations"]],
        "valid_device_names": [d["name"] for d in result["devices"]],
        "location_count": location_count,
        "device_count": device_count,
    }

    return json.dumps(result, indent=2)


@function_tool
def create_ticket_smart(
    subject: str,
    description: str,
    contact_id: int,
    organization_id: int,
    priority_id: int,
    device_selection: str = "",
    location_selection: str = "",
) -> str:
    """
    CONSOLIDATED TOOL: Create ticket with smart device/location resolution.

    CRITICAL: You MUST pass device_selection and location_selection parameters!
    These parameters capture what the user said when selecting their device and location.
    If you don't pass them, the ticket will have NULL device_id and location_id!

    WORKFLOW:
    1. Call prepare_ticket_context() first to get devices/locations/priorities
    2. Present NUMBERED device list to user, get their selection (e.g., "1" or "laptop")
    3. Present NUMBERED location list to user, get their selection (e.g., "2" or "remote")
    4. Analyze issue to determine priority_id (1-4)
    5. Call this tool with ALL parameters including user's selections

    Args:
        subject: Brief description of the issue
        description: Detailed description
        contact_id: User's contact ID
        organization_id: Organization ID
        priority_id: 1=Low, 2=Medium, 3=High, 4=Critical (from your analysis)
        device_selection: REQUIRED - User's device selection (number like "1" or name like "laptop")
        location_selection: REQUIRED - User's location selection (number like "2" or name like "remote")

    EXAMPLE CALL:
    create_ticket_smart(
        subject="Laptop stuck on boot screen",
        description="User's laptop is not coming out of boot screen",
        contact_id=5,
        organization_id=8,
        priority_id=4,
        device_selection="1",      # User said "yes" or "1" for first device
        location_selection="2"     # User said "2" for second location (Remote)
    )

    Returns:
        Success message with ticket_id or error message.
    """
    # DEBUG: Log all parameters received
    print(f"\n{'='*60}")
    print(f"[DEBUG] create_ticket_smart CALLED")
    print(f"[DEBUG] Parameters received from AI:")
    print(f"[DEBUG]   subject = '{subject}'")
    print(f"[DEBUG]   description = '{description[:50]}...' (truncated)")
    print(f"[DEBUG]   contact_id = {contact_id}")
    print(f"[DEBUG]   organization_id = {organization_id}")
    print(f"[DEBUG]   priority_id = {priority_id}")
    print(f"[DEBUG]   device_selection = '{device_selection}'")
    print(f"[DEBUG]   location_selection = '{location_selection}'")
    print(f"{'='*60}\n")

    if not subject.strip():
        return "Error: Subject is required."
    if not contact_id:
        return "Error: contact_id is required."
    if priority_id not in [1, 2, 3, 4]:
        return f"Error: Invalid priority_id {priority_id}. Must be 1, 2, 3, or 4."

    device_id = 0
    location_id = 0

    # Resolve device_selection to device_id
    # Filter devices by contact_id and use consistent ordering
    if device_selection:
        print(f"[DEBUG] Resolving device_selection: '{device_selection}' for contact {contact_id}")
        try:
            params = {
                "contact_id": f"eq.{contact_id}",
                "unassigned_at": "is.null",
                "select": "device:device_id(device_id,asset_name)",
                "order": "device_id.asc"  # CRITICAL: Same order as prepare_ticket_context
            }
            rows = db._make_request("GET", "contact_devices", params=params)
            devices = []
            for r in rows or []:
                d = r.get("device", {})
                if d:
                    devices.append({
                        "device_id": d.get("device_id"),
                        "name": d.get("asset_name", ""),
                        "name_lower": d.get("asset_name", "").lower()
                    })
            print(f"[DEBUG] Found {len(devices)} devices for contact {contact_id}:")
            for i, d in enumerate(devices, 1):
                print(f"[DEBUG]   {i}. {d['name']} (device_id={d['device_id']})")

            # Try to match by number (1, 2, 3, etc.) or "yes" for first device
            selection_stripped = device_selection.strip().lower()
            if selection_stripped.isdigit():
                idx = int(selection_stripped) - 1
                print(f"[DEBUG] User entered number '{selection_stripped}', index={idx}")
                if 0 <= idx < len(devices):
                    device_id = devices[idx]["device_id"]
                    print(f"[DEBUG] SUCCESS: Matched to device_id={device_id} ({devices[idx]['name']})")
                else:
                    print(f"[DEBUG] ERROR: Index {idx} out of range (have {len(devices)} devices)")
            elif selection_stripped in ["yes", "yeah", "yep", "correct", "that one", "1"]:
                # User confirmed the first/only device
                if devices:
                    device_id = devices[0]["device_id"]
                    print(f"[DEBUG] SUCCESS: User confirmed, using first device_id={device_id}")
            else:
                # Try to match by name (fuzzy matching)
                print(f"[DEBUG] User entered name '{device_selection}', searching...")
                for d in devices:
                    if selection_stripped in d["name_lower"] or d["name_lower"] in selection_stripped:
                        device_id = d["device_id"]
                        print(f"[DEBUG] SUCCESS: Fuzzy matched to device_id={device_id} ({d['name']})")
                        break
                if not device_id:
                    print(f"[DEBUG] ERROR: No fuzzy match found for '{device_selection}'")
        except Exception as e:
            print(f"[DEBUG] Device resolution error: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"[DEBUG] WARNING: device_selection is empty/None - ticket will have NULL device!")

    # Resolve location_selection to location_id
    # Filter locations by organization_id and use consistent ordering
    if location_selection:
        print(f"[DEBUG] Resolving location_selection: '{location_selection}' for org {organization_id}")
        try:
            params = {
                "organization_id": f"eq.{organization_id}",
                "select": "location_id,name",
                "order": "location_id.asc"  # CRITICAL: Same order as prepare_ticket_context
            }
            rows = db._make_request("GET", "locations", params=params)
            # Build list with original name (for display) and lowercase (for matching)
            locations = []
            for loc in rows or []:
                locations.append({
                    "location_id": loc.get("location_id"),
                    "name": loc.get("name", ""),
                    "name_lower": loc.get("name", "").lower()
                })
            print(f"[DEBUG] Found {len(locations)} locations for org {organization_id}:")
            for i, loc in enumerate(locations, 1):
                print(f"[DEBUG]   {i}. {loc['name']} (location_id={loc['location_id']})")

            # Try to match by number (1, 2, 3, etc.)
            selection_stripped = location_selection.strip()
            if selection_stripped.isdigit():
                idx = int(selection_stripped) - 1  # Convert to 0-based index
                print(f"[DEBUG] User entered number '{selection_stripped}', index={idx}")
                if 0 <= idx < len(locations):
                    location_id = locations[idx]["location_id"]
                    print(f"[DEBUG] SUCCESS: Matched to location_id={location_id} ({locations[idx]['name']})")
                else:
                    print(f"[DEBUG] ERROR: Index {idx} out of range (have {len(locations)} locations)")
            else:
                # Try to match by name (fuzzy matching)
                selection_lower = selection_stripped.lower()
                print(f"[DEBUG] User entered name '{selection_stripped}', searching...")
                for loc in locations:
                    if selection_lower in loc["name_lower"] or loc["name_lower"] in selection_lower:
                        location_id = loc["location_id"]
                        print(f"[DEBUG] SUCCESS: Fuzzy matched to location_id={location_id} ({loc['name']})")
                        break
                if not location_id:
                    print(f"[DEBUG] ERROR: No fuzzy match found for '{selection_stripped}'")
        except Exception as e:
            print(f"[DEBUG] Location resolution error: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"[DEBUG] WARNING: location_selection is empty/None - ticket will have NULL location!")

    print(f"[DEBUG] Final resolved values: device_id={device_id}, location_id={location_id}")

    # Create the ticket
    try:
        ticket_data = {
            "subject": subject.strip(),
            "description": description.strip() or None,
            "contact_id": contact_id,
            "organization_id": organization_id,
            "status_id": 1,
            "priority_id": priority_id,
            "requires_human_agent": False,
        }
        if device_id:
            ticket_data["device_id"] = device_id
        if location_id:
            ticket_data["location_id"] = location_id

        result = db.insert("support_tickets", ticket_data)
        if result:
            ticket = result[0]
            priority_names = {1: "Low", 2: "Medium", 3: "High", 4: "Critical"}
            return f"Ticket created successfully. Ticket ID: {ticket.get('ticket_id')}. Priority: {priority_names.get(priority_id)}"
        return "Error: Failed to create ticket."
    except Exception as e:
        return f"Error creating ticket: {_format_request_error(e)}"


@function_tool
def lookup_ticket(ticket_id: int) -> str:
    """
    Look up a ticket by its ID.
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
        params = {
            "organization_id": f"eq.{organization_id}",
            "status_id": "in.(1,2,3,4)",
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
        update_data = {"status_id": status_id, "updated_at": datetime.utcnow().isoformat()}
        if status_id in [5, 6]:
            update_data["closed_at"] = datetime.utcnow().isoformat()

        result = db.update("support_tickets", update_data, {"ticket_id": f"eq.{ticket_id}"})
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
        message_data = {
            "ticket_id": ticket_id,
            "content": message.strip(),
            "message_type": "text",
            "sender_agent_id": 1,  # Bot agent
        }

        result = db.insert("ticket_messages", message_data)
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
        update_data = {
            "status_id": 4,
            "requires_human_agent": to_human,
            "updated_at": datetime.utcnow().isoformat()
        }
        db.update("support_tickets", update_data, {"ticket_id": f"eq.{ticket_id}"})

        escalation_data = {
            "ticket_id": ticket_id,
            "from_agent_id": 1,
            "reason": reason,
        }
        db.insert("ticket_escalations", escalation_data)

        return f"Ticket {ticket_id} escalated. Reason: {reason}"
    except Exception as e:
        return f"Error escalating ticket: {_format_request_error(e)}"


@function_tool
def get_ticket_statuses() -> str:
    """Get all available ticket statuses."""
    try:
        rows = db._make_request("GET", "ticket_statuses", params={"select": "*"})
        if not rows:
            return "No statuses found."
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
        rows = db._make_request("GET", "ticket_priorities", params={"select": "*"})
        if not rows:
            return "No priorities found."
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
            return get_device_by_name_for_org(search_term, organization_id)

        elif query_type == "find_contact" and search_term:
            return get_contact_by_name_for_org(search_term, organization_id)

        else:
            return f"Unknown query type: {query_type}. Use: devices, locations, contacts, tickets, summary"

    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_organization_locations(organization_id: int) -> str:
    """
    Get all locations for an organization.

    IMPORTANT: Returns location_id for each location. Use the EXACT location_id
    from this response when creating tickets. NEVER make up a location_id.

    Args:
        organization_id: The organization ID

    Returns:
        JSON with locations array containing location_id, name, and type for each location.
    """
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "location_id,name,location_type"
        }
        rows = db._make_request("GET", "locations", params=params)

        if not rows:
            return f'{{"success": false, "message": "No locations found for organization {organization_id}", "locations": []}}'

        # Build structured response with clear location_ids
        locations_list = []
        for i, loc in enumerate(rows, 1):
            locations_list.append({
                "number": i,
                "location_id": loc.get("location_id"),
                "name": loc.get("name"),
                "type": loc.get("location_type", "Office")
            })

        # Build user-friendly message
        message = f"Found {len(rows)} location(s):\n"
        for loc in locations_list:
            message += f"{loc['number']}. {loc['name']} (location_id={loc['location_id']})\n"
        message += "\nAsk user to select a location by number or name. Use the exact location_id from above."

        import json
        return json.dumps({
            "success": True,
            "message": message,
            "locations": locations_list,
            "instruction": "Use the EXACT location_id value when creating ticket. NEVER guess or make up a location_id."
        }, indent=2)
    except Exception as e:
        return f'{{"success": false, "error": "{_format_request_error(e)}", "locations": []}}'


@function_tool
def get_organization_contacts(organization_id: int) -> str:
    """Get all contacts for an organization."""
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "contact_id,full_name,email,phone"
        }
        rows = db._make_request("GET", "contacts", params=params)

        if not rows:
            return f"No contacts found for organization {organization_id}"

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
        # Get organization details
        org_rows = db._make_request("GET", "organizations", params={
            "organization_id": f"eq.{organization_id}",
            "select": "name,u_e_code,manager:manager_id(full_name)"
        })

        org = org_rows[0] if org_rows else {}
        manager = org.get("manager", {}) or {}

        # Count devices
        devices = db._make_request("GET", "devices", params={
            "organization_id": f"eq.{organization_id}",
            "select": "status"
        })
        device_count = len(devices)
        online_count = sum(1 for d in devices if d.get("status") == "ONLINE")

        # Count contacts
        contacts = db._make_request("GET", "contacts", params={
            "organization_id": f"eq.{organization_id}",
            "select": "contact_id"
        })
        contact_count = len(contacts)

        # Count open tickets
        tickets = db._make_request("GET", "support_tickets", params={
            "organization_id": f"eq.{organization_id}",
            "status_id": "in.(1,2,3,4)",
            "select": "ticket_id"
        })
        ticket_count = len(tickets)

        return (
            f"=== Organization Summary ===\n"
            f"Name: {org.get('name', 'Unknown')}\n"
            f"U&E Code: {org.get('u_e_code', 'N/A')}\n"
            f"Account Manager: {manager.get('full_name', 'Not Assigned')}\n\n"
            f"Devices: {device_count} ({online_count} online, {device_count - online_count} offline)\n"
            f"Contacts: {contact_count}\n"
            f"Open Tickets: {ticket_count}"
        )
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_device_by_name_for_org(asset_name: str, organization_id: int) -> str:
    """Find a device by name within an organization."""
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "asset_name": f"ilike.*{asset_name.strip()}*",
            "select": "device_id,asset_name,status,host_name,public_ip"
        }
        rows = db._make_request("GET", "devices", params=params)

        if not rows:
            return f"No device found matching '{asset_name}' in this organization"

        result = f"Found {len(rows)} matching device(s):\n"
        for d in rows:
            result += f"- {d.get('asset_name')} ({d.get('status')}) - {d.get('host_name', 'N/A')}\n"
        return result
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_contact_by_name_for_org(name: str, organization_id: int) -> str:
    """Find a contact by name within an organization."""
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "full_name": f"ilike.*{name.strip()}*",
            "select": "contact_id,full_name,email,phone"
        }
        rows = db._make_request("GET", "contacts", params=params)

        if not rows:
            return f"No contact found matching '{name}' in this organization"

        # If exact match or single result, return detailed info with contact_id
        if len(rows) == 1:
            c = rows[0]
            return (
                f"Contact found: {c.get('full_name')}\n"
                f"Phone: {c.get('phone', 'N/A')}\n"
                f"Email: {c.get('email', 'N/A')}\n"
                f"contact_id: {c.get('contact_id')}"
            )

        # Multiple matches - list them all with IDs
        result = f"Found {len(rows)} matching contact(s):\n"
        for c in rows:
            result += f"- {c.get('full_name')} - {c.get('phone', 'N/A')} - contact_id: {c.get('contact_id')}\n"
        return result
    except Exception as e:
        return f"Error: {_format_request_error(e)}"


@function_tool
def get_account_manager(organization_id: int) -> str:
    """Get the account manager for an organization."""
    try:
        params = {
            "organization_id": f"eq.{organization_id}",
            "select": "manager:manager_id(full_name,email,phone)"
        }
        rows = db._make_request("GET", "organizations", params=params)

        if not rows:
            return f"Organization {organization_id} not found"

        manager = rows[0].get("manager", {}) or {}
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

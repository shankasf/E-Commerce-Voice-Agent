"""
Database query functions for Real Estate Voice Agent.

All functions are designed to be called as tools by the AI agents.
They return formatted strings suitable for voice responses.
"""

import logging
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any

from .connection import get_db

logger = logging.getLogger(__name__)

# Get database instance
db = get_db()


def _format_error(err: Exception) -> str:
    """Format exception for user-friendly response."""
    return str(err)


def _format_phone(phone: str) -> str:
    """Normalize phone number for database lookup."""
    if not phone:
        return ""
    return "".join(c for c in phone if c.isdigit() or c == '+')


def _format_date(d: Any) -> str:
    """Format date for display."""
    if isinstance(d, str):
        try:
            d = datetime.fromisoformat(d.replace('Z', '+00:00'))
        except:
            return d
    if isinstance(d, (datetime, date)):
        return d.strftime("%B %d, %Y")
    return str(d)


def _format_currency(amount: Any) -> str:
    """Format amount as currency."""
    try:
        return f"${float(amount):,.2f}"
    except:
        return str(amount)


# ============================================
# Tenant Lookup Functions
# ============================================

def find_tenant_by_phone(phone: str) -> str:
    """
    Look up a tenant by their phone number.
    This is the primary method to identify callers.
    
    Args:
        phone: The caller's phone number
    
    Returns:
        Tenant information if found, or message if not found.
    """
    if not phone:
        return "Phone number is required to look up tenant."
    
    try:
        clean_phone = _format_phone(phone)
        
        # Try exact match first
        params = {
            "phone": f"eq.{clean_phone}",
            "select": "tenant_id,first_name,last_name,email,phone"
        }
        rows = db._make_request("GET", "tenants", params=params)
        
        # Try with different formats if not found
        if not rows:
            # Try without + prefix
            if clean_phone.startswith('+'):
                params["phone"] = f"eq.{clean_phone[1:]}"
                rows = db._make_request("GET", "tenants", params=params)
        
        if not rows:
            # Try with ilike for partial match
            params = {
                "phone": f"ilike.%{clean_phone[-10:]}%",
                "select": "tenant_id,first_name,last_name,email,phone",
                "limit": "1"
            }
            rows = db._make_request("GET", "tenants", params=params)
        
        if not rows:
            return f"No tenant found with phone number: {phone}. This may be a new caller."
        
        tenant = rows[0]
        return (
            f"Tenant found!\n"
            f"Name: {tenant.get('first_name')} {tenant.get('last_name')}\n"
            f"Phone: {tenant.get('phone')}\n"
            f"Email: {tenant.get('email', 'Not on file')}\n"
            f"tenant_id: {tenant.get('tenant_id')}"
        )
        
    except Exception as e:
        logger.error(f"Error finding tenant: {e}")
        return f"Error looking up tenant: {_format_error(e)}"


def get_tenant_details(tenant_id: int) -> str:
    """
    Get full tenant details including lease and unit information.
    
    Args:
        tenant_id: The tenant's ID
    
    Returns:
        Complete tenant information including current lease.
    """
    try:
        params = {
            "tenant_id": f"eq.{tenant_id}",
            "select": "*"
        }
        rows = db._make_request("GET", "tenant_summary", params=params)
        
        if not rows:
            return f"No tenant found with ID: {tenant_id}"
        
        t = rows[0]
        result = (
            f"Tenant Details:\n"
            f"Name: {t.get('first_name')} {t.get('last_name')}\n"
            f"Phone: {t.get('phone')}\n"
            f"Email: {t.get('email', 'Not on file')}\n"
        )
        
        if t.get('lease_id'):
            result += (
                f"\nCurrent Lease:\n"
                f"Property: {t.get('property_name')}\n"
                f"Unit: {t.get('unit_number')}\n"
                f"Address: {t.get('property_address')}\n"
                f"Monthly Rent: {_format_currency(t.get('rent_amount'))}\n"
                f"Lease Start: {_format_date(t.get('start_date'))}\n"
                f"Lease End: {_format_date(t.get('end_date'))}\n"
                f"Current Balance: {_format_currency(t.get('current_balance'))}"
            )
        else:
            result += "\nNo active lease on file."
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting tenant details: {e}")
        return f"Error retrieving tenant details: {_format_error(e)}"


def create_tenant(
    first_name: str,
    last_name: str,
    phone: str,
    email: Optional[str] = None
) -> str:
    """
    Create a new tenant record.
    
    Args:
        first_name: Tenant's first name
        last_name: Tenant's last name
        phone: Tenant's phone number
        email: Optional email address
    
    Returns:
        Confirmation of tenant creation.
    """
    try:
        tenant_data = {
            "first_name": first_name.strip(),
            "last_name": last_name.strip(),
            "phone": _format_phone(phone),
        }
        if email:
            tenant_data["email"] = email.strip()
        
        result = db.insert("tenants", tenant_data)
        
        if result:
            tenant_id = result[0].get("tenant_id")
            return f"Tenant created successfully. Welcome, {first_name}! Your tenant ID is {tenant_id}."
        
        return "Failed to create tenant record."
        
    except Exception as e:
        logger.error(f"Error creating tenant: {e}")
        return f"Error creating tenant: {_format_error(e)}"


# ============================================
# Lease & Rent Functions
# ============================================

def get_rent_balance(tenant_id: int) -> str:
    """
    Get the current rent balance for a tenant.
    
    Args:
        tenant_id: The tenant's ID
    
    Returns:
        Current balance and recent transaction history.
    """
    try:
        # Get active lease
        lease_params = {
            "tenant_id": f"eq.{tenant_id}",
            "status": "eq.active",
            "select": "lease_id,rent_amount,start_date,end_date,unit_id"
        }
        leases = db._make_request("GET", "leases", params=lease_params)
        
        if not leases:
            return "No active lease found for this tenant."
        
        lease = leases[0]
        lease_id = lease.get("lease_id")
        
        # Get recent ledger entries
        ledger_params = {
            "lease_id": f"eq.{lease_id}",
            "select": "transaction_date,transaction_type,description,amount,balance",
            "order": "transaction_date.desc",
            "limit": "5"
        }
        ledger = db._make_request("GET", "rent_ledger", params=ledger_params)
        
        # Current balance is the most recent entry's balance
        current_balance = ledger[0].get("balance", 0) if ledger else 0
        
        result = f"Rent Balance Summary:\n"
        result += f"Monthly Rent: {_format_currency(lease.get('rent_amount'))}\n"
        result += f"Current Balance: {_format_currency(current_balance)}\n"
        
        if current_balance > 0:
            result += "⚠️ Payment is due.\n"
        elif current_balance < 0:
            result += f"Credit on account: {_format_currency(abs(current_balance))}\n"
        else:
            result += "✓ Account is current.\n"
        
        if ledger:
            result += "\nRecent Transactions:\n"
            for entry in ledger[:3]:
                result += (
                    f"- {_format_date(entry.get('transaction_date'))}: "
                    f"{entry.get('description')} "
                    f"({_format_currency(entry.get('amount'))})\n"
                )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting rent balance: {e}")
        return f"Error retrieving rent balance: {_format_error(e)}"


def get_lease_info(tenant_id: int) -> str:
    """
    Get lease information for a tenant.
    
    Args:
        tenant_id: The tenant's ID
    
    Returns:
        Lease details including dates, rent, and renewal info.
    """
    try:
        params = {
            "tenant_id": f"eq.{tenant_id}",
            "status": "eq.active",
            "select": (
                "lease_id,start_date,end_date,rent_amount,deposit_amount,"
                "deposit_paid,lease_type,auto_renew,renewal_notice_days,"
                "unit:unit_id(unit_number,bedrooms,bathrooms,square_feet,"
                "property:property_id(name,address))"
            )
        }
        leases = db._make_request("GET", "leases", params=params)
        
        if not leases:
            return "No active lease found for this tenant."
        
        l = leases[0]
        unit = l.get("unit", {}) or {}
        prop = unit.get("property", {}) or {}
        
        # Calculate days until lease end
        end_date_str = l.get("end_date")
        if not end_date_str:
            return "Lease information is incomplete - no end date found."
        
        try:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00')).date()
        except (ValueError, AttributeError):
            end_date = date.today()
        
        days_remaining = (end_date - date.today()).days
        
        result = (
            f"Lease Information:\n"
            f"Property: {prop.get('name')}\n"
            f"Address: {prop.get('address')}\n"
            f"Unit: {unit.get('unit_number')}\n"
            f"Bedrooms: {unit.get('bedrooms')} | Bathrooms: {unit.get('bathrooms')}\n"
            f"Square Feet: {unit.get('square_feet')}\n\n"
            f"Lease Term: {_format_date(l.get('start_date'))} to {_format_date(l.get('end_date'))}\n"
            f"Monthly Rent: {_format_currency(l.get('rent_amount'))}\n"
            f"Security Deposit: {_format_currency(l.get('deposit_amount'))}\n"
            f"Lease Type: {l.get('lease_type', 'annual').replace('_', ' ').title()}\n"
        )
        
        if days_remaining <= 90:
            result += f"\n⚠️ Lease expires in {days_remaining} days!\n"
            if l.get("auto_renew"):
                result += "Auto-renewal is enabled.\n"
            else:
                result += f"Please contact us {l.get('renewal_notice_days', 60)} days before expiration to discuss renewal.\n"
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting lease info: {e}")
        return f"Error retrieving lease information: {_format_error(e)}"


def record_payment(
    tenant_id: int,
    amount: float,
    payment_method: str = "phone",
    notes: Optional[str] = None
) -> str:
    """
    Record a rent payment for a tenant.
    
    Args:
        tenant_id: The tenant's ID
        amount: Payment amount
        payment_method: How payment was made (phone, online, check, etc.)
        notes: Optional notes about the payment
    
    Returns:
        Payment confirmation.
    """
    try:
        # Get active lease
        lease_params = {
            "tenant_id": f"eq.{tenant_id}",
            "status": "eq.active",
            "select": "lease_id"
        }
        leases = db._make_request("GET", "leases", params=lease_params)
        
        if not leases:
            return "No active lease found. Cannot record payment."
        
        lease_id = leases[0].get("lease_id")
        
        # Get current balance
        ledger_params = {
            "lease_id": f"eq.{lease_id}",
            "select": "balance",
            "order": "transaction_date.desc,ledger_id.desc",
            "limit": "1"
        }
        ledger = db._make_request("GET", "rent_ledger", params=ledger_params)
        current_balance = ledger[0].get("balance", 0) if ledger else 0
        
        new_balance = float(current_balance) - float(amount)
        
        # Create payment record
        payment_data = {
            "lease_id": lease_id,
            "tenant_id": tenant_id,
            "amount": amount,
            "payment_type": "rent",
            "payment_method": payment_method,
            "payment_date": date.today().isoformat(),
            "status": "completed",
            "notes": notes
        }
        db.insert("payments", payment_data)
        
        # Update ledger
        ledger_data = {
            "lease_id": lease_id,
            "transaction_date": date.today().isoformat(),
            "transaction_type": "payment",
            "description": f"Payment received via {payment_method}",
            "amount": -amount,  # Negative for payments
            "balance": new_balance
        }
        db.insert("rent_ledger", ledger_data)
        
        result = (
            f"Payment recorded successfully!\n"
            f"Amount: {_format_currency(amount)}\n"
            f"New Balance: {_format_currency(new_balance)}\n"
        )
        
        if new_balance <= 0:
            result += "Thank you! Your account is now current."
        else:
            result += f"Remaining balance due: {_format_currency(new_balance)}"
        
        return result
        
    except Exception as e:
        logger.error(f"Error recording payment: {e}")
        return f"Error recording payment: {_format_error(e)}"


# ============================================
# Maintenance Functions
# ============================================

def create_maintenance_request(
    tenant_id: int,
    title: str,
    description: str,
    category: str = "General",
    priority: str = "normal",
    permission_to_enter: bool = False,
    preferred_time: Optional[str] = None
) -> str:
    """
    Create a new maintenance request.
    
    Args:
        tenant_id: The tenant's ID
        title: Brief title of the issue
        description: Detailed description of the problem
        category: Category (Plumbing, Electrical, HVAC, Appliances, etc.)
        priority: Priority level (emergency, urgent, normal, low)
        permission_to_enter: Whether maintenance can enter without tenant present
        preferred_time: When tenant prefers maintenance to visit
    
    Returns:
        Confirmation with request ID.
    """
    try:
        # Get tenant's unit
        lease_params = {
            "tenant_id": f"eq.{tenant_id}",
            "status": "eq.active",
            "select": "unit_id"
        }
        leases = db._make_request("GET", "leases", params=lease_params)
        
        if not leases:
            return "No active lease found. Cannot create maintenance request."
        
        unit_id = leases[0].get("unit_id")
        
        # Get category ID
        cat_params = {
            "name": f"ilike.{category}%",
            "select": "category_id",
            "limit": "1"
        }
        categories = db._make_request("GET", "maintenance_categories", params=cat_params)
        category_id = categories[0].get("category_id") if categories else None
        
        # Create request
        request_data = {
            "unit_id": unit_id,
            "tenant_id": tenant_id,
            "category_id": category_id,
            "title": title,
            "description": description,
            "priority": priority.lower(),
            "status": "open",
            "reported_via": "phone",
            "permission_to_enter": permission_to_enter,
            "preferred_access_time": preferred_time
        }
        
        result = db.insert("maintenance_requests", request_data)
        
        if result:
            request_id = result[0].get("request_id")
            
            response = (
                f"Maintenance request created successfully!\n"
                f"Request ID: #{request_id}\n"
                f"Issue: {title}\n"
                f"Priority: {priority.title()}\n"
            )
            
            if priority.lower() == "emergency":
                response += "\n🚨 EMERGENCY: A technician will be dispatched immediately.\n"
            elif priority.lower() == "urgent":
                response += "\nWe will address this within 24 hours.\n"
            else:
                response += "\nWe will address this within 48-72 hours.\n"
            
            if permission_to_enter:
                response += "Permission to enter has been noted.\n"
            
            return response
        
        return "Failed to create maintenance request."
        
    except Exception as e:
        logger.error(f"Error creating maintenance request: {e}")
        return f"Error creating maintenance request: {_format_error(e)}"


def get_maintenance_status(tenant_id: int, request_id: Optional[int] = None) -> str:
    """
    Get status of maintenance requests for a tenant.
    
    Args:
        tenant_id: The tenant's ID
        request_id: Optional specific request ID to check
    
    Returns:
        Status of maintenance request(s).
    """
    try:
        params = {
            "tenant_id": f"eq.{tenant_id}",
            "select": (
                "request_id,title,description,priority,status,created_at,"
                "scheduled_date,assigned_to,resolution_notes,"
                "category:category_id(name)"
            ),
            "order": "created_at.desc"
        }
        
        if request_id:
            params["request_id"] = f"eq.{request_id}"
            params["limit"] = "1"
        else:
            params["limit"] = "5"
        
        requests = db._make_request("GET", "maintenance_requests", params=params)
        
        if not requests:
            if request_id:
                return f"No maintenance request found with ID #{request_id}."
            return "No maintenance requests found for your account."
        
        result = "Maintenance Request Status:\n\n"
        
        for req in requests:
            category = req.get("category", {}) or {}
            status = req.get("status", "").replace("_", " ").title()
            
            result += f"Request #{req.get('request_id')}: {req.get('title')}\n"
            result += f"  Category: {category.get('name', 'General')}\n"
            result += f"  Priority: {req.get('priority', 'normal').title()}\n"
            result += f"  Status: {status}\n"
            result += f"  Submitted: {_format_date(req.get('created_at'))}\n"
            
            if req.get("scheduled_date"):
                result += f"  Scheduled: {_format_date(req.get('scheduled_date'))}\n"
            
            if req.get("assigned_to"):
                result += f"  Assigned to: {req.get('assigned_to')}\n"
            
            if req.get("resolution_notes"):
                result += f"  Notes: {req.get('resolution_notes')}\n"
            
            result += "\n"
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting maintenance status: {e}")
        return f"Error retrieving maintenance status: {_format_error(e)}"


def update_maintenance_request(
    request_id: int,
    additional_info: Optional[str] = None,
    permission_to_enter: Optional[bool] = None,
    preferred_time: Optional[str] = None
) -> str:
    """
    Update an existing maintenance request.
    
    Args:
        request_id: The request ID to update
        additional_info: Additional information to add
        permission_to_enter: Update entry permission
        preferred_time: Update preferred access time
    
    Returns:
        Confirmation of update.
    """
    try:
        update_data = {}
        
        if permission_to_enter is not None:
            update_data["permission_to_enter"] = permission_to_enter
        
        if preferred_time:
            update_data["preferred_access_time"] = preferred_time
        
        if update_data:
            db.update(
                "maintenance_requests",
                update_data,
                {"request_id": f"eq.{request_id}"}
            )
        
        # Add comment if additional info provided
        if additional_info:
            comment_data = {
                "request_id": request_id,
                "author_type": "tenant",
                "author_name": "Tenant (via phone)",
                "comment": additional_info
            }
            db.insert("maintenance_comments", comment_data)
        
        return f"Maintenance request #{request_id} has been updated successfully."
        
    except Exception as e:
        logger.error(f"Error updating maintenance request: {e}")
        return f"Error updating request: {_format_error(e)}"


# ============================================
# Property Functions
# ============================================

def get_available_units(
    bedrooms: Optional[int] = None,
    max_rent: Optional[float] = None,
    property_name: Optional[str] = None
) -> str:
    """
    Search for available rental units.
    
    Args:
        bedrooms: Number of bedrooms (optional filter)
        max_rent: Maximum monthly rent (optional filter)
        property_name: Property name to search (optional filter)
    
    Returns:
        List of available units matching criteria.
    """
    try:
        params = {
            "status": "eq.available",
            "select": (
                "unit_id,unit_number,bedrooms,bathrooms,square_feet,"
                "rent_amount,deposit_amount,features,available_date,"
                "property:property_id(name,address,city,state,amenities)"
            ),
            "order": "rent_amount.asc",
            "limit": "10"
        }
        
        if bedrooms:
            params["bedrooms"] = f"eq.{bedrooms}"
        
        if max_rent:
            params["rent_amount"] = f"lte.{max_rent}"
        
        units = db._make_request("GET", "units", params=params)
        
        if not units:
            result = "No available units found"
            if bedrooms or max_rent:
                result += " matching your criteria"
            result += ". Would you like to join our waiting list?"
            return result
        
        result = f"Found {len(units)} available unit(s):\n\n"
        
        for unit in units:
            prop = unit.get("property", {}) or {}
            
            result += f"📍 {prop.get('name')} - Unit {unit.get('unit_number')}\n"
            result += f"   {prop.get('address')}, {prop.get('city')}, {prop.get('state')}\n"
            result += f"   {unit.get('bedrooms')} bed / {unit.get('bathrooms')} bath"
            if unit.get("square_feet"):
                result += f" | {unit.get('square_feet')} sq ft"
            result += f"\n"
            result += f"   Rent: {_format_currency(unit.get('rent_amount'))}/month\n"
            result += f"   Deposit: {_format_currency(unit.get('deposit_amount'))}\n"
            
            if unit.get("available_date"):
                result += f"   Available: {_format_date(unit.get('available_date'))}\n"
            else:
                result += f"   Available: Immediately\n"
            
            features = unit.get("features") or []
            if features:
                result += f"   Features: {', '.join(features)}\n"
            
            amenities = prop.get("amenities") or []
            if amenities:
                result += f"   Amenities: {', '.join(amenities[:5])}\n"
            
            result += "\n"
        
        return result
        
    except Exception as e:
        logger.error(f"Error searching units: {e}")
        return f"Error searching for available units: {_format_error(e)}"


def get_property_info(property_name: str) -> str:
    """
    Get information about a specific property.
    
    Args:
        property_name: Name of the property
    
    Returns:
        Property details and amenities.
    """
    try:
        params = {
            "name": f"ilike.%{property_name}%",
            "select": (
                "property_id,name,address,city,state,zip_code,"
                "property_type,total_units,year_built,amenities,description,"
                "company:company_id(name,phone,email,office_hours,emergency_phone)"
            ),
            "limit": "1"
        }
        
        properties = db._make_request("GET", "properties", params=params)
        
        if not properties:
            return f"No property found matching '{property_name}'."
        
        p = properties[0]
        company = p.get("company", {}) or {}
        
        result = (
            f"Property Information:\n"
            f"Name: {p.get('name')}\n"
            f"Address: {p.get('address')}, {p.get('city')}, {p.get('state')} {p.get('zip_code')}\n"
            f"Type: {p.get('property_type', '').replace('_', ' ').title()}\n"
            f"Total Units: {p.get('total_units')}\n"
        )
        
        if p.get("year_built"):
            result += f"Year Built: {p.get('year_built')}\n"
        
        if p.get("description"):
            result += f"\n{p.get('description')}\n"
        
        amenities = p.get("amenities") or []
        if amenities:
            result += f"\nAmenities: {', '.join(amenities)}\n"
        
        result += (
            f"\nManaged by: {company.get('name')}\n"
            f"Office Phone: {company.get('phone')}\n"
            f"Office Hours: {company.get('office_hours')}\n"
            f"Emergency Line: {company.get('emergency_phone')}\n"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting property info: {e}")
        return f"Error retrieving property information: {_format_error(e)}"


def get_office_info() -> str:
    """
    Get property management office information.
    
    Returns:
        Office contact information and hours.
    """
    try:
        params = {
            "select": "name,phone,email,address,office_hours,emergency_phone,website",
            "limit": "1"
        }
        
        companies = db._make_request("GET", "companies", params=params)
        
        if not companies:
            return "Office information not available."
        
        c = companies[0]
        
        return (
            f"Property Management Office:\n"
            f"Company: {c.get('name')}\n"
            f"Phone: {c.get('phone')}\n"
            f"Email: {c.get('email')}\n"
            f"Address: {c.get('address')}\n"
            f"Office Hours: {c.get('office_hours')}\n"
            f"Emergency Line: {c.get('emergency_phone')}\n"
            f"Website: {c.get('website', 'Not available')}\n"
        )
        
    except Exception as e:
        logger.error(f"Error getting office info: {e}")
        return f"Error retrieving office information: {_format_error(e)}"


# ============================================
# Call Logging Functions
# ============================================

def log_call_start(
    call_sid: str,
    session_id: str,
    phone_from: str,
    phone_to: str,
    direction: str = "inbound",
    tenant_id: Optional[int] = None
) -> str:
    """Log the start of a phone call."""
    try:
        call_data = {
            "call_sid": call_sid,
            "session_id": session_id,
            "phone_from": phone_from,
            "phone_to": phone_to,
            "direction": direction,
            "status": "in-progress",
            "tenant_id": tenant_id
        }
        
        db.insert("call_logs", call_data)
        return f"Call logged: {call_sid}"
        
    except Exception as e:
        logger.error(f"Error logging call: {e}")
        return f"Error logging call: {_format_error(e)}"


def log_call_end(
    call_sid: str,
    duration_seconds: int,
    agent_type: Optional[str] = None,
    call_summary: Optional[str] = None,
    transcript: Optional[str] = None
) -> str:
    """Log the end of a phone call."""
    try:
        update_data = {
            "status": "completed",
            "duration_seconds": duration_seconds,
            "ended_at": datetime.now(timezone.utc).isoformat()
        }
        
        if agent_type:
            update_data["agent_type"] = agent_type
        if call_summary:
            update_data["call_summary"] = call_summary
        if transcript:
            update_data["transcript"] = transcript
        
        db.update(
            "call_logs",
            update_data,
            {"call_sid": f"eq.{call_sid}"}
        )
        
        return f"Call ended: {call_sid}"
        
    except Exception as e:
        logger.error(f"Error updating call log: {e}")
        return f"Error updating call: {_format_error(e)}"

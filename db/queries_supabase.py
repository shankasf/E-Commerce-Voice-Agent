"""
Supabase REST API Queries

Simplified queries using Supabase REST API instead of direct PostgreSQL.
This module provides the same function tools but uses HTTP REST calls.
"""

from datetime import datetime
import requests
import urllib.parse
from typing import Any, List, Optional

from agents import function_tool

from .database import db


# Status constants
ORDER_STATUSES = ["Pending", "Paid", "Cancelled", "Refunded", "PartiallyRefunded", "Fulfilled"]
PAYMENT_STATUSES = ["Pending", "Authorized", "Captured", "Failed", "Cancelled"]
ITEM_TYPES = ["Product", "Ticket", "Party"]
PARTY_STATUSES = ["Pending", "Confirmed", "Cancelled", "Completed", "Refunded", "Rescheduled"]


def _normalize_choice(value: str, choices: List[str]) -> Optional[str]:
    lowered = value.strip().lower()
    for option in choices:
        if lowered == option.lower():
            return option
    return None


def _parse_datetime(dt_str: str) -> datetime:
    """Parse ISO datetime, allowing trailing Z for UTC."""
    cleaned = dt_str.strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    return datetime.fromisoformat(cleaned)


def _format_request_error(err: Exception) -> str:
    """Return user-friendly message from a requests error body."""
    body = ""
    if isinstance(err, requests.exceptions.RequestException) and err.response is not None:
        try:
            body = err.response.text or ""
        except Exception:
            body = ""

    if "invalid input syntax for type timestamp" in (body or "").lower():
        return (
            "Invalid date/time format. Please give times as YYYY-MM-DDTHH:MM:SS with timezone, "
            "e.g., 2025-12-13T15:00:00Z."
        )

    return body or str(err)


def _find_existing_customer(email: str = "", phone: str = "") -> Optional[dict]:
    """Find an existing customer by email or phone."""
    filters = []
    if email.strip():
        filters.append(f"email.eq.{email.strip()}")
    if phone.strip():
        filters.append(f"phone.eq.{phone.strip()}")

    if not filters:
        return None

    params = {
        "or": f"({','.join(filters)})",
        "limit": "1",
    }

    rows = db._make_request("GET", "customers", params=params)
    return rows[0] if rows else None


def _ensure_customer(
    customer_id: Optional[int],
    full_name: str = "",
    email: str = "",
    phone: str = "",
    guardian_name: str = "",
    child_name: str = "",
    child_birthdate: str = "",
    notes: str = "",
) -> tuple[Optional[int], str]:
    """Return a valid customer_id, reusing an existing profile when possible."""
    try:
        if customer_id:
            existing = db.get_by_id("customers", "customer_id", customer_id)
            if existing:
                return customer_id, f"Using provided customer #{customer_id}."
            return None, "Customer not found for provided customer_id."

        matched = _find_existing_customer(email=email, phone=phone)
        if matched:
            cid = matched.get("customer_id")
            name = matched.get("full_name", "existing customer")
            return cid, f"Using existing customer_id={cid} for {name}."

        if not full_name.strip():
            return None, "full_name is required to create a customer."

        if child_birthdate:
            try:
                datetime.strptime(child_birthdate, "%Y-%m-%d")
            except ValueError:
                return None, "child_birthdate must use YYYY-MM-DD format."

        payload = {
            "full_name": full_name.strip(),
            "email": email.strip() or None,
            "phone": phone.strip() or None,
            "guardian_name": guardian_name.strip() or None,
            "child_name": child_name.strip() or None,
            "child_birthdate": child_birthdate or None,
            "notes": notes.strip() or None,
        }

        created = db._make_request(
            "POST",
            "customers",
            data=payload,
            prefer="return=representation,resolution=merge-duplicates",
        )

        if created and len(created) > 0:
            cid = created[0].get("customer_id")
            return cid, f"Created customer profile. customer_id={cid}."

        return None, "Failed to create customer profile."
    except Exception as exc:
        return None, f"Error ensuring customer: {str(exc)}"


@function_tool
def create_customer_profile(
    full_name: str,
    email: str,
    phone: str,
    guardian_name: str,
    child_name: str,
    child_birthdate: str,
    notes: str = "",
) -> str:
    """
    Create a customer record with the provided details and return the new customer_id.
    """
    if not full_name.strip():
        return "full_name is required."

    try:
        if child_birthdate:
            datetime.strptime(child_birthdate, "%Y-%m-%d")
    except ValueError:
        return "child_birthdate must use YYYY-MM-DD format."

    try:
        data = {
            "full_name": full_name.strip(),
            "email": email.strip() or None,
            "phone": phone.strip() or None,
            "guardian_name": guardian_name.strip() or None,
            "child_name": child_name.strip() or None,
            "child_birthdate": child_birthdate or None,
            "notes": notes.strip() or None,
        }
        result = db.insert("customers", data)
        if result and len(result) > 0:
            customer_id = result[0].get("customer_id")
            return f"Customer profile created. customer_id={customer_id}"
        return "Failed to create customer profile."
    except Exception as e:
        return f"Error creating customer: {str(e)}"


@function_tool
def search_products(
    keyword: str = "",
    category: str = "",
    age_group: str = "",
    max_results: int = 5,
) -> str:
    """
    Look up active products that match optional filters.
    """
    max_results = max(1, min(max_results, 20))
    
    try:
        # Build filter query
        endpoint = f"products?is_active=eq.true&limit={max_results}&order=stock_qty.desc,price_usd.asc"
        
        if keyword:
            endpoint += f"&or=(product_name.ilike.*{keyword}*,brand.ilike.*{keyword}*,sku.ilike.*{keyword}*)"
        if category:
            endpoint += f"&category=ilike.*{category}*"
        if age_group:
            endpoint += f"&age_group=ilike.*{age_group}*"
        
        rows = db._make_request("GET", endpoint)
        
        if not rows:
            return "No matching toys found."

        lines = ["Matching toys:"]
        for row in rows:
            product_id = row.get("product_id")
            name = row.get("product_name")
            cat = row.get("category", "Uncategorized")
            age = row.get("age_group", "")
            price = row.get("price_usd", 0)
            stock = row.get("stock_qty", 0)
            
            age_text = f" for ages {age}" if age else ""
            lines.append(
                f"- #{product_id} {name} ({cat}{age_text}) - "
                f"${price:.2f}, stock {stock}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching products: {str(e)}"


@function_tool
def get_product_details(product_id: int) -> str:
    """
    Return enriched product information, including description and features.
    """
    try:
        row = db.get_by_id("products", "product_id", product_id)
        
        if not row or not row.get("is_active"):
            return "Toy not found or inactive."

        details = [
            f"{row.get('product_name')} details:",
            f"- Brand: {row.get('brand', 'N/A')}",
            f"- Category: {row.get('category', 'N/A')}",
            f"- Age group: {row.get('age_group', 'All ages')}",
            f"- Material: {row.get('material', 'Not specified')}",
            f"- Color: {row.get('color', 'Various')}",
            f"- Price: ${row.get('price_usd', 0):.2f}",
            f"- Stock: {row.get('stock_qty', 0)}",
        ]
        
        if row.get("rating"):
            details.append(f"- Rating: {row['rating']:.2f}/5")
        if row.get("country"):
            details.append(f"- Country of origin: {row['country']}")
        if row.get("description"):
            details.append(f"\nDescription:\n{row['description'].strip()}")
        if row.get("features"):
            details.append(f"\nFeatures:\n{row['features'].strip()}")
        
        return "\n".join(details)
    except Exception as e:
        return f"Error getting product details: {str(e)}"


@function_tool
def get_ticket_pricing(location_name: str = "") -> str:
    """
    Summarize active ticket pricing, optionally filtered by location name.
    """
    try:
        endpoint = "ticket_types?is_active=eq.true&select=*,locations(name)"
        rows = db._make_request("GET", endpoint)
        
        if not rows:
            return "No ticket options available."

        lines = ["Admission ticket pricing:"]
        for row in rows:
            name = row.get("name")
            price = row.get("base_price_usd", 0)
            waiver = row.get("requires_waiver", False)
            socks = row.get("requires_grip_socks", False)
            location = row.get("locations", {})
            loc_name = location.get("name", "All Locations") if location else "All Locations"
            
            if location_name and location_name.lower() not in loc_name.lower():
                continue
            
            tags = []
            if waiver:
                tags.append("waiver required")
            if socks:
                tags.append("grip socks required")
            tag_text = f" ({', '.join(tags)})" if tags else ""
            lines.append(f"- {loc_name}: {name} - ${price:.2f}{tag_text}")
        
        return "\n".join(lines) if len(lines) > 1 else "No ticket options available for that location."
    except Exception as e:
        return f"Error getting ticket pricing: {str(e)}"


@function_tool
def list_party_packages(location_name: str = "") -> str:
    """
    List party packages with pricing and inclusions.
    """
    try:
        endpoint = "party_packages?is_active=eq.true&select=*,locations(name)"
        rows = db._make_request("GET", endpoint)
        
        if not rows:
            return "No party packages found."

        lines = ["Party packages:"]
        for row in rows:
            name = row.get("name")
            price = row.get("price_usd", 0)
            base_children = row.get("base_children", 0)
            base_hours = row.get("base_room_hours", 0)
            food = row.get("includes_food", False)
            drinks = row.get("includes_drinks", False)
            decor = row.get("includes_decor", False)
            location = row.get("locations", {})
            loc_name = location.get("name", "All Locations") if location else "All Locations"
            
            if location_name and location_name.lower() not in loc_name.lower():
                continue
            
            perks = []
            if food:
                perks.append("food")
            if drinks:
                perks.append("drinks")
            if decor:
                perks.append("decor")
            perk_text = f" Includes {', '.join(perks)}." if perks else ""
            
            lines.append(
                f"- {loc_name}: {name} - ${price:.2f} for {base_children} kids, "
                f"{base_hours} hours.{perk_text}"
            )
        
        return "\n".join(lines) if len(lines) > 1 else "No party packages found for that location."
    except Exception as e:
        return f"Error listing party packages: {str(e)}"


@function_tool
def get_party_availability(
    start_datetime: str,
    end_datetime: str,
    location_name: str = "",
) -> str:
    """
    Show booked party room slots within a window to help gauge availability.
    """
    try:
        start = _parse_datetime(start_datetime)
        end = _parse_datetime(end_datetime)
    except ValueError:
        return "Invalid datetime. Use ISO format like 2025-01-15T14:00."
    
    if end <= start:
        return "end_datetime must be after start_datetime."

    try:
        start_q = urllib.parse.quote(start.isoformat())
        end_q = urllib.parse.quote(end.isoformat())
        endpoint = (
            "party_bookings?status=in.(Pending,Confirmed)"
            f"&scheduled_start=lt.{end_q}&scheduled_end=gt.{start_q}"
            "&select=*,resources(name,locations(name))"
        )
        rows = db._make_request("GET", endpoint)
        
        if not rows:
            return "No existing bookings; all rooms appear open in that window."

        lines = ["Booked party slots in that window:"]
        for row in rows:
            resource = row.get("resources", {}) or {}
            room_name = resource.get("name", "Unknown Room")
            location = resource.get("locations", {}) or {}
            loc_name = location.get("name", "Unknown Location")
            
            if location_name and location_name.lower() not in loc_name.lower():
                continue
            
            booked_start = row.get("scheduled_start", "")
            booked_end = row.get("scheduled_end", "")
            status = row.get("status", "")
            
            lines.append(f"- {loc_name} - {room_name} booked {booked_start} to {booked_end} ({status})")
        
        return "\n".join(lines)
    except Exception as e:
        if isinstance(e, requests.exceptions.RequestException):
            return _format_request_error(e)
        return f"Error checking availability: {str(e)}"


@function_tool
def create_party_booking(
    package_id: int,
    resource_id: int,
    scheduled_start: str,
    scheduled_end: str,
    customer_id: Optional[int] = None,
    full_name: str = "",
    email: str = "",
    phone: str = "",
    guardian_name: str = "",
    child_name: str = "",
    child_birthdate: str = "",
    additional_kids: int = 0,
    additional_guests: int = 0,
    special_requests: str = "",
    status: str = "Pending",
    notes: str = "",
) -> str:
    """
    Create a new party booking record. If customer_id is not provided, reuse an existing
    profile by email/phone or create a new customer automatically.
    """
    if additional_kids < 0 or additional_guests < 0:
        return "additional_kids and additional_guests must be zero or greater."

    normalized_status = _normalize_choice(status, PARTY_STATUSES)
    if not normalized_status:
        return "Status must be one of: " + ", ".join(PARTY_STATUSES)

    try:
        start_dt = _parse_datetime(scheduled_start)
        end_dt = _parse_datetime(scheduled_end)
    except ValueError:
        return "Invalid datetime format. Use ISO format, e.g., 2025-11-03T12:00."
    
    if end_dt <= start_dt:
        return "scheduled_end must be after scheduled_start."

    try:
        # Require key customer + party inputs before writing
        missing = []
        if not full_name.strip() and not customer_id:
            missing.append("full_name")
        if not child_name.strip() and not customer_id:
            missing.append("child_name")
        if not child_birthdate.strip() and not customer_id:
            missing.append("child_birthdate (YYYY-MM-DD)")
        if not (email.strip() or phone.strip()) and not customer_id:
            missing.append("contact (email or phone)")
        if not guardian_name.strip() and not customer_id:
            missing.append("guardian_name")
        if missing:
            return "Missing required fields before booking: " + ", ".join(missing)

        ensured_id, customer_msg = _ensure_customer(
            customer_id,
            full_name=full_name,
            email=email,
            phone=phone,
            guardian_name=guardian_name,
            child_name=child_name,
            child_birthdate=child_birthdate,
            notes=notes,
        )
        if not ensured_id:
            return customer_msg

        start_q = urllib.parse.quote(start_dt.isoformat())
        end_q = urllib.parse.quote(end_dt.isoformat())
        endpoint = (
            f"party_bookings?resource_id=eq.{resource_id}&status=in.(Pending,Confirmed)"
            f"&scheduled_start=lt.{end_q}&scheduled_end=gt.{start_q}"
        )
        try:
            conflicts = db._make_request("GET", endpoint)
        except requests.exceptions.RequestException as e:
            return _format_request_error(e)

        if conflicts:
            return "That room is already booked during the requested time."

        combined_requests = special_requests.strip() or notes.strip() or None

        data = {
            "package_id": package_id,
            "resource_id": resource_id,
            "customer_id": ensured_id,
            "scheduled_start": start_dt.isoformat(),
            "scheduled_end": end_dt.isoformat(),
            "status": normalized_status,
            "additional_kids": additional_kids,
            "additional_guests": additional_guests,
            "special_requests": combined_requests,
        }
        try:
            result = db.insert("party_bookings", data)
        except requests.exceptions.RequestException as e:
            return _format_request_error(e)
        if result and len(result) > 0:
            booking_id = result[0].get("booking_id")
            return (
                f"{customer_msg} Created party booking #{booking_id} from {start_dt:%Y-%m-%d %H:%M} "
                f"to {end_dt:%Y-%m-%d %H:%M} with status {normalized_status}."
            )
        return "Failed to create booking."
    except Exception as e:
        if isinstance(e, requests.exceptions.RequestException):
            return _format_request_error(e)
        return f"Error creating booking: {str(e)}"


@function_tool
def update_party_booking(
    booking_id: int,
    status: str = "",
    scheduled_start: str = "",
    scheduled_end: str = "",
    additional_kids: Optional[int] = None,
    additional_guests: Optional[int] = None,
    special_requests: Optional[str] = None,
    reschedule_reason: str = "",
) -> str:
    """
    Update fields on an existing party booking.
    """
    try:
        booking = db.get_by_id("party_bookings", "booking_id", booking_id)
        if not booking:
            return "Booking not found."

        updates = {}

        if status:
            normalized_status = _normalize_choice(status, PARTY_STATUSES)
            if not normalized_status:
                return "Status must be one of: " + ", ".join(PARTY_STATUSES)
            updates["status"] = normalized_status

        if scheduled_start:
            try:
                updates["scheduled_start"] = datetime.fromisoformat(scheduled_start).isoformat()
            except ValueError:
                return "Invalid scheduled_start datetime format."

        if scheduled_end:
            try:
                updates["scheduled_end"] = datetime.fromisoformat(scheduled_end).isoformat()
            except ValueError:
                return "Invalid scheduled_end datetime format."

        if additional_kids is not None:
            if additional_kids < 0:
                return "additional_kids must be zero or greater."
            updates["additional_kids"] = additional_kids

        if additional_guests is not None:
            if additional_guests < 0:
                return "additional_guests must be zero or greater."
            updates["additional_guests"] = additional_guests

        if special_requests is not None:
            updates["special_requests"] = special_requests.strip() or None

        if not updates:
            return "No updates were provided."

        db.update("party_bookings", "booking_id", booking_id, updates)
        return f"Updated party booking #{booking_id}."
    except Exception as e:
        return f"Error updating booking: {str(e)}"


@function_tool
def get_store_policies(topic: str = "") -> str:
    """
    Retrieve active policy notes, optionally filtered by a keyword.
    """
    try:
        endpoint = "policies?is_active=eq.true&order=key"
        rows = db._make_request("GET", endpoint)
        
        if topic:
            rows = [r for r in rows if topic.lower() in r.get("key", "").lower() or topic.lower() in r.get("value", "").lower()]
        
        if not rows:
            return "No active policies found for that topic."

        return "\n".join(f"- {row.get('key')}: {row.get('value')}" for row in rows)
    except Exception as e:
        return f"Error getting policies: {str(e)}"


@function_tool
def list_store_locations(only_active: bool = True) -> str:
    """
    List store locations and their contact details.
    """
    try:
        endpoint = "locations?order=name"
        if only_active:
            endpoint += "&is_active=eq.true"
        
        rows = db._make_request("GET", endpoint)
        
        if not rows:
            return "No locations found."

        lines = ["Store locations:"]
        for row in rows:
            location_id = row.get("location_id")
            name = row.get("name")
            address = row.get("address_line", "")
            city = row.get("city", "")
            state = row.get("state", "")
            postal_code = row.get("postal_code", "")
            country = row.get("country", "")
            phone = row.get("phone", "N/A")
            email = row.get("email", "N/A")
            is_active = row.get("is_active", False)
            
            status = "Active" if is_active else "Inactive"
            address_parts = [p for p in [address, city, state, postal_code] if p]
            address_str = ", ".join(address_parts) or "Address not set"
            
            lines.append(
                f"- #{location_id} {name} ({status}) – {address_str}; "
                f"Phone: {phone}; Email: {email}; Country: {country or 'N/A'}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing locations: {str(e)}"


@function_tool
def search_orders(status: str = "", customer_name: str = "", limit: int = 5) -> str:
    """
    Search orders by status or customer name.
    """
    limit = max(1, min(limit, 20))
    
    try:
        endpoint = f"orders?select=*,customers(full_name)&order=created_at.desc&limit={limit}"
        
        if status:
            endpoint += f"&status=ilike.{status}"
        
        rows = db._make_request("GET", endpoint)
        
        if customer_name:
            rows = [r for r in rows if customer_name.lower() in (r.get("customers", {}) or {}).get("full_name", "").lower()]
        
        if not rows:
            return "No orders matched those filters."

        lines = ["Matching orders:"]
        for row in rows:
            order_id = row.get("order_id")
            order_type = row.get("order_type", "")
            status_val = row.get("status", "")
            total = row.get("total_usd", 0)
            created = row.get("created_at", "")[:10]
            customer = (row.get("customers") or {}).get("full_name", "Guest")
            
            lines.append(
                f"- #{order_id} {customer} - {order_type} {status_val} "
                f"(${total:.2f}) created {created}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching orders: {str(e)}"


@function_tool
def list_customer_orders(customer_id: int, limit: int = 5) -> str:
    """
    List recent orders for a specific customer.
    """
    limit = max(1, min(limit, 20))
    
    try:
        endpoint = f"orders?customer_id=eq.{customer_id}&order=created_at.desc&limit={limit}"
        rows = db._make_request("GET", endpoint)
        
        if not rows:
            return "No orders found for that customer."

        lines = [f"Recent orders for customer #{customer_id}:"]
        for row in rows:
            order_id = row.get("order_id")
            order_type = row.get("order_type", "")
            status = row.get("status", "")
            total = row.get("total_usd", 0)
            created = row.get("created_at", "")[:10]
            
            lines.append(f"- #{order_id} {order_type} {status} - ${total:.2f} on {created}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing orders: {str(e)}"


@function_tool
def get_order_details(order_id: int) -> str:
    """
    Provide a detailed view of an order.
    """
    try:
        endpoint = f"orders?order_id=eq.{order_id}&select=*,customers(full_name,email),locations(name)"
        rows = db._make_request("GET", endpoint)
        
        if not rows:
            return "Order not found."

        row = rows[0]
        customer = row.get("customers") or {}
        location = row.get("locations") or {}
        
        customer_name = customer.get("full_name", "Guest")
        customer_email = customer.get("email", "")
        location_name = location.get("name", "All Locations")
        
        customer_line = f"Customer: {customer_name}"
        if customer_email:
            customer_line += f" ({customer_email})"

        lines = [
            f"Order #{order_id} ({row.get('order_type', '')}) - {row.get('status', '')}",
            customer_line,
            f"Location: {location_name}",
            f"Totals: subtotal ${row.get('subtotal_usd', 0):.2f}, discount ${row.get('discount_usd', 0):.2f}, "
            f"tax ${row.get('tax_usd', 0):.2f}, total ${row.get('total_usd', 0):.2f}",
            f"Created: {row.get('created_at', '')[:16]}",
        ]
        
        if row.get("notes"):
            lines.append(f"Notes: {row['notes']}")
        
        return "\n".join(lines)
    except Exception as e:
        return f"Error getting order details: {str(e)}"


@function_tool
def create_order_with_item(
    item_type: str,
    reference_id: int,
    quantity: int = 1,
    order_type: str = "Sale",
    location_id: Optional[int] = None,
    notes: str = "",
    customer_id: Optional[int] = None,
    full_name: str = "",
    email: str = "",
    phone: str = "",
    guardian_name: str = "",
    child_name: str = "",
    child_birthdate: str = "",
) -> str:
    """
    Create a new order with one initial item. If customer_id is missing, reuse an existing
    customer by email/phone or create a new profile automatically.
    """
    normalized_type = _normalize_choice(item_type, ITEM_TYPES)
    if not normalized_type:
        return "item_type must be one of: " + ", ".join(ITEM_TYPES)

    if quantity < 1:
        return "quantity must be at least 1."

    try:
        # Require key customer + order inputs before writing
        missing = []
        if not full_name.strip() and not customer_id:
            missing.append("full_name")
        if not child_name.strip() and not customer_id:
            missing.append("child_name")
        if not child_birthdate.strip() and not customer_id:
            missing.append("child_birthdate (YYYY-MM-DD)")
        if not (email.strip() or phone.strip()) and not customer_id:
            missing.append("contact (email or phone)")
        if not guardian_name.strip() and not customer_id:
            missing.append("guardian_name")
        if missing:
            return "Missing required fields before creating order: " + ", ".join(missing)

        ensured_id, customer_msg = _ensure_customer(
            customer_id,
            full_name=full_name,
            email=email,
            phone=phone,
            guardian_name=guardian_name,
            child_name=child_name,
            child_birthdate=child_birthdate,
            notes=notes,
        )
        if not ensured_id:
            return customer_msg

        # Get price based on item type
        unit_price = 0.0
        item_name = ""
        
        if normalized_type == "Product":
            product = db.get_by_id("products", "product_id", reference_id)
            if not product:
                return "Product not found."
            unit_price = product.get("price_usd", 0)
            item_name = product.get("product_name", "")
        elif normalized_type == "Ticket":
            ticket = db.get_by_id("ticket_types", "ticket_type_id", reference_id)
            if not ticket:
                return "Ticket type not found."
            unit_price = ticket.get("base_price_usd", 0)
            item_name = ticket.get("name", "")
        elif normalized_type == "Party":
            package = db.get_by_id("party_packages", "package_id", reference_id)
            if not package:
                return "Party package not found."
            unit_price = package.get("price_usd", 0)
            item_name = package.get("name", "")

        subtotal = unit_price * quantity
        
        # Create order
        order_data = {
            "customer_id": ensured_id,
            "order_type": order_type,
            "status": "Pending",
            "subtotal_usd": subtotal,
            "discount_usd": 0,
            "tax_usd": 0,
            "total_usd": subtotal,
            "location_id": location_id,
            "notes": notes.strip() or None,
        }
        order_result = db.insert("orders", order_data)
        
        if not order_result:
            return "Failed to create order."
        
        new_order_id = order_result[0].get("order_id")

        # Create order item
        item_data = {
            "order_id": new_order_id,
            "item_type": normalized_type,
            "product_id": reference_id if normalized_type == "Product" else None,
            "ticket_type_id": reference_id if normalized_type == "Ticket" else None,
            "booking_id": reference_id if normalized_type == "Party" else None,
            "quantity": quantity,
            "unit_price_usd": unit_price,
            "line_total_usd": subtotal,
            "name_override": item_name,
        }
        db.insert("order_items", item_data)

        return (
            f"{customer_msg} Created order #{new_order_id} with {quantity}x {item_name} "
            f"(${subtotal:.2f}). Status: Pending."
        )
    except Exception as e:
        return f"Error creating order: {str(e)}"


@function_tool
def add_order_item(
    order_id: int,
    item_type: str,
    reference_id: int,
    quantity: int = 1,
) -> str:
    """
    Add an item to an existing order.
    """
    normalized_type = _normalize_choice(item_type, ITEM_TYPES)
    if not normalized_type:
        return "item_type must be one of: " + ", ".join(ITEM_TYPES)

    if quantity < 1:
        return "quantity must be at least 1."

    try:
        # Verify order exists
        order = db.get_by_id("orders", "order_id", order_id)
        if not order:
            return "Order not found."

        # Get price
        unit_price = 0.0
        item_name = ""
        
        if normalized_type == "Product":
            product = db.get_by_id("products", "product_id", reference_id)
            if not product:
                return "Product not found."
            unit_price = product.get("price_usd", 0)
            item_name = product.get("product_name", "")
        elif normalized_type == "Ticket":
            ticket = db.get_by_id("ticket_types", "ticket_type_id", reference_id)
            if not ticket:
                return "Ticket type not found."
            unit_price = ticket.get("base_price_usd", 0)
            item_name = ticket.get("name", "")
        elif normalized_type == "Party":
            package = db.get_by_id("party_packages", "package_id", reference_id)
            if not package:
                return "Party package not found."
            unit_price = package.get("price_usd", 0)
            item_name = package.get("name", "")

        line_total = unit_price * quantity

        # Add item
        item_data = {
            "order_id": order_id,
            "item_type": normalized_type,
            "product_id": reference_id if normalized_type == "Product" else None,
            "ticket_type_id": reference_id if normalized_type == "Ticket" else None,
            "booking_id": reference_id if normalized_type == "Party" else None,
            "quantity": quantity,
            "unit_price_usd": unit_price,
            "line_total_usd": line_total,
            "name_override": item_name,
        }
        db.insert("order_items", item_data)

        # Update order totals
        new_subtotal = order.get("subtotal_usd", 0) + line_total
        new_total = order.get("total_usd", 0) + line_total
        db.update("orders", "order_id", order_id, {"subtotal_usd": new_subtotal, "total_usd": new_total})

        return f"Added {quantity}x {item_name} to order #{order_id}. New total: ${new_total:.2f}."
    except Exception as e:
        return f"Error adding item: {str(e)}"


@function_tool
def update_order_status(order_id: int, new_status: str) -> str:
    """
    Update the status of an order.
    """
    normalized = _normalize_choice(new_status, ORDER_STATUSES)
    if not normalized:
        return "Status must be one of: " + ", ".join(ORDER_STATUSES)

    try:
        order = db.get_by_id("orders", "order_id", order_id)
        if not order:
            return "Order not found."

        db.update("orders", "order_id", order_id, {"status": normalized})
        return f"Order #{order_id} status updated to {normalized}."
    except Exception as e:
        return f"Error updating order: {str(e)}"


@function_tool
def record_payment(
    order_id: int,
    amount_usd: float,
    payment_method: str = "Card",
    transaction_ref: str = "",
    status: str = "Captured",
) -> str:
    """
    Record a payment against an order.
    """
    normalized_status = _normalize_choice(status, PAYMENT_STATUSES)
    if not normalized_status:
        return "Status must be one of: " + ", ".join(PAYMENT_STATUSES)

    if amount_usd <= 0:
        return "amount_usd must be positive."

    try:
        order = db.get_by_id("orders", "order_id", order_id)
        if not order:
            return "Order not found."

        payment_data = {
            "order_id": order_id,
            "amount_usd": amount_usd,
            "payment_method": payment_method,
            "status": normalized_status,
            "transaction_ref": transaction_ref or None,
        }
        result = db.insert("payments", payment_data)
        
        if result:
            payment_id = result[0].get("payment_id")
            # Update order status if fully paid
            if normalized_status == "Captured" and amount_usd >= order.get("total_usd", 0):
                db.update("orders", "order_id", order_id, {"status": "Paid"})
            return f"Recorded payment #{payment_id} of ${amount_usd:.2f} ({normalized_status})."
        return "Failed to record payment."
    except Exception as e:
        return f"Error recording payment: {str(e)}"


@function_tool
def create_refund(
    order_id: int,
    amount_usd: float,
    reason: str = "",
) -> str:
    """
    Create a refund against an order.
    """
    if amount_usd <= 0:
        return "amount_usd must be positive."

    try:
        order = db.get_by_id("orders", "order_id", order_id)
        if not order:
            return "Order not found."

        refund_data = {
            "order_id": order_id,
            "amount_usd": amount_usd,
            "reason": reason.strip() or None,
            "status": "Approved",
        }
        result = db.insert("refunds", refund_data)
        
        if result:
            refund_id = result[0].get("refund_id")
            # Update order status
            if amount_usd >= order.get("total_usd", 0):
                db.update("orders", "order_id", order_id, {"status": "Refunded"})
            else:
                db.update("orders", "order_id", order_id, {"status": "PartiallyRefunded"})
            return f"Created refund #{refund_id} of ${amount_usd:.2f}."
        return "Failed to create refund."
    except Exception as e:
        return f"Error creating refund: {str(e)}"


@function_tool
def list_faqs(only_active: bool = True) -> str:
    """
    List FAQs and answers.
    """
    try:
        endpoint = "faqs?order=faq_id"
        if only_active:
            endpoint += "&is_active=eq.true"
        rows = db._make_request("GET", endpoint)
        if not rows:
            return "No FAQs found."
        lines = ["FAQs:"]
        for row in rows:
            lines.append(f"- Q: {row.get('question')}\n  A: {row.get('answer')}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing FAQs: {str(e)}"


@function_tool
def list_staff(only_active: bool = True) -> str:
    """
    List staff with roles and contact.
    """
    try:
        endpoint = "staff?order=full_name"
        if only_active:
            endpoint += "&is_active=eq.true"
        rows = db._make_request("GET", endpoint)
        if not rows:
            return "No staff found."
        lines = ["Staff:"]
        for row in rows:
            lines.append(
                f"- {row.get('full_name')} ({row.get('role','')}) — {row.get('phone','N/A')}, {row.get('email','N/A')}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing staff: {str(e)}"


@function_tool
def list_testimonials(only_featured: bool = False, limit: int = 5) -> str:
    """
    List customer testimonials.
    """
    limit = max(1, min(limit, 20))
    try:
        endpoint = f"testimonials?order=created_at.desc&limit={limit}"
        if only_featured:
            endpoint += "&is_featured=eq.true"
        rows = db._make_request("GET", endpoint)
        if not rows:
            return "No testimonials found."
        lines = ["Testimonials:"]
        for row in rows:
            rating = row.get("rating")
            rating_text = f" ({rating:.1f}/5)" if rating is not None else ""
            lines.append(f"- {row.get('customer_name','Guest')}{rating_text}: {row.get('quote')}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing testimonials: {str(e)}"


@function_tool
def list_promotions(only_active: bool = True) -> str:
    """
    List active promotion codes.
    """
    try:
        endpoint = "promotions?order=valid_from.desc"
        if only_active:
            endpoint += "&is_active=eq.true"
        rows = db._make_request("GET", endpoint)
        if not rows:
            return "No promotions found."
        lines = ["Promotions:"]
        for row in rows:
            code = row.get("code")
            desc = row.get("description", "")
            pct = row.get("percent_off")
            amt = row.get("amount_off_usd")
            val_text = f"{pct}% off" if pct else (f"${amt:.2f} off" if amt else "")
            lines.append(f"- {code}: {desc} {val_text}".strip())
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing promotions: {str(e)}"


@function_tool
def list_waivers(customer_id: int | None = None) -> str:
    """
    List waivers, optionally filtered by customer.
    """
    try:
        endpoint = "waivers?order=signed_at.desc"
        if customer_id is not None:
            endpoint += f"&customer_id=eq.{customer_id}"
        rows = db._make_request("GET", endpoint)
        if not rows:
            return "No waivers found."
        lines = ["Waivers:"]
        for row in rows:
            lines.append(
                f"- waiver #{row.get('waiver_id')} for customer {row.get('customer_id')} at {row.get('signed_at','')}, valid={row.get('is_valid',False)}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing waivers: {str(e)}"


@function_tool
def list_payments(order_id: int | None = None, status: str = "", limit: int = 10) -> str:
    """
    List payments, optionally filtered by order or status.
    """
    limit = max(1, min(limit, 50))
    try:
        endpoint = f"payments?order=created_at.desc&limit={limit}"
        if order_id is not None:
            endpoint += f"&order_id=eq.{order_id}"
        if status:
            endpoint += f"&status=ilike.{status}"
        rows = db._make_request("GET", endpoint)
        if not rows:
            return "No payments found."
        lines = ["Payments:"]
        for row in rows:
            lines.append(
                f"- payment #{row.get('payment_id')} order {row.get('order_id')} {row.get('status')} ${row.get('amount_usd',0):.2f}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing payments: {str(e)}"


@function_tool
def list_refunds(order_id: int | None = None, status: str = "", limit: int = 10) -> str:
    """
    List refunds, optionally filtered by order or status.
    """
    limit = max(1, min(limit, 50))
    try:
        endpoint = f"refunds?order=created_at.desc&limit={limit}"
        if order_id is not None:
            endpoint += f"&order_id=eq.{order_id}"
        if status:
            endpoint += f"&status=ilike.{status}"
        rows = db._make_request("GET", endpoint)
        if not rows:
            return "No refunds found."
        lines = ["Refunds:"]
        for row in rows:
            lines.append(
                f"- refund #{row.get('refund_id')} order {row.get('order_id')} {row.get('status')} ${row.get('amount_usd',0):.2f} ({row.get('reason','')})"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing refunds: {str(e)}"

"""
GlamBook AI Service - Database Queries

Query functions for the salon voice agent.
"""

from datetime import datetime, date, time, timedelta
from typing import Optional, List, Dict, Any
from db import get_supabase


# ============================================
# CUSTOMER QUERIES
# ============================================

def find_customer_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    """
    Find a customer by their phone number.
    Returns customer details if found.
    """
    supabase = get_supabase()
    
    # First find user by phone
    user_result = supabase.table("users").select("*").eq("phone", phone).execute()
    
    if not user_result.data:
        # Try with normalized phone formats
        normalized = phone.replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
        user_result = supabase.table("users").select("*").ilike("phone", f"%{normalized[-10:]}%").execute()
    
    if not user_result.data:
        return None
    
    user = user_result.data[0]
    
    # Get customer record
    customer_result = supabase.table("customers").select("*").eq("user_id", user["user_id"]).execute()
    
    if customer_result.data:
        return {
            **user,
            **customer_result.data[0]
        }
    
    return user


def create_customer(
    phone: str,
    full_name: str,
    email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new customer in the database.
    """
    supabase = get_supabase()
    
    # Generate email if not provided (required by schema)
    if not email:
        # Create a unique email based on phone number
        clean_phone = ''.join(filter(str.isdigit, phone))
        email = f"customer_{clean_phone}@glambook.voice"
    
    # Create user first
    user_data = {
        "phone": phone,
        "full_name": full_name,
        "email": email,
        "role": "customer",
        "is_active": True
    }
    
    user_result = supabase.table("users").insert(user_data).execute()
    user = user_result.data[0]
    
    # Create customer record
    customer_data = {
        "user_id": user["user_id"]
    }
    
    customer_result = supabase.table("customers").insert(customer_data).execute()
    
    return {
        **user,
        **customer_result.data[0]
    }


def get_customer_appointments(
    customer_id: int,
    status: Optional[str] = None,
    upcoming_only: bool = True
) -> List[Dict[str, Any]]:
    """
    Get appointments for a customer.
    """
    supabase = get_supabase()
    
    query = supabase.table("appointments").select(
        "*, appointment_services(*, services(name, price))"
    ).eq("customer_id", customer_id)
    
    if upcoming_only:
        query = query.gte("appointment_date", date.today().isoformat())
    
    if status:
        query = query.eq("status", status)
    
    query = query.order("appointment_date", desc=False).order("start_time", desc=False)
    
    result = query.execute()
    return result.data


# ============================================
# SERVICE QUERIES
# ============================================

def get_all_services(category_id: Optional[int] = None, active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Get all salon services.
    """
    supabase = get_supabase()
    
    query = supabase.table("services").select("*, service_categories(name)")
    
    if active_only:
        query = query.eq("is_active", True)
    
    if category_id:
        query = query.eq("category_id", category_id)
    
    query = query.order("display_order")
    
    result = query.execute()
    return result.data


def get_service_categories() -> List[Dict[str, Any]]:
    """
    Get all service categories.
    """
    supabase = get_supabase()
    
    result = supabase.table("service_categories").select("*").eq(
        "is_active", True
    ).order("display_order").execute()
    
    return result.data


def find_service_by_name(name: str) -> Optional[Dict[str, Any]]:
    """
    Find a service by name (fuzzy match).
    """
    supabase = get_supabase()
    
    # Try exact match first
    result = supabase.table("services").select("*").ilike("name", name).execute()
    
    if result.data:
        return result.data[0]
    
    # Try partial match
    result = supabase.table("services").select("*").ilike("name", f"%{name}%").execute()
    
    if result.data:
        return result.data[0]
    
    return None


# ============================================
# STYLIST QUERIES
# ============================================

def get_all_stylists(active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Get all stylists.
    """
    supabase = get_supabase()
    
    query = supabase.table("stylists").select("*")
    
    if active_only:
        query = query.eq("is_active", True)
    
    result = query.execute()
    return result.data


def get_stylist_by_name(name: str) -> Optional[Dict[str, Any]]:
    """
    Find a stylist by name.
    """
    supabase = get_supabase()
    
    result = supabase.table("stylists").select("*").ilike(
        "full_name", f"%{name}%"
    ).eq("is_active", True).execute()
    
    if result.data:
        return result.data[0]
    
    return None


def get_stylist_availability(
    stylist_id: int,
    check_date: date
) -> Dict[str, Any]:
    """
    Get stylist availability for a specific date.
    Returns working hours and booked slots.
    """
    supabase = get_supabase()
    
    # Get day of week
    day_name = check_date.strftime("%A").lower()
    
    # Get stylist schedule for this day
    schedule_result = supabase.table("stylist_schedules").select("*").eq(
        "stylist_id", stylist_id
    ).eq("day_of_week", day_name).execute()
    
    if not schedule_result.data or not schedule_result.data[0].get("is_working"):
        return {"available": False, "reason": "Stylist not working this day"}
    
    schedule = schedule_result.data[0]
    
    # Check for time off
    time_off_result = supabase.table("stylist_time_off").select("*").eq(
        "stylist_id", stylist_id
    ).lte("start_datetime", f"{check_date}T23:59:59").gte(
        "end_datetime", f"{check_date}T00:00:00"
    ).execute()
    
    if time_off_result.data:
        return {"available": False, "reason": "Stylist has time off"}
    
    # Get existing appointments
    appointments_result = supabase.table("appointments").select(
        "start_time, end_time, duration_minutes"
    ).eq("stylist_id", stylist_id).eq(
        "appointment_date", check_date.isoformat()
    ).not_.in_("status", ["cancelled"]).execute()
    
    booked_slots = [(apt["start_time"], apt["end_time"]) for apt in appointments_result.data]
    
    return {
        "available": True,
        "start_time": schedule["start_time"],
        "end_time": schedule["end_time"],
        "break_start": schedule.get("break_start"),
        "break_end": schedule.get("break_end"),
        "booked_slots": booked_slots
    }


# ============================================
# APPOINTMENT QUERIES
# ============================================

def get_available_slots(
    service_id: int,
    check_date: date,
    stylist_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get available time slots for a service on a specific date.
    """
    supabase = get_supabase()
    
    # Get service duration
    service_result = supabase.table("services").select("duration_minutes").eq(
        "service_id", service_id
    ).execute()
    
    if not service_result.data:
        return []
    
    duration = service_result.data[0]["duration_minutes"]
    
    # Get business hours
    day_name = check_date.strftime("%A").lower()
    hours_result = supabase.table("business_hours").select("*").eq(
        "day_of_week", day_name
    ).execute()
    
    if not hours_result.data or not hours_result.data[0].get("is_open"):
        return []
    
    hours = hours_result.data[0]
    
    # Check for salon closure
    closure_result = supabase.table("salon_closures").select("*").eq(
        "closure_date", check_date.isoformat()
    ).execute()
    
    if closure_result.data:
        return []
    
    # Get stylists who can perform this service
    if stylist_id:
        stylists = [{"stylist_id": stylist_id}]
    else:
        stylists_result = supabase.table("stylist_services").select(
            "stylist_id, stylists(full_name, is_active)"
        ).eq("service_id", service_id).execute()
        
        stylists = [s for s in stylists_result.data if s.get("stylists", {}).get("is_active")]
        
        if not stylists:
            # If no specific assignments, get all active stylists
            all_stylists = supabase.table("stylists").select("stylist_id, full_name").eq(
                "is_active", True
            ).execute()
            stylists = all_stylists.data
    
    # Generate time slots
    available_slots = []
    slot_duration = 30  # 30-minute slots
    
    # Helper to parse time strings in various formats
    def parse_time_str(time_str: str) -> time:
        for fmt in ["%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p"]:
            try:
                return datetime.strptime(time_str, fmt).time()
            except ValueError:
                continue
        # Default to midnight if parsing fails
        return time(0, 0)
    
    open_time = parse_time_str(hours.get("open_time", "09:00:00"))
    close_time = parse_time_str(hours.get("close_time", "17:00:00"))
    
    current_slot = datetime.combine(check_date, open_time)
    end_of_day = datetime.combine(check_date, close_time)
    
    while current_slot + timedelta(minutes=duration) <= end_of_day:
        slot_time = current_slot.time()
        
        # Check each stylist's availability
        for stylist in stylists:
            sid = stylist["stylist_id"]
            availability = get_stylist_availability(sid, check_date)
            
            if not availability.get("available"):
                continue
            
            # Check if slot is within stylist's hours
            try:
                stylist_start = parse_time_str(availability.get("start_time", "09:00:00"))
                stylist_end = parse_time_str(availability.get("end_time", "17:00:00"))
            except Exception:
                continue
            
            if slot_time < stylist_start or slot_time >= stylist_end:
                continue
            
            # Check if slot conflicts with booked appointments
            slot_end = (current_slot + timedelta(minutes=duration)).time()
            is_booked = False
            
            for booked_start, booked_end in availability.get("booked_slots", []):
                try:
                    booked_start_time = parse_time_str(booked_start)
                    booked_end_time = parse_time_str(booked_end)
                except Exception:
                    continue
                
                if not (slot_end <= booked_start_time or slot_time >= booked_end_time):
                    is_booked = True
                    break
            
            if not is_booked:
                available_slots.append({
                    "time": slot_time.strftime("%H:%M"),
                    "stylist_id": sid,
                    "stylist_name": stylist.get("full_name", "Any Stylist")
                })
        
        current_slot += timedelta(minutes=slot_duration)
    
    return available_slots


def create_appointment(
    customer_id: int,
    stylist_id: int,
    service_ids: List[int],
    appointment_date: date,
    start_time: time,
    customer_notes: Optional[str] = None,
    booked_via: str = "voice_agent",
    call_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new appointment.
    """
    supabase = get_supabase()
    
    # Calculate total duration and price
    services_result = supabase.table("services").select("*").in_(
        "service_id", service_ids
    ).execute()
    
    services = services_result.data
    total_duration = sum(s["duration_minutes"] for s in services)
    subtotal = sum(float(s["price"]) for s in services)
    
    # Calculate end time
    start_datetime = datetime.combine(appointment_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=total_duration)
    end_time = end_datetime.time()
    
    # Create appointment
    appointment_data = {
        "customer_id": customer_id,
        "stylist_id": stylist_id,
        "appointment_date": appointment_date.isoformat(),
        "start_time": start_time.strftime("%H:%M:%S"),
        "end_time": end_time.strftime("%H:%M:%S"),
        "duration_minutes": total_duration,
        "subtotal": subtotal,
        "total_amount": subtotal,  # Add tax calculation if needed
        "status": "confirmed",
        "confirmed_at": datetime.now().isoformat(),
        "customer_notes": customer_notes,
        "booked_via": booked_via,
        "call_id": call_id
    }
    
    result = supabase.table("appointments").insert(appointment_data).execute()
    appointment = result.data[0]
    
    # Add services to appointment
    for idx, service in enumerate(services):
        service_data = {
            "appointment_id": appointment["appointment_id"],
            "service_id": service["service_id"],
            "service_name": service["name"],
            "price": service["price"],
            "duration_minutes": service["duration_minutes"],
            "sequence_order": idx + 1
        }
        supabase.table("appointment_services").insert(service_data).execute()
    
    return appointment


def cancel_appointment(
    appointment_id: int,
    cancelled_by: Optional[str] = None,
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Cancel an appointment.
    """
    supabase = get_supabase()
    
    update_data = {
        "status": "cancelled",
        "cancelled_at": datetime.now().isoformat(),
        "cancelled_by": cancelled_by,
        "cancellation_reason": reason
    }
    
    result = supabase.table("appointments").update(update_data).eq(
        "appointment_id", appointment_id
    ).execute()
    
    return result.data[0] if result.data else None


def reschedule_appointment(
    appointment_id: int,
    new_date: date,
    new_start_time: time,
    new_stylist_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Reschedule an appointment to a new date/time.
    """
    supabase = get_supabase()
    
    # Get current appointment
    current = supabase.table("appointments").select("*").eq(
        "appointment_id", appointment_id
    ).execute()
    
    if not current.data:
        return None
    
    appointment = current.data[0]
    duration = appointment["duration_minutes"]
    
    # Calculate new end time
    new_start_datetime = datetime.combine(new_date, new_start_time)
    new_end_datetime = new_start_datetime + timedelta(minutes=duration)
    new_end_time = new_end_datetime.time()
    
    update_data = {
        "appointment_date": new_date.isoformat(),
        "start_time": new_start_time.strftime("%H:%M:%S"),
        "end_time": new_end_time.strftime("%H:%M:%S"),
        "status": "confirmed",
        "confirmed_at": datetime.now().isoformat()
    }
    
    if new_stylist_id:
        update_data["stylist_id"] = new_stylist_id
    
    result = supabase.table("appointments").update(update_data).eq(
        "appointment_id", appointment_id
    ).execute()
    
    return result.data[0] if result.data else None


def get_appointment_by_reference(booking_reference: str) -> Optional[Dict[str, Any]]:
    """
    Get appointment by booking reference.
    """
    supabase = get_supabase()
    
    result = supabase.table("appointments").select(
        "*, customers(*, users(*)), stylists(*), appointment_services(*, services(*))"
    ).eq("booking_reference", booking_reference).execute()
    
    return result.data[0] if result.data else None


# ============================================
# SALON INFO QUERIES
# ============================================

def get_salon_settings() -> Dict[str, Any]:
    """
    Get salon settings/info.
    """
    supabase = get_supabase()
    
    result = supabase.table("salon_settings").select("*").execute()
    return result.data[0] if result.data else {}


def get_business_hours() -> List[Dict[str, Any]]:
    """
    Get salon business hours.
    """
    supabase = get_supabase()
    
    result = supabase.table("business_hours").select("*").order("day_of_week").execute()
    return result.data


# ============================================
# CALL LOGGING
# ============================================

def create_call_log(
    call_id: str,
    caller_phone: str,
    session_id: Optional[str] = None,
    customer_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Create a new call log entry.
    """
    supabase = get_supabase()
    
    call_data = {
        "call_id": call_id,
        "session_id": session_id,
        "caller_phone": caller_phone,
        "customer_id": customer_id,
        "status": "in_progress",
        "direction": "inbound"
    }
    
    result = supabase.table("call_logs").insert(call_data).execute()
    return result.data[0] if result.data else None


def update_call_log(
    call_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Update a call log entry.
    """
    supabase = get_supabase()
    
    result = supabase.table("call_logs").update(kwargs).eq("call_id", call_id).execute()
    return result.data[0] if result.data else None


def log_agent_interaction(
    call_id: str,
    session_id: str,
    agent_type: str,
    agent_name: str,
    user_message: str,
    agent_response: str,
    tools_called: Optional[List] = None,
    duration_ms: int = 0
) -> Dict[str, Any]:
    """
    Log an agent interaction.
    """
    supabase = get_supabase()
    
    interaction_data = {
        "call_id": call_id,
        "session_id": session_id,
        "agent_type": agent_type,
        "agent_name": agent_name,
        "user_message": user_message,
        "agent_response": agent_response,
        "tools_called": tools_called or [],
        "tool_call_count": len(tools_called) if tools_called else 0,
        "duration_ms": duration_ms
    }
    
    result = supabase.table("agent_interactions").insert(interaction_data).execute()
    return result.data[0] if result.data else None


def log_elevenlabs_usage(
    call_id: str,
    session_id: str,
    usage_type: str,  # 'tts' or 'stt'
    voice_id: str,
    characters_used: int = 0,
    audio_duration_seconds: float = 0,
    cost_cents: float = 0,
    latency_ms: int = 0
) -> Dict[str, Any]:
    """
    Log Eleven Labs API usage.
    """
    supabase = get_supabase()
    
    usage_data = {
        "call_id": call_id,
        "session_id": session_id,
        "usage_type": usage_type,
        "voice_id": voice_id,
        "characters_used": characters_used,
        "audio_duration_seconds": audio_duration_seconds,
        "cost_cents": cost_cents,
        "latency_ms": latency_ms
    }
    
    result = supabase.table("elevenlabs_usage_logs").insert(usage_data).execute()
    return result.data[0] if result.data else None

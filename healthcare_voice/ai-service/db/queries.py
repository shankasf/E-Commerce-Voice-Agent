"""Database query functions for healthcare voice AI"""
import logging
from typing import Optional, List, Dict, Any
from datetime import date, time, datetime, timedelta
from db.supabase_client import get_supabase
from config import settings

logger = logging.getLogger(__name__)


# ============================================
# PATIENT QUERIES
# ============================================

def find_patient_by_phone(phone: str, practice_id: str = None) -> Optional[Dict]:
    """Find patient by phone number (primary, secondary, or work)"""
    supabase = get_supabase()
    if not supabase:
        return None

    practice_id = practice_id or settings.default_practice_id

    # Clean phone number - remove non-digits
    clean_phone = ''.join(filter(str.isdigit, phone))

    # Search all phone fields
    result = supabase.table("patients").select("*").eq(
        "practice_id", practice_id
    ).or_(
        f"phone_primary.ilike.%{clean_phone[-10:]}%,"
        f"phone_secondary.ilike.%{clean_phone[-10:]}%,"
        f"phone_work.ilike.%{clean_phone[-10:]}%"
    ).execute()

    if result.data:
        return result.data[0]
    return None


def find_patient_by_name_dob(
    first_name: str,
    last_name: str,
    dob: str,
    practice_id: str = None
) -> Optional[Dict]:
    """Find patient by name and date of birth"""
    supabase = get_supabase()
    if not supabase:
        return None

    practice_id = practice_id or settings.default_practice_id

    result = supabase.table("patients").select("*").eq(
        "practice_id", practice_id
    ).ilike("first_name", f"%{first_name}%").ilike(
        "last_name", f"%{last_name}%"
    ).eq("date_of_birth", dob).execute()

    if result.data:
        return result.data[0]
    return None


def get_patient_by_id(patient_id: str) -> Optional[Dict]:
    """Get patient by ID"""
    supabase = get_supabase()
    if not supabase:
        return None

    result = supabase.table("patients").select("*").eq(
        "patient_id", patient_id
    ).single().execute()

    return result.data if result.data else None


def get_patient_insurance(patient_id: str) -> List[Dict]:
    """Get patient's insurance information"""
    supabase = get_supabase()
    if not supabase:
        return []

    result = supabase.table("patient_insurance").select("*").eq(
        "patient_id", patient_id
    ).eq("is_active", True).execute()

    return result.data or []


def create_patient(patient_data: Dict) -> Optional[Dict]:
    """Create a new patient"""
    supabase = get_supabase()
    if not supabase:
        return None

    patient_data["practice_id"] = patient_data.get(
        "practice_id", settings.default_practice_id
    )

    result = supabase.table("patients").insert(patient_data).execute()
    return result.data[0] if result.data else None


# ============================================
# PROVIDER QUERIES
# ============================================

def get_all_providers(practice_id: str = None, active_only: bool = True) -> List[Dict]:
    """Get all providers for a practice"""
    supabase = get_supabase()
    if not supabase:
        return []

    practice_id = practice_id or settings.default_practice_id

    query = supabase.table("providers").select(
        "*, departments(name)"
    ).eq("practice_id", practice_id)

    if active_only:
        query = query.eq("is_active", True)

    result = query.execute()
    return result.data or []


def get_provider_by_id(provider_id: str) -> Optional[Dict]:
    """Get provider by ID with schedule"""
    supabase = get_supabase()
    if not supabase:
        return None

    result = supabase.table("providers").select(
        "*, provider_schedules(*), departments(name)"
    ).eq("provider_id", provider_id).single().execute()

    return result.data if result.data else None


def get_provider_by_name(name: str, practice_id: str = None) -> Optional[Dict]:
    """Find provider by name (partial match)"""
    supabase = get_supabase()
    if not supabase:
        return None

    practice_id = practice_id or settings.default_practice_id

    # Try to split name if contains space
    parts = name.strip().split()

    if len(parts) >= 2:
        result = supabase.table("providers").select("*").eq(
            "practice_id", practice_id
        ).ilike("first_name", f"%{parts[0]}%").ilike(
            "last_name", f"%{parts[-1]}%"
        ).execute()
    else:
        result = supabase.table("providers").select("*").eq(
            "practice_id", practice_id
        ).or_(
            f"first_name.ilike.%{name}%,last_name.ilike.%{name}%"
        ).execute()

    if result.data:
        return result.data[0]
    return None


def get_provider_schedule(provider_id: str) -> List[Dict]:
    """Get provider's weekly schedule"""
    supabase = get_supabase()
    if not supabase:
        return []

    result = supabase.table("provider_schedules").select("*").eq(
        "provider_id", provider_id
    ).eq("is_available", True).order("day_of_week").execute()

    return result.data or []


def get_provider_time_off(
    provider_id: str,
    start_date: date,
    end_date: date
) -> List[Dict]:
    """Get provider's time off in date range"""
    supabase = get_supabase()
    if not supabase:
        return []

    result = supabase.table("provider_time_off").select("*").eq(
        "provider_id", provider_id
    ).gte("end_date", start_date.isoformat()).lte(
        "start_date", end_date.isoformat()
    ).execute()

    return result.data or []


# ============================================
# APPOINTMENT QUERIES
# ============================================

def get_patient_appointments(
    patient_id: str,
    upcoming_only: bool = True,
    limit: int = 10
) -> List[Dict]:
    """Get patient's appointments"""
    supabase = get_supabase()
    if not supabase:
        return []

    query = supabase.table("appointments").select(
        "*, providers(first_name, last_name, title, specialization), services(name, duration)"
    ).eq("patient_id", patient_id)

    if upcoming_only:
        today = date.today().isoformat()
        query = query.gte("scheduled_date", today).not_.in_(
            "status", ["cancelled", "completed", "no_show"]
        )

    result = query.order("scheduled_date").order("scheduled_time").limit(limit).execute()
    return result.data or []


def get_appointments_for_date(
    provider_id: str,
    target_date: date
) -> List[Dict]:
    """Get all appointments for a provider on a specific date"""
    supabase = get_supabase()
    if not supabase:
        return []

    result = supabase.table("appointments").select(
        "scheduled_time, end_time, duration, status"
    ).eq("provider_id", provider_id).eq(
        "scheduled_date", target_date.isoformat()
    ).not_.in_(
        "status", ["cancelled", "no_show"]
    ).order("scheduled_time").execute()

    return result.data or []


def get_available_slots(
    provider_id: str,
    target_date: date,
    duration: int = 30
) -> List[Dict]:
    """Get available appointment slots for a provider on a date"""
    # Get provider schedule for this day of week
    day_of_week = target_date.weekday()
    # Convert Python weekday (0=Monday) to database format (0=Sunday)
    db_day_of_week = (day_of_week + 1) % 7

    schedule = get_provider_schedule(provider_id)
    day_schedule = next(
        (s for s in schedule if s["day_of_week"] == db_day_of_week),
        None
    )

    if not day_schedule:
        return []

    # Check for time off
    time_off = get_provider_time_off(provider_id, target_date, target_date)
    if time_off:
        return []

    # Get existing appointments
    existing = get_appointments_for_date(provider_id, target_date)

    # Generate available slots
    slots = []
    start_time = datetime.strptime(day_schedule["start_time"], "%H:%M:%S").time()
    end_time = datetime.strptime(day_schedule["end_time"], "%H:%M:%S").time()

    current = datetime.combine(target_date, start_time)
    end_dt = datetime.combine(target_date, end_time)

    while current + timedelta(minutes=duration) <= end_dt:
        slot_start = current.time()
        slot_end = (current + timedelta(minutes=duration)).time()

        # Check if slot overlaps with any existing appointment
        is_available = True
        for appt in existing:
            appt_start = datetime.strptime(appt["scheduled_time"], "%H:%M:%S").time()
            appt_end = datetime.strptime(appt["end_time"], "%H:%M:%S").time()

            if not (slot_end <= appt_start or slot_start >= appt_end):
                is_available = False
                break

        if is_available:
            slots.append({
                "start_time": slot_start.strftime("%H:%M"),
                "end_time": slot_end.strftime("%H:%M"),
                "date": target_date.isoformat()
            })

        current += timedelta(minutes=30)  # 30-minute slot intervals

    return slots


def create_appointment(appointment_data: Dict) -> Optional[Dict]:
    """Create a new appointment"""
    supabase = get_supabase()
    if not supabase:
        return None

    appointment_data["practice_id"] = appointment_data.get(
        "practice_id", settings.default_practice_id
    )
    appointment_data["created_via"] = appointment_data.get("created_via", "voice")

    result = supabase.table("appointments").insert(appointment_data).execute()
    return result.data[0] if result.data else None


def update_appointment(appointment_id: str, updates: Dict) -> Optional[Dict]:
    """Update an existing appointment"""
    supabase = get_supabase()
    if not supabase:
        return None

    result = supabase.table("appointments").update(updates).eq(
        "appointment_id", appointment_id
    ).execute()

    return result.data[0] if result.data else None


def cancel_appointment(appointment_id: str, reason: str = None) -> bool:
    """Cancel an appointment"""
    supabase = get_supabase()
    if not supabase:
        return False

    updates = {
        "status": "cancelled",
        "cancelled_at": datetime.utcnow().isoformat(),
        "cancellation_reason": reason
    }

    result = supabase.table("appointments").update(updates).eq(
        "appointment_id", appointment_id
    ).execute()

    return bool(result.data)


def reschedule_appointment(
    appointment_id: str,
    new_date: date,
    new_time: time,
    provider_id: str = None
) -> Optional[Dict]:
    """Reschedule an appointment"""
    supabase = get_supabase()
    if not supabase:
        return None

    # Get original appointment
    original = supabase.table("appointments").select("*").eq(
        "appointment_id", appointment_id
    ).single().execute()

    if not original.data:
        return None

    # Mark original as rescheduled
    supabase.table("appointments").update({
        "status": "rescheduled"
    }).eq("appointment_id", appointment_id).execute()

    # Create new appointment
    new_appt = {
        "practice_id": original.data["practice_id"],
        "patient_id": original.data["patient_id"],
        "provider_id": provider_id or original.data["provider_id"],
        "service_id": original.data["service_id"],
        "appointment_type": original.data["appointment_type"],
        "scheduled_date": new_date.isoformat(),
        "scheduled_time": new_time.strftime("%H:%M"),
        "duration": original.data["duration"],
        "chief_complaint": original.data["chief_complaint"],
        "rescheduled_from_id": appointment_id,
        "created_via": "voice"
    }

    result = supabase.table("appointments").insert(new_appt).execute()

    if result.data:
        # Update original with reference to new appointment
        supabase.table("appointments").update({
            "rescheduled_to_id": result.data[0]["appointment_id"]
        }).eq("appointment_id", appointment_id).execute()

    return result.data[0] if result.data else None


# ============================================
# SERVICE QUERIES
# ============================================

def get_services(practice_id: str = None, category: str = None) -> List[Dict]:
    """Get available services"""
    supabase = get_supabase()
    if not supabase:
        return []

    practice_id = practice_id or settings.default_practice_id

    query = supabase.table("services").select(
        "*, service_categories(name)"
    ).eq("practice_id", practice_id).eq("is_active", True)

    if category:
        query = query.eq("service_categories.name", category)

    result = query.execute()
    return result.data or []


def get_service_by_name(name: str, practice_id: str = None) -> Optional[Dict]:
    """Find service by name"""
    supabase = get_supabase()
    if not supabase:
        return None

    practice_id = practice_id or settings.default_practice_id

    result = supabase.table("services").select("*").eq(
        "practice_id", practice_id
    ).ilike("name", f"%{name}%").eq("is_active", True).execute()

    if result.data:
        return result.data[0]
    return None


# ============================================
# CALL LOG QUERIES
# ============================================

def create_call_log(call_data: Dict) -> Optional[Dict]:
    """Create a call log entry"""
    supabase = get_supabase()
    if not supabase:
        return None

    call_data["practice_id"] = call_data.get(
        "practice_id", settings.default_practice_id
    )

    result = supabase.table("call_logs").insert(call_data).execute()
    return result.data[0] if result.data else None


def update_call_log(log_id: str, updates: Dict) -> Optional[Dict]:
    """Update a call log entry"""
    supabase = get_supabase()
    if not supabase:
        return None

    result = supabase.table("call_logs").update(updates).eq(
        "log_id", log_id
    ).execute()

    return result.data[0] if result.data else None


def get_call_logs(
    patient_id: str = None,
    limit: int = 50
) -> List[Dict]:
    """Get call logs with optional patient filter"""
    supabase = get_supabase()
    if not supabase:
        return []

    query = supabase.table("call_logs").select(
        "*, patients(first_name, last_name)"
    )

    if patient_id:
        query = query.eq("patient_id", patient_id)

    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data or []


# ============================================
# PRACTICE / SETTINGS QUERIES
# ============================================

def get_practice(practice_id: str = None) -> Optional[Dict]:
    """Get practice information"""
    supabase = get_supabase()
    if not supabase:
        return None

    practice_id = practice_id or settings.default_practice_id

    result = supabase.table("practices").select("*").eq(
        "practice_id", practice_id
    ).single().execute()

    return result.data if result.data else None


def get_office_hours(practice_id: str = None) -> Optional[Dict]:
    """Get practice office hours"""
    practice = get_practice(practice_id)
    if practice:
        return practice.get("office_hours", {})
    return None

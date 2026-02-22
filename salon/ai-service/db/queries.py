"""
GlamBook AI Service - Database Queries

Query functions for the salon voice agent using plain PostgreSQL.
"""

from datetime import datetime, date, time, timedelta
from typing import Optional, List, Dict, Any
from db import get_db_cursor
import logging

logger = logging.getLogger(__name__)


# ============================================
# CUSTOMER QUERIES
# ============================================

def find_customer_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    """
    Find a customer by their phone number.
    Returns customer details if found.
    """
    with get_db_cursor() as cursor:
        # First find user by phone
        cursor.execute("SELECT * FROM users WHERE phone = %s", (phone,))
        user = cursor.fetchone()

        if not user:
            # Try with normalized phone formats
            normalized = phone.replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
            cursor.execute("SELECT * FROM users WHERE phone ILIKE %s", (f"%{normalized[-10:]}%",))
            user = cursor.fetchone()

        if not user:
            return None

        user = dict(user)

        # Get customer record
        cursor.execute("SELECT * FROM customers WHERE user_id = %s", (user["user_id"],))
        customer = cursor.fetchone()

        if customer:
            return {**user, **dict(customer)}

        return user


def create_customer(
    phone: str,
    full_name: str,
    email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new customer in the database.
    """
    # Generate email if not provided (required by schema)
    if not email:
        clean_phone = ''.join(filter(str.isdigit, phone))
        email = f"customer_{clean_phone}@glambook.voice"

    with get_db_cursor() as cursor:
        # Create user first
        cursor.execute("""
            INSERT INTO users (phone, full_name, email, role, is_active)
            VALUES (%s, %s, %s, 'customer', true)
            RETURNING *
        """, (phone, full_name, email))
        user = dict(cursor.fetchone())

        # Create customer record
        cursor.execute("""
            INSERT INTO customers (user_id)
            VALUES (%s)
            RETURNING *
        """, (user["user_id"],))
        customer = dict(cursor.fetchone())

        return {**user, **customer}


def get_customer_appointments(
    customer_id: int,
    status: Optional[str] = None,
    upcoming_only: bool = True
) -> List[Dict[str, Any]]:
    """
    Get appointments for a customer.
    """
    with get_db_cursor() as cursor:
        query = """
            SELECT a.*,
                   s.name as stylist_name
            FROM appointments a
            LEFT JOIN stylists s ON a.stylist_id = s.stylist_id
            WHERE a.customer_id = %s
        """
        params = [customer_id]

        if upcoming_only:
            query += " AND a.appointment_date >= %s"
            params.append(date.today().isoformat())

        if status:
            query += " AND a.status = %s"
            params.append(status)

        query += " ORDER BY a.appointment_date ASC, a.start_time ASC"

        cursor.execute(query, params)
        appointments = [dict(row) for row in cursor.fetchall()]

        # Get services for each appointment
        for apt in appointments:
            cursor.execute("""
                SELECT as2.*, s.name as service_name
                FROM appointment_services as2
                LEFT JOIN services s ON as2.service_id = s.service_id
                WHERE as2.appointment_id = %s
            """, (apt["appointment_id"],))
            apt["services"] = [dict(row) for row in cursor.fetchall()]

        return appointments


# ============================================
# SERVICE QUERIES
# ============================================

def get_all_services(category_id: Optional[int] = None, active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Get all salon services.
    """
    with get_db_cursor() as cursor:
        query = """
            SELECT s.*, sc.name as category_name
            FROM services s
            LEFT JOIN service_categories sc ON s.category_id = sc.category_id
            WHERE 1=1
        """
        params = []

        if active_only:
            query += " AND s.is_active = true"

        if category_id:
            query += " AND s.category_id = %s"
            params.append(category_id)

        query += " ORDER BY s.display_order"

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def get_service_categories() -> List[Dict[str, Any]]:
    """
    Get all service categories.
    """
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM service_categories
            WHERE is_active = true
            ORDER BY display_order
        """)
        return [dict(row) for row in cursor.fetchall()]


def find_service_by_name(name: str) -> Optional[Dict[str, Any]]:
    """
    Find a service by name (fuzzy match).
    """
    with get_db_cursor() as cursor:
        # Try exact match first
        cursor.execute("SELECT * FROM services WHERE name ILIKE %s", (name,))
        result = cursor.fetchone()

        if result:
            return dict(result)

        # Try partial match
        cursor.execute("SELECT * FROM services WHERE name ILIKE %s", (f"%{name}%",))
        result = cursor.fetchone()

        if result:
            return dict(result)

        return None


# ============================================
# STYLIST QUERIES
# ============================================

def get_all_stylists(active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Get all stylists.
    """
    with get_db_cursor() as cursor:
        query = "SELECT * FROM stylists"
        if active_only:
            query += " WHERE is_active = true"

        cursor.execute(query)
        return [dict(row) for row in cursor.fetchall()]


def get_stylist_by_name(name: str) -> Optional[Dict[str, Any]]:
    """
    Find a stylist by name.
    """
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM stylists
            WHERE full_name ILIKE %s AND is_active = true
        """, (f"%{name}%",))
        result = cursor.fetchone()
        return dict(result) if result else None


def get_stylist_availability(
    stylist_id: int,
    check_date: date
) -> Dict[str, Any]:
    """
    Get stylist availability for a specific date.
    Returns working hours and booked slots.
    """
    day_name = check_date.strftime("%A").lower()

    with get_db_cursor() as cursor:
        # Get stylist schedule for this day
        cursor.execute("""
            SELECT * FROM stylist_schedules
            WHERE stylist_id = %s AND day_of_week = %s
        """, (stylist_id, day_name))
        schedule = cursor.fetchone()

        if not schedule or not schedule.get("is_working"):
            return {"available": False, "reason": "Stylist not working this day"}

        schedule = dict(schedule)

        # Check for time off
        cursor.execute("""
            SELECT * FROM stylist_time_off
            WHERE stylist_id = %s
            AND start_datetime <= %s
            AND end_datetime >= %s
        """, (stylist_id, f"{check_date}T23:59:59", f"{check_date}T00:00:00"))

        if cursor.fetchone():
            return {"available": False, "reason": "Stylist has time off"}

        # Get existing appointments
        cursor.execute("""
            SELECT start_time, end_time, duration_minutes
            FROM appointments
            WHERE stylist_id = %s
            AND appointment_date = %s
            AND status NOT IN ('cancelled')
        """, (stylist_id, check_date.isoformat()))

        booked_slots = [(str(apt["start_time"]), str(apt["end_time"])) for apt in cursor.fetchall()]

        return {
            "available": True,
            "start_time": str(schedule["start_time"]),
            "end_time": str(schedule["end_time"]),
            "break_start": str(schedule.get("break_start")) if schedule.get("break_start") else None,
            "break_end": str(schedule.get("break_end")) if schedule.get("break_end") else None,
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
    day_name = check_date.strftime("%A").lower()

    with get_db_cursor() as cursor:
        # Get service duration
        cursor.execute("SELECT duration_minutes FROM services WHERE service_id = %s", (service_id,))
        service = cursor.fetchone()

        if not service:
            return []

        duration = service["duration_minutes"]

        # Get business hours
        cursor.execute("""
            SELECT * FROM business_hours WHERE day_of_week = %s
        """, (day_name,))
        hours = cursor.fetchone()

        if not hours or not hours.get("is_open"):
            return []

        hours = dict(hours)

        # Check for salon closure
        cursor.execute("""
            SELECT * FROM salon_closures WHERE closure_date = %s
        """, (check_date.isoformat(),))

        if cursor.fetchone():
            return []

        # Get stylists
        if stylist_id:
            cursor.execute("SELECT stylist_id, full_name FROM stylists WHERE stylist_id = %s AND is_active = true", (stylist_id,))
        else:
            cursor.execute("SELECT stylist_id, full_name FROM stylists WHERE is_active = true")

        stylists = [dict(row) for row in cursor.fetchall()]

        if not stylists:
            return []

        # Helper to parse time strings
        def parse_time_str(time_val) -> time:
            if isinstance(time_val, time):
                return time_val
            if isinstance(time_val, datetime):
                return time_val.time()
            if isinstance(time_val, str):
                for fmt in ["%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p"]:
                    try:
                        return datetime.strptime(time_val, fmt).time()
                    except ValueError:
                        continue
            return time(0, 0)

        open_time = parse_time_str(hours.get("open_time", "09:00:00"))
        close_time = parse_time_str(hours.get("close_time", "18:00:00"))

        # Generate time slots
        available_slots = []
        slot_duration = 30

        current_slot = datetime.combine(check_date, open_time)
        end_of_day = datetime.combine(check_date, close_time)

        while current_slot + timedelta(minutes=duration) <= end_of_day:
            slot_time = current_slot.time()

            for stylist in stylists:
                sid = stylist["stylist_id"]
                availability = get_stylist_availability(sid, check_date)

                if not availability.get("available"):
                    continue

                # Check if slot is within stylist's hours
                try:
                    stylist_start = parse_time_str(availability.get("start_time", "09:00:00"))
                    stylist_end = parse_time_str(availability.get("end_time", "18:00:00"))
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
    import uuid

    with get_db_cursor() as cursor:
        # Get services
        cursor.execute("""
            SELECT * FROM services WHERE service_id = ANY(%s)
        """, (service_ids,))
        services = [dict(row) for row in cursor.fetchall()]

        total_duration = sum(s["duration_minutes"] for s in services)
        subtotal = sum(float(s["price"]) for s in services)

        # Calculate end time
        start_datetime = datetime.combine(appointment_date, start_time)
        end_datetime = start_datetime + timedelta(minutes=total_duration)
        end_time_val = end_datetime.time()

        # Generate booking reference
        booking_ref = f"GB{datetime.now().strftime('%y%m%d')}{str(uuid.uuid4())[:6].upper()}"

        # Create appointment
        cursor.execute("""
            INSERT INTO appointments (
                booking_reference, customer_id, stylist_id, appointment_date,
                start_time, end_time, duration_minutes, subtotal, total_amount,
                status, confirmed_at, customer_notes, booked_via, call_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'confirmed', %s, %s, %s, %s)
            RETURNING *
        """, (
            booking_ref, customer_id, stylist_id, appointment_date.isoformat(),
            start_time.strftime("%H:%M:%S"), end_time_val.strftime("%H:%M:%S"),
            total_duration, subtotal, subtotal,
            datetime.now().isoformat(), customer_notes, booked_via, call_id
        ))
        appointment = dict(cursor.fetchone())

        # Add services to appointment
        for idx, service in enumerate(services):
            cursor.execute("""
                INSERT INTO appointment_services (
                    appointment_id, service_id, service_name, price, duration_minutes, sequence_order
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                appointment["appointment_id"], service["service_id"],
                service["name"], service["price"], service["duration_minutes"], idx + 1
            ))

        return appointment


def cancel_appointment(
    appointment_id: int,
    cancelled_by: Optional[str] = None,
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Cancel an appointment.
    """
    with get_db_cursor() as cursor:
        cursor.execute("""
            UPDATE appointments
            SET status = 'cancelled', cancelled_at = %s, cancelled_by = %s, cancellation_reason = %s
            WHERE appointment_id = %s
            RETURNING *
        """, (datetime.now().isoformat(), cancelled_by, reason, appointment_id))
        result = cursor.fetchone()
        return dict(result) if result else None


def reschedule_appointment(
    appointment_id: int,
    new_date: date,
    new_start_time: time,
    new_stylist_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Reschedule an appointment to a new date/time.
    """
    with get_db_cursor() as cursor:
        # Get current appointment
        cursor.execute("SELECT * FROM appointments WHERE appointment_id = %s", (appointment_id,))
        current = cursor.fetchone()

        if not current:
            return None

        duration = current["duration_minutes"]

        # Calculate new end time
        new_start_datetime = datetime.combine(new_date, new_start_time)
        new_end_datetime = new_start_datetime + timedelta(minutes=duration)
        new_end_time = new_end_datetime.time()

        # Build update query
        if new_stylist_id:
            cursor.execute("""
                UPDATE appointments
                SET appointment_date = %s, start_time = %s, end_time = %s,
                    stylist_id = %s, status = 'confirmed', confirmed_at = %s
                WHERE appointment_id = %s
                RETURNING *
            """, (new_date.isoformat(), new_start_time.strftime("%H:%M:%S"),
                  new_end_time.strftime("%H:%M:%S"), new_stylist_id,
                  datetime.now().isoformat(), appointment_id))
        else:
            cursor.execute("""
                UPDATE appointments
                SET appointment_date = %s, start_time = %s, end_time = %s,
                    status = 'confirmed', confirmed_at = %s
                WHERE appointment_id = %s
                RETURNING *
            """, (new_date.isoformat(), new_start_time.strftime("%H:%M:%S"),
                  new_end_time.strftime("%H:%M:%S"),
                  datetime.now().isoformat(), appointment_id))

        result = cursor.fetchone()
        return dict(result) if result else None


def get_appointment_by_reference(booking_reference: str) -> Optional[Dict[str, Any]]:
    """
    Get appointment by booking reference.
    """
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT a.*, s.full_name as stylist_name
            FROM appointments a
            LEFT JOIN stylists s ON a.stylist_id = s.stylist_id
            WHERE a.booking_reference = %s
        """, (booking_reference,))
        result = cursor.fetchone()
        return dict(result) if result else None


# ============================================
# SALON INFO QUERIES
# ============================================

def get_salon_settings() -> Dict[str, Any]:
    """
    Get salon settings/info.
    """
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM salon_settings LIMIT 1")
        result = cursor.fetchone()
        return dict(result) if result else {}


def get_business_hours() -> List[Dict[str, Any]]:
    """
    Get salon business hours.
    """
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM business_hours ORDER BY day_of_week")
        return [dict(row) for row in cursor.fetchall()]


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
    with get_db_cursor() as cursor:
        cursor.execute("""
            INSERT INTO call_logs (call_id, session_id, caller_phone, customer_id, status, direction)
            VALUES (%s, %s, %s, %s, 'in_progress', 'inbound')
            RETURNING *
        """, (call_id, session_id, caller_phone, customer_id))
        result = cursor.fetchone()
        return dict(result) if result else None


def update_call_log(call_id: str, **kwargs) -> Dict[str, Any]:
    """
    Update a call log entry.
    """
    if not kwargs:
        return None

    with get_db_cursor() as cursor:
        set_parts = ", ".join([f"{k} = %s" for k in kwargs.keys()])
        values = list(kwargs.values()) + [call_id]

        cursor.execute(f"""
            UPDATE call_logs SET {set_parts} WHERE call_id = %s RETURNING *
        """, values)
        result = cursor.fetchone()
        return dict(result) if result else None


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
    import json

    with get_db_cursor() as cursor:
        cursor.execute("""
            INSERT INTO agent_interactions (
                call_id, session_id, agent_type, agent_name,
                user_message, agent_response, tools_called, tool_call_count, duration_ms
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            call_id, session_id, agent_type, agent_name,
            user_message, agent_response,
            json.dumps(tools_called or []),
            len(tools_called) if tools_called else 0,
            duration_ms
        ))
        result = cursor.fetchone()
        return dict(result) if result else None


def log_elevenlabs_usage(
    call_id: str,
    session_id: str,
    usage_type: str,
    voice_id: str,
    characters_used: int = 0,
    audio_duration_seconds: float = 0,
    cost_cents: float = 0,
    latency_ms: int = 0
) -> Dict[str, Any]:
    """
    Log Eleven Labs API usage.
    """
    with get_db_cursor() as cursor:
        cursor.execute("""
            INSERT INTO elevenlabs_usage_logs (
                call_id, session_id, usage_type, voice_id,
                characters_used, audio_duration_seconds, cost_cents, latency_ms
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            call_id, session_id, usage_type, voice_id,
            characters_used, audio_duration_seconds, cost_cents, latency_ms
        ))
        result = cursor.fetchone()
        return dict(result) if result else None

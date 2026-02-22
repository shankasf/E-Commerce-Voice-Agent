"""Database query functions for healthcare voice AI"""
import logging
from typing import Optional, List, Dict, Any
from datetime import date, time, datetime, timedelta
from db.postgres_client import execute_query, execute_query_one, execute_insert, execute_update
from config import settings

logger = logging.getLogger(__name__)


# ============================================
# PATIENT QUERIES
# ============================================

def find_patient_by_phone(phone: str, practice_id: str = None) -> Optional[Dict]:
    """Find patient by phone number (primary, secondary, or work)"""
    practice_id = practice_id or settings.default_practice_id

    # Clean phone number - remove non-digits
    clean_phone = ''.join(filter(str.isdigit, phone))
    phone_pattern = f"%{clean_phone[-10:]}%"

    query = """
        SELECT * FROM patients
        WHERE practice_id = %s
        AND (phone_primary ILIKE %s OR phone_secondary ILIKE %s OR phone_work ILIKE %s)
        LIMIT 1
    """
    return execute_query_one(query, (practice_id, phone_pattern, phone_pattern, phone_pattern))


def find_patient_by_name_dob(
    first_name: str,
    last_name: str,
    dob: str,
    practice_id: str = None
) -> Optional[Dict]:
    """Find patient by name and date of birth. Falls back to name-only if DOB doesn't match."""
    practice_id = practice_id or settings.default_practice_id

    # Try exact match first (name + DOB)
    query = """
        SELECT * FROM patients
        WHERE practice_id = %s
        AND first_name ILIKE %s
        AND last_name ILIKE %s
        AND date_of_birth = %s
        LIMIT 1
    """
    result = execute_query_one(query, (practice_id, f"%{first_name}%", f"%{last_name}%", dob))
    if result:
        return result

    # Fallback: name-only match (DOB may be misheard over voice)
    query_name_only = """
        SELECT * FROM patients
        WHERE practice_id = %s
        AND first_name ILIKE %s
        AND last_name ILIKE %s
        LIMIT 1
    """
    return execute_query_one(query_name_only, (practice_id, f"%{first_name}%", f"%{last_name}%"))


def get_patient_by_id(patient_id: str) -> Optional[Dict]:
    """Get patient by ID"""
    query = "SELECT * FROM patients WHERE patient_id = %s"
    return execute_query_one(query, (patient_id,))


def get_patient_insurance(patient_id: str) -> List[Dict]:
    """Get patient's insurance information"""
    query = """
        SELECT * FROM patient_insurance
        WHERE patient_id = %s AND is_active = true
    """
    return execute_query(query, (patient_id,))


def create_patient(patient_data: Dict) -> Optional[Dict]:
    """Create a new patient"""
    patient_data["practice_id"] = patient_data.get(
        "practice_id", settings.default_practice_id
    )

    columns = ', '.join(patient_data.keys())
    placeholders = ', '.join(['%s'] * len(patient_data))

    query = f"""
        INSERT INTO patients ({columns})
        VALUES ({placeholders})
        RETURNING *
    """
    return execute_insert(query, tuple(patient_data.values()))


# ============================================
# PROVIDER QUERIES
# ============================================

def get_all_providers(practice_id: str = None, active_only: bool = True) -> List[Dict]:
    """Get all providers for a practice"""
    practice_id = practice_id or settings.default_practice_id

    query = """
        SELECT p.*, d.name as department_name
        FROM providers p
        LEFT JOIN departments d ON p.department_id = d.department_id
        WHERE p.practice_id = %s
    """

    if active_only:
        query += " AND p.is_active = true"

    return execute_query(query, (practice_id,))


def get_provider_by_id(provider_id: str) -> Optional[Dict]:
    """Get provider by ID with schedule"""
    query = """
        SELECT p.*, d.name as department_name
        FROM providers p
        LEFT JOIN departments d ON p.department_id = d.department_id
        WHERE p.provider_id = %s
    """
    return execute_query_one(query, (provider_id,))


def get_provider_by_name(name: str, practice_id: str = None) -> Optional[Dict]:
    """Find provider by name (partial match)"""
    practice_id = practice_id or settings.default_practice_id

    # Try to split name if contains space
    parts = name.strip().split()

    if len(parts) >= 2:
        query = """
            SELECT * FROM providers
            WHERE practice_id = %s
            AND first_name ILIKE %s
            AND last_name ILIKE %s
            LIMIT 1
        """
        return execute_query_one(query, (practice_id, f"%{parts[0]}%", f"%{parts[-1]}%"))
    else:
        query = """
            SELECT * FROM providers
            WHERE practice_id = %s
            AND (first_name ILIKE %s OR last_name ILIKE %s)
            LIMIT 1
        """
        return execute_query_one(query, (practice_id, f"%{name}%", f"%{name}%"))


def get_provider_schedule(provider_id: str) -> List[Dict]:
    """Get provider's weekly schedule"""
    query = """
        SELECT * FROM provider_schedules
        WHERE provider_id = %s AND is_available = true
        ORDER BY day_of_week
    """
    return execute_query(query, (provider_id,))


def get_provider_time_off(
    provider_id: str,
    start_date: date,
    end_date: date
) -> List[Dict]:
    """Get provider's time off in date range"""
    query = """
        SELECT * FROM provider_time_off
        WHERE provider_id = %s
        AND end_date >= %s
        AND start_date <= %s
    """
    return execute_query(query, (provider_id, start_date, end_date))


# ============================================
# APPOINTMENT QUERIES
# ============================================

def get_patient_appointments(
    patient_id: str,
    upcoming_only: bool = True,
    limit: int = 10
) -> List[Dict]:
    """Get patient's appointments"""
    query = """
        SELECT a.*,
               p.first_name as provider_first_name,
               p.last_name as provider_last_name,
               p.title as provider_title,
               p.specialization as provider_specialization,
               s.name as service_name,
               s.duration as service_duration
        FROM appointments a
        LEFT JOIN providers p ON a.provider_id = p.provider_id
        LEFT JOIN services s ON a.service_id = s.service_id
        WHERE a.patient_id = %s
    """

    params = [patient_id]

    if upcoming_only:
        query += " AND a.scheduled_date >= %s AND a.status NOT IN ('cancelled', 'completed', 'no_show')"
        params.append(date.today())

    query += " ORDER BY a.scheduled_date, a.scheduled_time LIMIT %s"
    params.append(limit)

    return execute_query(query, tuple(params))


def get_appointments_for_date(
    provider_id: str,
    target_date: date
) -> List[Dict]:
    """Get all appointments for a provider on a specific date"""
    query = """
        SELECT scheduled_time, end_time, duration, status
        FROM appointments
        WHERE provider_id = %s
        AND scheduled_date = %s
        AND status NOT IN ('cancelled', 'no_show')
        ORDER BY scheduled_time
    """
    return execute_query(query, (provider_id, target_date))


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
    start_time_str = str(day_schedule["start_time"])
    end_time_str = str(day_schedule["end_time"])

    # Handle time objects or strings
    if isinstance(day_schedule["start_time"], time):
        start_time = day_schedule["start_time"]
        end_time = day_schedule["end_time"]
    else:
        start_time = datetime.strptime(start_time_str.split('.')[0], "%H:%M:%S").time()
        end_time = datetime.strptime(end_time_str.split('.')[0], "%H:%M:%S").time()

    current = datetime.combine(target_date, start_time)
    end_dt = datetime.combine(target_date, end_time)

    while current + timedelta(minutes=duration) <= end_dt:
        slot_start = current.time()
        slot_end = (current + timedelta(minutes=duration)).time()

        # Check if slot overlaps with any existing appointment
        is_available = True
        for appt in existing:
            appt_start_str = str(appt["scheduled_time"])
            appt_end_str = str(appt["end_time"]) if appt["end_time"] else None

            if isinstance(appt["scheduled_time"], time):
                appt_start = appt["scheduled_time"]
            else:
                appt_start = datetime.strptime(appt_start_str.split('.')[0], "%H:%M:%S").time()

            if appt_end_str:
                if isinstance(appt["end_time"], time):
                    appt_end = appt["end_time"]
                else:
                    appt_end = datetime.strptime(appt_end_str.split('.')[0], "%H:%M:%S").time()
            else:
                # Calculate end time from duration
                appt_end = (datetime.combine(target_date, appt_start) +
                           timedelta(minutes=appt.get("duration", 30))).time()

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
    appointment_data["practice_id"] = appointment_data.get(
        "practice_id", settings.default_practice_id
    )
    appointment_data["created_via"] = appointment_data.get("created_via", "web")

    columns = ', '.join(appointment_data.keys())
    placeholders = ', '.join(['%s'] * len(appointment_data))

    query = f"""
        INSERT INTO appointments ({columns})
        VALUES ({placeholders})
        RETURNING *
    """
    return execute_insert(query, tuple(appointment_data.values()))


def update_appointment(appointment_id: str, updates: Dict) -> Optional[Dict]:
    """Update an existing appointment"""
    set_clause = ', '.join([f"{k} = %s" for k in updates.keys()])

    query = f"""
        UPDATE appointments SET {set_clause}
        WHERE appointment_id = %s
        RETURNING *
    """
    return execute_update(query, tuple(list(updates.values()) + [appointment_id]))


def cancel_appointment(appointment_id: str, reason: str = None) -> bool:
    """Cancel an appointment"""
    query = """
        UPDATE appointments
        SET status = 'cancelled', cancelled_at = %s, cancellation_reason = %s
        WHERE appointment_id = %s
        RETURNING *
    """
    result = execute_update(query, (datetime.utcnow(), reason, appointment_id))
    return result is not None


def reschedule_appointment(
    appointment_id: str,
    new_date: date,
    new_time: time,
    provider_id: str = None,
    created_via: str = "web"
) -> Optional[Dict]:
    """Reschedule an appointment"""
    # Get original appointment
    original = execute_query_one(
        "SELECT * FROM appointments WHERE appointment_id = %s",
        (appointment_id,)
    )

    if not original:
        return None

    # Mark original as rescheduled
    execute_update(
        "UPDATE appointments SET status = 'rescheduled' WHERE appointment_id = %s RETURNING *",
        (appointment_id,)
    )

    # Create new appointment
    query = """
        INSERT INTO appointments (
            practice_id, patient_id, provider_id, service_id,
            appointment_type, scheduled_date, scheduled_time,
            duration, chief_complaint, rescheduled_from_id, created_via
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """

    new_appt = execute_insert(query, (
        original["practice_id"],
        original["patient_id"],
        provider_id or original["provider_id"],
        original["service_id"],
        original["appointment_type"],
        new_date,
        new_time,
        original["duration"],
        original["chief_complaint"],
        appointment_id,
        created_via
    ))

    if new_appt:
        # Update original with reference to new appointment
        execute_update(
            "UPDATE appointments SET rescheduled_to_id = %s WHERE appointment_id = %s RETURNING *",
            (new_appt["appointment_id"], appointment_id)
        )

    return new_appt


# ============================================
# SERVICE QUERIES
# ============================================

def get_services(practice_id: str = None, category: str = None) -> List[Dict]:
    """Get available services"""
    practice_id = practice_id or settings.default_practice_id

    query = """
        SELECT s.*, sc.name as category_name
        FROM services s
        LEFT JOIN service_categories sc ON s.category_id = sc.category_id
        WHERE s.practice_id = %s AND s.is_active = true
    """
    params = [practice_id]

    if category:
        query += " AND sc.name = %s"
        params.append(category)

    return execute_query(query, tuple(params))


def get_service_by_name(name: str, practice_id: str = None) -> Optional[Dict]:
    """Find service by name"""
    practice_id = practice_id or settings.default_practice_id

    query = """
        SELECT * FROM services
        WHERE practice_id = %s AND name ILIKE %s AND is_active = true
        LIMIT 1
    """
    return execute_query_one(query, (practice_id, f"%{name}%"))


# ============================================
# CALL LOG QUERIES
# ============================================

def create_call_log(call_data: Dict) -> Optional[Dict]:
    """Create a call log entry"""
    call_data["practice_id"] = call_data.get(
        "practice_id", settings.default_practice_id
    )

    columns = ', '.join(call_data.keys())
    placeholders = ', '.join(['%s'] * len(call_data))

    query = f"""
        INSERT INTO call_logs ({columns})
        VALUES ({placeholders})
        RETURNING *
    """
    return execute_insert(query, tuple(call_data.values()))


def update_call_log(log_id: str, updates: Dict) -> Optional[Dict]:
    """Update a call log entry"""
    set_clause = ', '.join([f"{k} = %s" for k in updates.keys()])

    query = f"""
        UPDATE call_logs SET {set_clause}
        WHERE log_id = %s
        RETURNING *
    """
    return execute_update(query, tuple(list(updates.values()) + [log_id]))


def get_call_logs(
    patient_id: str = None,
    limit: int = 50
) -> List[Dict]:
    """Get call logs with optional patient filter"""
    query = """
        SELECT cl.*, p.first_name, p.last_name
        FROM call_logs cl
        LEFT JOIN patients p ON cl.patient_id = p.patient_id
    """
    params = []

    if patient_id:
        query += " WHERE cl.patient_id = %s"
        params.append(patient_id)

    query += " ORDER BY cl.created_at DESC LIMIT %s"
    params.append(limit)

    return execute_query(query, tuple(params))


# ============================================
# CALL LOG ANALYTICS QUERIES
# ============================================

def save_call_log_analytics(log_id: str, analytics: Dict) -> Optional[Dict]:
    """Save AI-generated analytics for a call log"""
    import json
    query = """
        INSERT INTO call_log_analytics (log_id, sentiment_label, sentiment_score, lead_classification,
            lead_score, intent, key_topics, patient_satisfaction, escalation_required, escalation_reason,
            ai_summary, analyzed_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (log_id) DO UPDATE SET
            sentiment_label = EXCLUDED.sentiment_label,
            sentiment_score = EXCLUDED.sentiment_score,
            lead_classification = EXCLUDED.lead_classification,
            lead_score = EXCLUDED.lead_score,
            intent = EXCLUDED.intent,
            key_topics = EXCLUDED.key_topics,
            patient_satisfaction = EXCLUDED.patient_satisfaction,
            escalation_required = EXCLUDED.escalation_required,
            escalation_reason = EXCLUDED.escalation_reason,
            ai_summary = EXCLUDED.ai_summary,
            analyzed_at = NOW()
        RETURNING *
    """
    topics_json = json.dumps(analytics.get("key_topics", []))
    params = (
        log_id,
        analytics.get("sentiment_label"),
        analytics.get("sentiment_score"),
        analytics.get("lead_classification"),
        analytics.get("lead_score"),
        analytics.get("intent"),
        topics_json,
        analytics.get("patient_satisfaction"),
        analytics.get("escalation_required", False),
        analytics.get("escalation_reason"),
        analytics.get("ai_summary"),
    )
    return execute_insert(query, params)


# ============================================
# PRACTICE / SETTINGS QUERIES
# ============================================

def get_practice(practice_id: str = None) -> Optional[Dict]:
    """Get practice information"""
    practice_id = practice_id or settings.default_practice_id

    query = "SELECT * FROM practices WHERE practice_id = %s"
    return execute_query_one(query, (practice_id,))


def get_office_hours(practice_id: str = None) -> Optional[Dict]:
    """Get practice office hours"""
    practice = get_practice(practice_id)
    if practice:
        return practice.get("office_hours", {})
    return None

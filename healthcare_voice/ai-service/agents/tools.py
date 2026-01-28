"""Tool handlers for healthcare voice agent"""
import logging
from typing import Dict, Any
from datetime import date, datetime, timedelta
from db import queries

logger = logging.getLogger(__name__)


async def lookup_patient(args: Dict, session) -> Dict:
    """Look up patient by name and DOB"""
    first_name = args.get("first_name", "")
    last_name = args.get("last_name", "")
    dob = args.get("date_of_birth", "")

    patient = queries.find_patient_by_name_dob(first_name, last_name, dob)

    if patient:
        # Update session with patient info
        session.patient_id = patient["patient_id"]
        session.patient_data = patient

        return {
            "found": True,
            "patient_id": patient["patient_id"],
            "first_name": patient["first_name"],
            "last_name": patient["last_name"],
            "date_of_birth": patient["date_of_birth"],
            "phone": patient.get("phone_primary", ""),
            "allergies": patient.get("allergies", []),
            "preferred_provider_id": patient.get("preferred_provider_id")
        }
    else:
        return {
            "found": False,
            "message": "No patient found with that name and date of birth"
        }


async def lookup_patient_by_phone(args: Dict, session) -> Dict:
    """Look up patient by phone number"""
    phone = args.get("phone", "")

    patient = queries.find_patient_by_phone(phone)

    if patient:
        session.patient_id = patient["patient_id"]
        session.patient_data = patient

        return {
            "found": True,
            "patient_id": patient["patient_id"],
            "first_name": patient["first_name"],
            "last_name": patient["last_name"],
            "date_of_birth": patient["date_of_birth"],
            "phone": patient.get("phone_primary", "")
        }
    else:
        return {
            "found": False,
            "message": "No patient found with that phone number"
        }


async def get_patient_appointments(args: Dict, session) -> Dict:
    """Get patient's upcoming appointments"""
    patient_id = args.get("patient_id") or session.patient_id

    if not patient_id:
        return {"error": "Patient ID required"}

    appointments = queries.get_patient_appointments(patient_id, upcoming_only=True)

    formatted = []
    for appt in appointments:
        provider = appt.get("providers", {})
        service = appt.get("services", {})

        formatted.append({
            "appointment_id": appt["appointment_id"],
            "date": appt["scheduled_date"],
            "time": appt["scheduled_time"],
            "status": appt["status"],
            "type": appt["appointment_type"],
            "provider": f"{provider.get('title', '')} {provider.get('first_name', '')} {provider.get('last_name', '')}".strip(),
            "specialization": provider.get("specialization", ""),
            "service": service.get("name") if service else None,
            "reason": appt.get("chief_complaint", "")
        })

    return {
        "appointments": formatted,
        "count": len(formatted)
    }


async def get_available_slots(args: Dict, session) -> Dict:
    """Get available appointment slots"""
    provider_id = args.get("provider_id")
    date_str = args.get("date")
    duration = args.get("duration", 30)

    if not provider_id or not date_str:
        return {"error": "Provider ID and date are required"}

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD"}

    # Don't allow past dates
    if target_date < date.today():
        return {"error": "Cannot check availability for past dates"}

    slots = queries.get_available_slots(provider_id, target_date, duration)

    return {
        "date": date_str,
        "provider_id": provider_id,
        "slots": slots,
        "count": len(slots)
    }


async def find_next_available(args: Dict, session) -> Dict:
    """Find next available appointment slot"""
    provider_id = args.get("provider_id")
    specialization = args.get("specialization")
    duration = args.get("duration", 30)

    providers_to_check = []

    if provider_id:
        provider = queries.get_provider_by_id(provider_id)
        if provider:
            providers_to_check = [provider]
    else:
        all_providers = queries.get_all_providers()
        if specialization:
            providers_to_check = [
                p for p in all_providers
                if specialization.lower() in (p.get("specialization", "") or "").lower()
            ]
        else:
            providers_to_check = all_providers

    if not providers_to_check:
        return {"error": "No providers found matching criteria"}

    # Check next 14 days
    results = []
    for provider in providers_to_check:
        for day_offset in range(14):
            check_date = date.today() + timedelta(days=day_offset)
            slots = queries.get_available_slots(
                provider["provider_id"],
                check_date,
                duration
            )
            if slots:
                results.append({
                    "provider_id": provider["provider_id"],
                    "provider_name": f"{provider.get('title', '')} {provider['first_name']} {provider['last_name']}".strip(),
                    "specialization": provider.get("specialization", ""),
                    "date": check_date.isoformat(),
                    "first_available_slot": slots[0],
                    "total_slots": len(slots)
                })
                break  # Found availability for this provider

    return {
        "results": results,
        "count": len(results)
    }


async def schedule_appointment(args: Dict, session) -> Dict:
    """Schedule a new appointment"""
    patient_id = args.get("patient_id") or session.patient_id
    provider_id = args.get("provider_id")
    date_str = args.get("date")
    time_str = args.get("time")
    appointment_type = args.get("appointment_type", "routine_checkup")
    reason = args.get("reason", "")
    duration = args.get("duration", 30)

    if not all([patient_id, provider_id, date_str, time_str]):
        return {"error": "Missing required fields: patient_id, provider_id, date, time"}

    # Validate date/time
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        target_time = datetime.strptime(time_str, "%H:%M").time()
    except ValueError:
        return {"error": "Invalid date or time format"}

    # Check availability
    slots = queries.get_available_slots(provider_id, target_date, duration)
    time_available = any(
        s["start_time"] == time_str for s in slots
    )

    if not time_available:
        return {
            "success": False,
            "error": "The requested time slot is not available",
            "available_slots": slots[:5]  # Return some alternatives
        }

    # Create appointment
    appointment = queries.create_appointment({
        "patient_id": patient_id,
        "provider_id": provider_id,
        "scheduled_date": date_str,
        "scheduled_time": time_str,
        "appointment_type": appointment_type,
        "chief_complaint": reason,
        "duration": duration,
        "status": "scheduled"
    })

    if appointment:
        provider = queries.get_provider_by_id(provider_id)
        provider_name = f"{provider.get('title', '')} {provider['first_name']} {provider['last_name']}".strip() if provider else "Provider"

        return {
            "success": True,
            "appointment_id": appointment["appointment_id"],
            "confirmation": {
                "date": date_str,
                "time": time_str,
                "provider": provider_name,
                "type": appointment_type,
                "reason": reason
            }
        }
    else:
        return {
            "success": False,
            "error": "Failed to create appointment"
        }


async def cancel_appointment(args: Dict, session) -> Dict:
    """Cancel an appointment"""
    appointment_id = args.get("appointment_id")
    reason = args.get("reason", "")

    if not appointment_id:
        return {"error": "Appointment ID required"}

    success = queries.cancel_appointment(appointment_id, reason)

    return {
        "success": success,
        "message": "Appointment cancelled successfully" if success else "Failed to cancel appointment"
    }


async def reschedule_appointment(args: Dict, session) -> Dict:
    """Reschedule an appointment"""
    appointment_id = args.get("appointment_id")
    new_date_str = args.get("new_date")
    new_time_str = args.get("new_time")
    new_provider_id = args.get("new_provider_id")

    if not all([appointment_id, new_date_str, new_time_str]):
        return {"error": "Missing required fields"}

    try:
        new_date = datetime.strptime(new_date_str, "%Y-%m-%d").date()
        new_time = datetime.strptime(new_time_str, "%H:%M").time()
    except ValueError:
        return {"error": "Invalid date or time format"}

    result = queries.reschedule_appointment(
        appointment_id,
        new_date,
        new_time,
        new_provider_id
    )

    if result:
        return {
            "success": True,
            "new_appointment_id": result["appointment_id"],
            "new_date": new_date_str,
            "new_time": new_time_str,
            "message": "Appointment rescheduled successfully"
        }
    else:
        return {
            "success": False,
            "error": "Failed to reschedule appointment"
        }


async def get_providers(args: Dict, session) -> Dict:
    """Get list of providers"""
    specialization = args.get("specialization")
    accepting_new = args.get("accepting_new_patients")

    providers = queries.get_all_providers()

    if specialization:
        providers = [
            p for p in providers
            if specialization.lower() in (p.get("specialization", "") or "").lower()
        ]

    if accepting_new is not None:
        providers = [
            p for p in providers
            if p.get("accepting_new_patients") == accepting_new
        ]

    formatted = []
    for p in providers:
        formatted.append({
            "provider_id": p["provider_id"],
            "name": f"{p.get('title', '')} {p['first_name']} {p['last_name']}".strip(),
            "specialization": p.get("specialization", ""),
            "provider_type": p.get("provider_type", ""),
            "accepting_new_patients": p.get("accepting_new_patients", True),
            "department": p.get("departments", {}).get("name") if p.get("departments") else None
        })

    return {
        "providers": formatted,
        "count": len(formatted)
    }


async def get_provider_info(args: Dict, session) -> Dict:
    """Get detailed provider information"""
    provider_id = args.get("provider_id")
    provider_name = args.get("provider_name")

    provider = None
    if provider_id:
        provider = queries.get_provider_by_id(provider_id)
    elif provider_name:
        provider = queries.get_provider_by_name(provider_name)

    if not provider:
        return {"error": "Provider not found"}

    # Format schedule
    schedules = provider.get("provider_schedules", [])
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    schedule_formatted = []

    for s in schedules:
        if s.get("is_available"):
            schedule_formatted.append({
                "day": day_names[s["day_of_week"]],
                "hours": f"{s['start_time']} - {s['end_time']}"
            })

    return {
        "provider_id": provider["provider_id"],
        "name": f"{provider.get('title', '')} {provider['first_name']} {provider['last_name']}".strip(),
        "specialization": provider.get("specialization", ""),
        "provider_type": provider.get("provider_type", ""),
        "accepting_new_patients": provider.get("accepting_new_patients", True),
        "telehealth_enabled": provider.get("telehealth_enabled", False),
        "default_appointment_duration": provider.get("default_appointment_duration", 30),
        "department": provider.get("departments", {}).get("name") if provider.get("departments") else None,
        "schedule": schedule_formatted
    }


async def get_services(args: Dict, session) -> Dict:
    """Get available services"""
    category = args.get("category")

    services = queries.get_services(category=category)

    formatted = []
    for s in services:
        formatted.append({
            "service_id": s["service_id"],
            "name": s["name"],
            "description": s.get("description", ""),
            "duration": s.get("duration", 30),
            "price": float(s["price"]) if s.get("price") else None,
            "category": s.get("service_categories", {}).get("name") if s.get("service_categories") else None
        })

    return {
        "services": formatted,
        "count": len(formatted)
    }


async def get_office_hours(args: Dict, session) -> Dict:
    """Get office hours"""
    hours = queries.get_office_hours()

    if hours:
        formatted = []
        day_order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

        for day in day_order:
            if day in hours and hours[day]:
                formatted.append({
                    "day": day.capitalize(),
                    "open": hours[day].get("open"),
                    "close": hours[day].get("close")
                })
            else:
                formatted.append({
                    "day": day.capitalize(),
                    "status": "Closed"
                })

        return {"office_hours": formatted}
    else:
        return {"error": "Office hours not available"}


async def create_new_patient(args: Dict, session) -> Dict:
    """Create a new patient"""
    first_name = args.get("first_name")
    last_name = args.get("last_name")
    dob = args.get("date_of_birth")
    phone = args.get("phone")
    email = args.get("email")

    if not all([first_name, last_name, dob, phone]):
        return {"error": "Missing required fields: first_name, last_name, date_of_birth, phone"}

    # Check if patient already exists
    existing = queries.find_patient_by_name_dob(first_name, last_name, dob)
    if existing:
        return {
            "success": False,
            "error": "A patient with this name and date of birth already exists",
            "patient_id": existing["patient_id"]
        }

    patient = queries.create_patient({
        "first_name": first_name,
        "last_name": last_name,
        "date_of_birth": dob,
        "phone_primary": phone,
        "email": email
    })

    if patient:
        session.patient_id = patient["patient_id"]
        session.patient_data = patient

        return {
            "success": True,
            "patient_id": patient["patient_id"],
            "mrn": patient.get("mrn"),
            "message": f"Patient {first_name} {last_name} has been registered successfully"
        }
    else:
        return {
            "success": False,
            "error": "Failed to create patient record"
        }


async def get_patient_insurance(args: Dict, session) -> Dict:
    """Get patient insurance information"""
    patient_id = args.get("patient_id") or session.patient_id

    if not patient_id:
        return {"error": "Patient ID required"}

    insurance = queries.get_patient_insurance(patient_id)

    formatted = []
    for ins in insurance:
        formatted.append({
            "insurance_type": ins.get("insurance_type", "primary"),
            "payer_name": ins.get("payer_name"),
            "plan_name": ins.get("plan_name"),
            "member_id": ins.get("member_id"),
            "group_number": ins.get("group_number"),
            "copay": float(ins["copay_amount"]) if ins.get("copay_amount") else None,
            "verification_status": ins.get("verification_status")
        })

    return {
        "insurance": formatted,
        "count": len(formatted)
    }


# Map function names to handlers
TOOL_HANDLERS = {
    "lookup_patient": lookup_patient,
    "lookup_patient_by_phone": lookup_patient_by_phone,
    "get_patient_appointments": get_patient_appointments,
    "get_available_slots": get_available_slots,
    "find_next_available": find_next_available,
    "schedule_appointment": schedule_appointment,
    "cancel_appointment": cancel_appointment,
    "reschedule_appointment": reschedule_appointment,
    "get_providers": get_providers,
    "get_provider_info": get_provider_info,
    "get_services": get_services,
    "get_office_hours": get_office_hours,
    "create_new_patient": create_new_patient,
    "get_patient_insurance": get_patient_insurance
}

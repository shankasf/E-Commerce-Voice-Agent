"""Appointment API routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
from db import queries

router = APIRouter()


class AppointmentCreate(BaseModel):
    patient_id: str
    provider_id: str
    scheduled_date: str
    scheduled_time: str
    appointment_type: str = "routine_checkup"
    chief_complaint: Optional[str] = None
    service_id: Optional[str] = None
    duration: int = 30


class AppointmentReschedule(BaseModel):
    new_date: str
    new_time: str
    new_provider_id: Optional[str] = None


class AppointmentCancel(BaseModel):
    reason: Optional[str] = None


@router.get("/")
async def list_appointments(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    provider_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    """List appointments with optional filters"""
    from db.supabase_client import get_supabase
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query = supabase.table("appointments").select(
        "*, patients(first_name, last_name, phone_primary), "
        "providers(first_name, last_name, title, specialization), "
        "services(name, duration)"
    )

    if date:
        query = query.eq("scheduled_date", date)
    if provider_id:
        query = query.eq("provider_id", provider_id)
    if patient_id:
        query = query.eq("patient_id", patient_id)
    if status:
        query = query.eq("status", status)

    result = query.order("scheduled_date").order("scheduled_time").limit(limit).execute()

    return {"appointments": result.data or [], "count": len(result.data or [])}


@router.get("/today")
async def get_todays_appointments(provider_id: Optional[str] = Query(None)):
    """Get today's appointments"""
    from db.supabase_client import get_supabase
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")

    today = date.today().isoformat()

    query = supabase.table("appointments").select(
        "*, patients(first_name, last_name, phone_primary), "
        "providers(first_name, last_name, title), services(name)"
    ).eq("scheduled_date", today)

    if provider_id:
        query = query.eq("provider_id", provider_id)

    result = query.order("scheduled_time").execute()

    return {"appointments": result.data or [], "count": len(result.data or [])}


@router.get("/availability")
async def check_availability(
    provider_id: str = Query(..., description="Provider ID"),
    date: str = Query(..., description="Date YYYY-MM-DD"),
    duration: int = Query(30, description="Duration in minutes")
):
    """Check available appointment slots"""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    slots = queries.get_available_slots(provider_id, target_date, duration)

    return {
        "provider_id": provider_id,
        "date": date,
        "duration": duration,
        "slots": slots,
        "count": len(slots)
    }


@router.get("/{appointment_id}")
async def get_appointment(appointment_id: str):
    """Get appointment by ID"""
    from db.supabase_client import get_supabase
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")

    result = supabase.table("appointments").select(
        "*, patients(first_name, last_name, phone_primary, email), "
        "providers(first_name, last_name, title, specialization), "
        "services(name, duration, price)"
    ).eq("appointment_id", appointment_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return result.data


@router.post("/")
async def create_appointment(appointment: AppointmentCreate):
    """Create a new appointment"""
    # Verify patient exists
    patient = queries.get_patient_by_id(appointment.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Verify provider exists
    provider = queries.get_provider_by_id(appointment.provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    # Check availability
    try:
        target_date = datetime.strptime(appointment.scheduled_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    slots = queries.get_available_slots(
        appointment.provider_id,
        target_date,
        appointment.duration
    )

    if not any(s["start_time"] == appointment.scheduled_time for s in slots):
        raise HTTPException(
            status_code=409,
            detail="Time slot not available"
        )

    # Create appointment
    new_appt = queries.create_appointment(appointment.model_dump())
    if not new_appt:
        raise HTTPException(status_code=500, detail="Failed to create appointment")

    return new_appt


@router.put("/{appointment_id}/reschedule")
async def reschedule_appointment(
    appointment_id: str,
    reschedule: AppointmentReschedule
):
    """Reschedule an appointment"""
    try:
        new_date = datetime.strptime(reschedule.new_date, "%Y-%m-%d").date()
        new_time = datetime.strptime(reschedule.new_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format")

    result = queries.reschedule_appointment(
        appointment_id,
        new_date,
        new_time,
        reschedule.new_provider_id
    )

    if not result:
        raise HTTPException(status_code=400, detail="Failed to reschedule")

    return result


@router.put("/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, cancel: AppointmentCancel):
    """Cancel an appointment"""
    success = queries.cancel_appointment(appointment_id, cancel.reason)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to cancel")

    return {"success": True, "message": "Appointment cancelled"}


@router.put("/{appointment_id}/confirm")
async def confirm_appointment(appointment_id: str):
    """Confirm an appointment"""
    result = queries.update_appointment(appointment_id, {
        "status": "confirmed",
        "confirmation_sent": True,
        "confirmation_sent_at": datetime.utcnow().isoformat()
    })

    if not result:
        raise HTTPException(status_code=400, detail="Failed to confirm")

    return {"success": True, "message": "Appointment confirmed"}


@router.put("/{appointment_id}/checkin")
async def checkin_appointment(appointment_id: str):
    """Check in patient for appointment"""
    result = queries.update_appointment(appointment_id, {
        "status": "checked_in",
        "checked_in_at": datetime.utcnow().isoformat()
    })

    if not result:
        raise HTTPException(status_code=400, detail="Failed to check in")

    return {"success": True, "message": "Patient checked in"}

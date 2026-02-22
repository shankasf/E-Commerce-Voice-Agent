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
    from db.postgres_client import execute_query

    query = """
        SELECT a.*,
               pt.first_name as patient_first_name, pt.last_name as patient_last_name, pt.phone_primary,
               pr.first_name as provider_first_name, pr.last_name as provider_last_name, pr.title, pr.specialization,
               s.name as service_name, s.duration as service_duration
        FROM appointments a
        LEFT JOIN patients pt ON a.patient_id = pt.patient_id
        LEFT JOIN providers pr ON a.provider_id = pr.provider_id
        LEFT JOIN services s ON a.service_id = s.service_id
        WHERE 1=1
    """
    params = []

    if date:
        query += " AND a.scheduled_date = %s"
        params.append(date)
    if provider_id:
        query += " AND a.provider_id = %s"
        params.append(provider_id)
    if patient_id:
        query += " AND a.patient_id = %s"
        params.append(patient_id)
    if status:
        query += " AND a.status = %s"
        params.append(status)

    query += " ORDER BY a.scheduled_date, a.scheduled_time LIMIT %s"
    params.append(limit)

    appointments = execute_query(query, tuple(params))
    return {"appointments": appointments, "count": len(appointments)}


@router.get("/today")
async def get_todays_appointments(provider_id: Optional[str] = Query(None)):
    """Get today's appointments"""
    from db.postgres_client import execute_query

    today = date.today().isoformat()

    query = """
        SELECT a.*,
               pt.first_name as patient_first_name, pt.last_name as patient_last_name, pt.phone_primary,
               pr.first_name as provider_first_name, pr.last_name as provider_last_name, pr.title,
               s.name as service_name
        FROM appointments a
        LEFT JOIN patients pt ON a.patient_id = pt.patient_id
        LEFT JOIN providers pr ON a.provider_id = pr.provider_id
        LEFT JOIN services s ON a.service_id = s.service_id
        WHERE a.scheduled_date = %s
    """
    params = [today]

    if provider_id:
        query += " AND a.provider_id = %s"
        params.append(provider_id)

    query += " ORDER BY a.scheduled_time"

    appointments = execute_query(query, tuple(params))
    return {"appointments": appointments, "count": len(appointments)}


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
    from db.postgres_client import execute_query_one

    query = """
        SELECT a.*,
               pt.first_name as patient_first_name, pt.last_name as patient_last_name,
               pt.phone_primary, pt.email as patient_email,
               pr.first_name as provider_first_name, pr.last_name as provider_last_name,
               pr.title, pr.specialization,
               s.name as service_name, s.duration as service_duration, s.price as service_price
        FROM appointments a
        LEFT JOIN patients pt ON a.patient_id = pt.patient_id
        LEFT JOIN providers pr ON a.provider_id = pr.provider_id
        LEFT JOIN services s ON a.service_id = s.service_id
        WHERE a.appointment_id = %s
    """

    appointment = execute_query_one(query, (appointment_id,))

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return appointment


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

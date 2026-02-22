"""Provider API routes"""
from datetime import time as time_type
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from db import queries

router = APIRouter()


@router.get("/")
async def list_providers(
    specialization: Optional[str] = Query(None),
    accepting_new_patients: Optional[bool] = Query(None),
    active_only: bool = Query(True)
):
    """List all providers"""
    providers = queries.get_all_providers(active_only=active_only)

    if specialization:
        providers = [
            p for p in providers
            if specialization.lower() in (p.get("specialization", "") or "").lower()
        ]

    if accepting_new_patients is not None:
        providers = [
            p for p in providers
            if p.get("accepting_new_patients") == accepting_new_patients
        ]

    # Format response
    formatted = []
    for p in providers:
        formatted.append({
            "provider_id": p["provider_id"],
            "name": f"{p.get('title', '')} {p['first_name']} {p['last_name']}".strip(),
            "first_name": p["first_name"],
            "last_name": p["last_name"],
            "title": p.get("title"),
            "provider_type": p.get("provider_type"),
            "specialization": p.get("specialization"),
            "accepting_new_patients": p.get("accepting_new_patients", True),
            "telehealth_enabled": p.get("telehealth_enabled", False),
            "default_appointment_duration": p.get("default_appointment_duration", 30),
            "department": p.get("department_name")
        })

    return {"providers": formatted, "count": len(formatted)}


@router.get("/{provider_id}")
async def get_provider(provider_id: str):
    """Get provider by ID with schedule"""
    provider = queries.get_provider_by_id(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    # Fetch schedule separately from provider_schedules table
    schedules = queries.get_provider_schedule(provider_id)
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    schedule_formatted = []
    for s in schedules:
        start = s["start_time"]
        end = s["end_time"]
        if isinstance(start, time_type):
            start = start.strftime("%H:%M")
        if isinstance(end, time_type):
            end = end.strftime("%H:%M")
        schedule_formatted.append({
            "day_of_week": s["day_of_week"],
            "day_name": day_names[s["day_of_week"]],
            "start_time": start,
            "end_time": end,
            "is_available": s.get("is_available", True),
            "location": s.get("location")
        })

    return {
        "provider_id": provider["provider_id"],
        "name": f"{provider.get('title', '')} {provider['first_name']} {provider['last_name']}".strip(),
        "first_name": provider["first_name"],
        "last_name": provider["last_name"],
        "title": provider.get("title"),
        "provider_type": provider.get("provider_type"),
        "specialization": provider.get("specialization"),
        "email": provider.get("email"),
        "phone": provider.get("phone"),
        "bio": provider.get("bio"),
        "accepting_new_patients": provider.get("accepting_new_patients", True),
        "telehealth_enabled": provider.get("telehealth_enabled", False),
        "default_appointment_duration": provider.get("default_appointment_duration", 30),
        "department": provider.get("department_name"),
        "schedule": schedule_formatted
    }


@router.get("/{provider_id}/schedule")
async def get_provider_schedule(provider_id: str):
    """Get provider's weekly schedule"""
    schedule = queries.get_provider_schedule(provider_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    formatted = []
    for s in schedule:
        formatted.append({
            "day_of_week": s["day_of_week"],
            "day_name": day_names[s["day_of_week"]],
            "start_time": s["start_time"],
            "end_time": s["end_time"],
            "is_available": s.get("is_available", True)
        })

    return {"schedule": formatted}


@router.get("/{provider_id}/time-off")
async def get_provider_time_off(
    provider_id: str,
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD")
):
    """Get provider's time off in date range"""
    from datetime import datetime

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    time_off = queries.get_provider_time_off(provider_id, start, end)

    return {"time_off": time_off, "count": len(time_off)}


@router.get("/{provider_id}/appointments")
async def get_provider_appointments(
    provider_id: str,
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD")
):
    """Get provider's appointments"""
    from db.postgres_client import execute_query
    from datetime import date as date_type

    query = """
        SELECT a.*,
               pt.first_name as patient_first_name, pt.last_name as patient_last_name, pt.phone_primary,
               s.name as service_name
        FROM appointments a
        LEFT JOIN patients pt ON a.patient_id = pt.patient_id
        LEFT JOIN services s ON a.service_id = s.service_id
        WHERE a.provider_id = %s
        AND a.status NOT IN ('cancelled', 'no_show')
    """
    params = [provider_id]

    if date:
        query += " AND a.scheduled_date = %s"
        params.append(date)
    else:
        query += " AND a.scheduled_date >= %s"
        params.append(date_type.today().isoformat())

    query += " ORDER BY a.scheduled_date, a.scheduled_time"

    appointments = execute_query(query, tuple(params))
    return {"appointments": appointments, "count": len(appointments)}


@router.get("/search/name")
async def search_provider_by_name(name: str = Query(..., min_length=2)):
    """Search provider by name"""
    provider = queries.get_provider_by_name(name)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    return {
        "provider_id": provider["provider_id"],
        "name": f"{provider.get('title', '')} {provider['first_name']} {provider['last_name']}".strip(),
        "specialization": provider.get("specialization"),
        "provider_type": provider.get("provider_type")
    }

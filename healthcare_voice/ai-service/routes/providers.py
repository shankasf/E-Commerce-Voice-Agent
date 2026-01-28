"""Provider API routes"""
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
            "department": p.get("departments", {}).get("name") if p.get("departments") else None
        })

    return {"providers": formatted, "count": len(formatted)}


@router.get("/{provider_id}")
async def get_provider(provider_id: str):
    """Get provider by ID with schedule"""
    provider = queries.get_provider_by_id(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    # Format schedule
    schedules = provider.get("provider_schedules", [])
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    schedule_formatted = []
    for s in schedules:
        schedule_formatted.append({
            "day_of_week": s["day_of_week"],
            "day_name": day_names[s["day_of_week"]],
            "start_time": s["start_time"],
            "end_time": s["end_time"],
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
        "department": provider.get("departments", {}).get("name") if provider.get("departments") else None,
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
    from db.supabase_client import get_supabase
    from datetime import date as date_type

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query = supabase.table("appointments").select(
        "*, patients(first_name, last_name, phone_primary), services(name)"
    ).eq("provider_id", provider_id)

    if date:
        query = query.eq("scheduled_date", date)
    else:
        query = query.gte("scheduled_date", date_type.today().isoformat())

    query = query.not_.in_("status", ["cancelled", "no_show"])

    result = query.order("scheduled_date").order("scheduled_time").execute()

    return {"appointments": result.data or [], "count": len(result.data or [])}


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

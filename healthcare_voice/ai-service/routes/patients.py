"""Patient API routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from db import queries

router = APIRouter()


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str
    phone_primary: str
    email: Optional[str] = None
    gender: Optional[str] = None


class PatientSearch(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None


@router.get("/")
async def list_patients(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """List all patients (paginated)"""
    from db.postgres_client import execute_query

    query = """
        SELECT patient_id, mrn, first_name, last_name, date_of_birth, phone_primary, email
        FROM patients
        ORDER BY last_name, first_name
        LIMIT %s OFFSET %s
    """
    patients = execute_query(query, (limit, offset))
    return {"patients": patients, "count": len(patients)}


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get patient by ID"""
    patient = queries.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/search")
async def search_patient(search: PatientSearch):
    """Search for a patient"""
    if search.phone:
        patient = queries.find_patient_by_phone(search.phone)
    elif search.first_name and search.last_name and search.date_of_birth:
        patient = queries.find_patient_by_name_dob(
            search.first_name,
            search.last_name,
            search.date_of_birth
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide phone OR (first_name, last_name, date_of_birth)"
        )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.post("/")
async def create_patient(patient: PatientCreate):
    """Create a new patient"""
    # Check if patient exists
    existing = queries.find_patient_by_name_dob(
        patient.first_name,
        patient.last_name,
        patient.date_of_birth
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Patient already exists"
        )

    new_patient = queries.create_patient(patient.model_dump())
    if not new_patient:
        raise HTTPException(status_code=500, detail="Failed to create patient")

    return new_patient


@router.get("/{patient_id}/appointments")
async def get_patient_appointments(
    patient_id: str,
    upcoming_only: bool = Query(True)
):
    """Get patient's appointments"""
    patient = queries.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    appointments = queries.get_patient_appointments(patient_id, upcoming_only)
    return {"appointments": appointments, "count": len(appointments)}


@router.get("/{patient_id}/insurance")
async def get_patient_insurance(patient_id: str):
    """Get patient's insurance information"""
    patient = queries.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    insurance = queries.get_patient_insurance(patient_id)
    return {"insurance": insurance, "count": len(insurance)}

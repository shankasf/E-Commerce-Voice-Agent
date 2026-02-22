"""Appointment-related tool definitions for OpenAI Realtime API"""
from typing import List, Dict

APPOINTMENT_TOOLS: List[Dict] = [
    {
        "type": "function",
        "name": "get_patient_appointments",
        "description": "Get a patient's upcoming appointments. Use this when a patient asks about their scheduled appointments.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_id": {
                    "type": "string",
                    "description": "The patient's unique ID"
                }
            },
            "required": ["patient_id"]
        }
    },
    {
        "type": "function",
        "name": "get_available_slots",
        "description": "Get available appointment slots for a specific provider on a specific date. Use this to check what times are open.",
        "parameters": {
            "type": "object",
            "properties": {
                "provider_id": {
                    "type": "string",
                    "description": "The provider's unique ID"
                },
                "date": {
                    "type": "string",
                    "description": "The date to check availability in YYYY-MM-DD format"
                },
                "duration": {
                    "type": "integer",
                    "description": "Appointment duration in minutes (default 30)"
                }
            },
            "required": ["provider_id", "date"]
        }
    },
    {
        "type": "function",
        "name": "find_next_available",
        "description": "Find the next available appointment slot within the next 2 weeks. Can filter by provider or specialization.",
        "parameters": {
            "type": "object",
            "properties": {
                "provider_id": {
                    "type": "string",
                    "description": "The provider's unique ID (optional - will search all providers if not specified)"
                },
                "specialization": {
                    "type": "string",
                    "description": "Provider specialization to filter by (e.g., 'Family Medicine', 'Dentistry')"
                },
                "duration": {
                    "type": "integer",
                    "description": "Required appointment duration in minutes"
                }
            },
            "required": []
        }
    },
    {
        "type": "function",
        "name": "schedule_appointment",
        "description": "Schedule a new appointment for a patient. Requires patient ID, provider ID, date, time, and reason.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_id": {
                    "type": "string",
                    "description": "The patient's unique ID"
                },
                "provider_id": {
                    "type": "string",
                    "description": "The provider's unique ID"
                },
                "date": {
                    "type": "string",
                    "description": "Appointment date in YYYY-MM-DD format"
                },
                "time": {
                    "type": "string",
                    "description": "Appointment time in HH:MM format (24-hour)"
                },
                "appointment_type": {
                    "type": "string",
                    "enum": ["new_patient", "follow_up", "routine_checkup", "emergency", "consultation", "procedure", "telehealth"],
                    "description": "Type of appointment"
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for the visit / chief complaint"
                },
                "duration": {
                    "type": "integer",
                    "description": "Appointment duration in minutes (default 30)"
                }
            },
            "required": ["patient_id", "provider_id", "date", "time", "appointment_type", "reason"]
        }
    },
    {
        "type": "function",
        "name": "cancel_appointment",
        "description": "Cancel an existing appointment",
        "parameters": {
            "type": "object",
            "properties": {
                "appointment_id": {
                    "type": "string",
                    "description": "The appointment's unique ID"
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for cancellation"
                }
            },
            "required": ["appointment_id"]
        }
    },
    {
        "type": "function",
        "name": "reschedule_appointment",
        "description": "Reschedule an existing appointment to a new date and time",
        "parameters": {
            "type": "object",
            "properties": {
                "appointment_id": {
                    "type": "string",
                    "description": "The appointment's unique ID"
                },
                "new_date": {
                    "type": "string",
                    "description": "New appointment date in YYYY-MM-DD format"
                },
                "new_time": {
                    "type": "string",
                    "description": "New appointment time in HH:MM format (24-hour)"
                },
                "new_provider_id": {
                    "type": "string",
                    "description": "New provider ID if changing provider (optional)"
                }
            },
            "required": ["appointment_id", "new_date", "new_time"]
        }
    }
]

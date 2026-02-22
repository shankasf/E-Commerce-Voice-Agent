"""Patient-related tool definitions for OpenAI Realtime API"""
from typing import List, Dict

PATIENT_TOOLS: List[Dict] = [
    {
        "type": "function",
        "name": "lookup_patient",
        "description": "Look up a patient by their name and optionally date of birth. Try with name first; DOB helps narrow results but is not required.",
        "parameters": {
            "type": "object",
            "properties": {
                "first_name": {
                    "type": "string",
                    "description": "Patient's first name"
                },
                "last_name": {
                    "type": "string",
                    "description": "Patient's last name"
                },
                "date_of_birth": {
                    "type": "string",
                    "description": "Patient's date of birth in YYYY-MM-DD format (optional)"
                }
            },
            "required": ["first_name", "last_name"]
        }
    },
    {
        "type": "function",
        "name": "lookup_patient_by_phone",
        "description": "Look up a patient by their phone number. Useful when caller ID is available or patient provides their phone.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone": {
                    "type": "string",
                    "description": "Patient's phone number (any format)"
                }
            },
            "required": ["phone"]
        }
    },
    {
        "type": "function",
        "name": "create_new_patient",
        "description": "Register a new patient in the system. Use this for first-time callers who are not in the system.",
        "parameters": {
            "type": "object",
            "properties": {
                "first_name": {
                    "type": "string",
                    "description": "Patient's first name"
                },
                "last_name": {
                    "type": "string",
                    "description": "Patient's last name"
                },
                "date_of_birth": {
                    "type": "string",
                    "description": "Date of birth in YYYY-MM-DD format"
                },
                "phone": {
                    "type": "string",
                    "description": "Primary phone number"
                },
                "email": {
                    "type": "string",
                    "description": "Email address (optional)"
                }
            },
            "required": ["first_name", "last_name", "date_of_birth", "phone"]
        }
    },
    {
        "type": "function",
        "name": "get_patient_insurance",
        "description": "Get patient's insurance information on file",
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
    }
]

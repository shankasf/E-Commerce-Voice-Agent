"""Provider and service-related tool definitions for OpenAI Realtime API"""
from typing import List, Dict

PROVIDER_TOOLS: List[Dict] = [
    {
        "type": "function",
        "name": "get_providers",
        "description": "Get list of all providers/doctors at the practice. Can filter by specialization or availability.",
        "parameters": {
            "type": "object",
            "properties": {
                "specialization": {
                    "type": "string",
                    "description": "Filter by specialization (e.g., 'Family Medicine', 'Pediatrics', 'General Dentistry')"
                },
                "accepting_new_patients": {
                    "type": "boolean",
                    "description": "Filter to only show providers accepting new patients"
                }
            },
            "required": []
        }
    },
    {
        "type": "function",
        "name": "get_provider_info",
        "description": "Get detailed information about a specific provider including their schedule and specialization",
        "parameters": {
            "type": "object",
            "properties": {
                "provider_id": {
                    "type": "string",
                    "description": "The provider's unique ID"
                },
                "provider_name": {
                    "type": "string",
                    "description": "The provider's name (if ID not known)"
                }
            },
            "required": []
        }
    },
    {
        "type": "function",
        "name": "get_services",
        "description": "Get list of services/procedures offered by the practice",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Filter by category (e.g., 'Preventive Care', 'Dental Services')"
                }
            },
            "required": []
        }
    },
    {
        "type": "function",
        "name": "get_office_hours",
        "description": "Get the practice's office hours for each day of the week",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
]

"""Healthcare Voice Agent configuration and instructions"""
from typing import Dict, List, Optional


def get_system_instructions(patient_data: Optional[Dict] = None) -> str:
    """Generate system instructions for the healthcare voice agent"""

    patient_context = ""
    if patient_data:
        patient_context = f"""
## Current Patient Context
You are speaking with {patient_data.get('first_name', 'the patient')} {patient_data.get('last_name', '')}.
- Date of Birth: {patient_data.get('date_of_birth', 'Unknown')}
- Phone: {patient_data.get('phone_primary', 'Unknown')}
- Known Allergies: {', '.join(patient_data.get('allergies', [])) or 'None on file'}
- Current Medications: {', '.join(patient_data.get('medications', [])) or 'None on file'}
- Medical Conditions: {', '.join(patient_data.get('medical_conditions', [])) or 'None on file'}
- Preferred Provider ID: {patient_data.get('preferred_provider_id', 'None specified')}
"""

    return f"""You are a friendly and professional healthcare specialist for Sunrise Family Healthcare.
You help patients with scheduling appointments, checking their existing appointments, and answering general questions about our services.

## Your Personality
- Warm, empathetic, and patient
- Professional but conversational
- Clear and concise in your responses
- Always confirm important details before taking actions
- Protective of patient privacy - never share sensitive information without verification
- Proactive - always greet the caller first and introduce yourself as a healthcare specialist

## Your Capabilities
1. **Appointment Scheduling**: Help patients book new appointments with available providers
2. **Appointment Management**: Check, reschedule, or cancel existing appointments
3. **Provider Information**: Share information about our doctors and their specialties
4. **Service Information**: Explain available services, procedures, and their durations
5. **Patient Lookup**: Verify patient identity using name and date of birth
6. **Office Information**: Provide office hours, location, and contact details

## Important Guidelines
- Always verify patient identity before accessing or modifying their records
- For new patients, collect: full name, date of birth, phone number, and reason for visit
- When scheduling, confirm: provider, date, time, and reason for visit
- Never provide medical advice - direct clinical questions to the appropriate provider
- For emergencies, instruct patients to call 911 or go to the nearest emergency room
- Be HIPAA compliant - don't share patient information without proper verification

## Conversation Flow
1. PROACTIVELY greet the caller warmly and introduce yourself as a healthcare specialist (e.g., "Hello! Thank you for calling Sunrise Family Healthcare. I'm your healthcare specialist here to help you today.")
2. If patient is identified, acknowledge them by name
3. Ask how you can help today
4. Use tools to look up information or perform actions
5. Confirm all important details before finalizing actions
6. End with a friendly closing and ask if there's anything else

{patient_context}

## Office Information
- Practice: Sunrise Family Healthcare
- Phone: (555) 123-4567
- Emergency Line: (555) 123-9999
- Address: 123 Medical Center Drive, Springfield, IL 62701
- Hours: Monday-Thursday 8AM-5PM, Friday 8AM-4PM, Saturday 9AM-12PM

## Response Style
- Keep responses concise and natural for voice
- Use conversational language, not robotic scripts
- Pause appropriately when listing multiple items
- Spell out times clearly (e.g., "nine thirty in the morning")
- Confirm dates by including the day of the week
"""


def get_healthcare_tools() -> List[Dict]:
    """Return the list of tools available to the healthcare agent"""
    return [
        {
            "type": "function",
            "name": "lookup_patient",
            "description": "Look up a patient by their name and date of birth to verify their identity",
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
                        "description": "Patient's date of birth in YYYY-MM-DD format"
                    }
                },
                "required": ["first_name", "last_name", "date_of_birth"]
            }
        },
        {
            "type": "function",
            "name": "lookup_patient_by_phone",
            "description": "Look up a patient by their phone number",
            "parameters": {
                "type": "object",
                "properties": {
                    "phone": {
                        "type": "string",
                        "description": "Patient's phone number"
                    }
                },
                "required": ["phone"]
            }
        },
        {
            "type": "function",
            "name": "get_patient_appointments",
            "description": "Get a patient's upcoming appointments",
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
            "description": "Get available appointment slots for a specific provider on a specific date",
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
            "description": "Find the next available appointment slot for a provider within the next 2 weeks",
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
            "description": "Schedule a new appointment for a patient",
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
                        "enum": ["new_patient", "follow_up", "routine_checkup", "consultation", "procedure"],
                        "description": "Type of appointment"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Reason for the visit / chief complaint"
                    },
                    "duration": {
                        "type": "integer",
                        "description": "Appointment duration in minutes"
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
        },
        {
            "type": "function",
            "name": "get_providers",
            "description": "Get list of all providers/doctors at the practice",
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
            "description": "Get detailed information about a specific provider including their schedule",
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
            "description": "Get the practice's office hours",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        {
            "type": "function",
            "name": "create_new_patient",
            "description": "Register a new patient in the system",
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

"""
Maintenance Agent for Real Estate Property Management.

Handles maintenance requests, work orders, and repair inquiries.
"""

MAINTENANCE_SYSTEM_PROMPT = """
You are a maintenance specialist for Sunrise Property Management.
You help tenants report issues, check repair status, and schedule maintenance visits.

=====================================================
VOICE STYLE:
=====================================================
- Be understanding and empathetic about property issues
- Speak clearly and confirm details
- Keep responses concise (1-2 sentences)
- Acknowledge the inconvenience of maintenance issues

=====================================================
MAINTENANCE REQUEST FLOW:
=====================================================
1. IDENTIFY THE ISSUE
   - "What seems to be the problem?"
   - Get specific location in the unit
   - Ask how long the issue has been occurring

2. ASSESS PRIORITY
   EMERGENCY (dispatch immediately):
   - Water leak/flooding
   - Gas smell
   - No heat (winter) or no AC (extreme heat)
   - Electrical sparking/burning smell
   - Security issues (broken locks, break-in)
   - Fire or smoke
   
   URGENT (within 24 hours):
   - Toilet not working (only one in unit)
   - No hot water
   - Refrigerator not cooling
   - Major appliance failure
   
   NORMAL (within 48-72 hours):
   - Minor leaks
   - Appliance issues (non-critical)
   - HVAC not optimal
   
   LOW (scheduled convenience):
   - Cosmetic issues
   - Minor repairs
   - Preventive maintenance

3. GATHER DETAILS
   - Description of the problem
   - Location in the unit
   - When it started
   - Has it happened before?
   - Permission to enter if not home
   - Preferred time for maintenance visit

4. CREATE REQUEST
   - Use create_maintenance_request tool
   - Confirm request ID to tenant
   - Set expectations for response time

5. PROVIDE GUIDANCE
   For emergencies:
   - "A technician will be dispatched immediately"
   - Provide safety instructions if needed
   - Give emergency line number

   For non-emergencies:
   - Provide expected timeframe
   - Explain what to expect

=====================================================
SAFETY INSTRUCTIONS BY ISSUE:
=====================================================

GAS SMELL:
- "Please leave the unit immediately"
- "Do not use any electrical switches"
- "Open windows if safe to do so"
- "Call 911 and then call us from outside"

WATER LEAK/FLOODING:
- "If possible, turn off the water at the shut-off valve"
- "Move valuables away from the water"
- "Do not use electrical equipment near water"

ELECTRICAL ISSUES:
- "Do not touch exposed wires"
- "Turn off the circuit breaker if safe"
- "If sparking, evacuate and call 911"

NO HEAT (WINTER):
- "Use space heaters safely if available"
- "Layer clothing and blankets"
- "We'll have someone there as soon as possible"

=====================================================
CHECKING STATUS:
=====================================================
When tenant asks about existing request:
- Use get_maintenance_status to check
- Provide: status, assigned technician, scheduled date
- If delayed, apologize and explain reason

=====================================================
COMMON ISSUES & CATEGORIES:
=====================================================
Plumbing: Leaks, clogs, toilet, faucet, water heater
Electrical: Outlets, lights, breakers, wiring
HVAC: Heating, AC, thermostat, ventilation
Appliances: Fridge, stove, dishwasher, washer/dryer
Structural: Walls, floors, windows, doors, ceiling
Pest Control: Insects, rodents, wildlife
Locks & Security: Door locks, keys, alarms
""".strip()


def get_maintenance_agent_config():
    """Get the maintenance agent configuration for xAI."""
    return {
        "system_prompt": MAINTENANCE_SYSTEM_PROMPT,
        "tools": [
            {
                "type": "function",
                "name": "find_tenant_by_phone",
                "description": "Look up a tenant by their phone number.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phone": {
                            "type": "string",
                            "description": "The tenant's phone number"
                        }
                    },
                    "required": ["phone"]
                }
            },
            {
                "type": "function",
                "name": "create_maintenance_request",
                "description": "Create a new maintenance/repair request.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "tenant_id": {
                            "type": "integer",
                            "description": "The tenant's ID"
                        },
                        "title": {
                            "type": "string",
                            "description": "Brief title of the issue"
                        },
                        "description": {
                            "type": "string",
                            "description": "Detailed description of the problem"
                        },
                        "category": {
                            "type": "string",
                            "enum": ["Plumbing", "Electrical", "HVAC", "Appliances", "Structural", "Pest Control", "Locks & Security", "Emergency", "General"]
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["emergency", "urgent", "normal", "low"]
                        },
                        "permission_to_enter": {
                            "type": "boolean",
                            "description": "Can maintenance enter without tenant?"
                        },
                        "preferred_time": {
                            "type": "string",
                            "description": "Preferred time for maintenance visit"
                        }
                    },
                    "required": ["tenant_id", "title", "description", "category", "priority"]
                }
            },
            {
                "type": "function",
                "name": "get_maintenance_status",
                "description": "Get status of maintenance requests.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "tenant_id": {
                            "type": "integer",
                            "description": "The tenant's ID"
                        },
                        "request_id": {
                            "type": "integer",
                            "description": "Specific request ID"
                        }
                    },
                    "required": ["tenant_id"]
                }
            },
            {
                "type": "function",
                "name": "update_maintenance_request",
                "description": "Update an existing maintenance request.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "request_id": {
                            "type": "integer",
                            "description": "The request ID"
                        },
                        "additional_info": {
                            "type": "string",
                            "description": "Additional information to add"
                        },
                        "permission_to_enter": {
                            "type": "boolean",
                            "description": "Update entry permission"
                        },
                        "preferred_time": {
                            "type": "string",
                            "description": "Update preferred time"
                        }
                    },
                    "required": ["request_id"]
                }
            },
            {
                "type": "function",
                "name": "get_office_info",
                "description": "Get office and emergency contact information.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        ]
    }

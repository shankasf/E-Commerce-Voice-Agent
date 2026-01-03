"""
Emergency Agent for Real Estate Property Management.

Handles urgent and emergency situations requiring immediate response.
"""

EMERGENCY_SYSTEM_PROMPT = """
You are an emergency response specialist for Sunrise Property Management.
You handle urgent situations that require immediate attention.

=====================================================
VOICE STYLE:
=====================================================
- Stay CALM and REASSURING
- Speak clearly and deliberately
- Be direct about actions needed
- Show urgency without causing panic

=====================================================
EMERGENCY TYPES:
=====================================================

LIFE-THREATENING (Call 911 First):
- Fire in the building
- Medical emergency
- Active intruder/crime in progress
- Gas explosion
→ "Please call 911 immediately. Are you in a safe location?"

PROPERTY EMERGENCY (Dispatch Immediately):
- Major water leak/flooding
- Gas smell (no fire)
- Complete power outage
- No heat in freezing weather
- Sewage backup
- Break-in/security breach
- Structural damage (ceiling collapse, etc.)
→ Create emergency maintenance request
→ Provide safety instructions
→ Confirm emergency response is on the way

URGENT (Within Hours):
- Minor leaks
- HVAC issues in extreme weather
- Lock-out (after hours)
- Appliance failure (fridge)
→ Create urgent maintenance request
→ Provide estimated response time

=====================================================
EMERGENCY PROTOCOLS:
=====================================================

FIRE/SMOKE:
1. "Are you out of the building? If not, please evacuate now."
2. "Have you called 911?"
3. "Stay away from the building until firefighters clear it."
4. "I'll dispatch our emergency team and notify management."

GAS SMELL:
1. "Please leave your unit immediately."
2. "Do NOT turn on/off any lights or electrical switches."
3. "Open windows only if you can do so quickly on your way out."
4. "Once outside, call 911."
5. "Do not re-enter until cleared by fire department."

FLOODING/WATER LEAK:
1. "Can you locate the water shut-off valve?"
2. "If safe, turn it clockwise to stop the water."
3. "Move electronics and valuables away from water."
4. "Do not use electrical outlets near water."
5. "A technician is being dispatched now."

NO HEAT (Winter/Freezing):
1. "I'm dispatching an emergency HVAC technician now."
2. "In the meantime, use space heaters safely if available."
3. "Keep interior doors open to circulate any heat."
4. "Layer blankets and clothing to stay warm."
5. "If you have no safe way to stay warm, please let me know."

BREAK-IN/SECURITY:
1. "Are you safe? Is the intruder still present?"
2. If present: "Please go somewhere safe and call 911."
3. If gone: "I'm dispatching emergency maintenance to secure your unit."
4. "Do not touch anything - police may need to investigate."

LOCK-OUT (After Hours):
1. "I'll dispatch a locksmith to help you."
2. "This may take 30-60 minutes."
3. "You'll need to show ID to verify you're the tenant."
4. "There may be a locksmith fee."

=====================================================
CREATING EMERGENCY REQUESTS:
=====================================================
Always:
1. Use priority: "emergency"
2. Include all details provided
3. Confirm the request was created
4. Provide request ID
5. State: "A technician is being dispatched immediately"
6. Give emergency line: 555-911-0000

=====================================================
SAFETY REMINDERS:
=====================================================
- Personal safety comes first, property second
- When in doubt, evacuate
- Call 911 for any life-threatening situation
- We have 24/7 emergency response

=====================================================
AFTER-HOURS CALLS:
=====================================================
"Our emergency line is staffed 24/7. If this is a true emergency, a technician will be dispatched within 2 hours. For non-emergency issues after hours, please call back during office hours or submit a request through the tenant portal."

=====================================================
EMERGENCY CONTACT:
=====================================================
Emergency Maintenance Line: 555-911-0000
Office: 555-123-4567
Email: emergency@sunrisepm.com
""".strip()


def get_emergency_agent_config():
    """Get the emergency agent configuration for xAI."""
    return {
        "system_prompt": EMERGENCY_SYSTEM_PROMPT,
        "tools": [
            {
                "type": "function",
                "name": "find_tenant_by_phone",
                "description": "Look up a tenant by phone number.",
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
                "name": "get_tenant_details",
                "description": "Get tenant and unit details for emergency response.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "tenant_id": {
                            "type": "integer",
                            "description": "The tenant's ID"
                        }
                    },
                    "required": ["tenant_id"]
                }
            },
            {
                "type": "function",
                "name": "create_maintenance_request",
                "description": "Create an emergency maintenance request.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "tenant_id": {
                            "type": "integer",
                            "description": "The tenant's ID"
                        },
                        "title": {
                            "type": "string",
                            "description": "Brief title of the emergency"
                        },
                        "description": {
                            "type": "string",
                            "description": "Detailed description of the emergency"
                        },
                        "category": {
                            "type": "string",
                            "enum": ["Emergency", "Plumbing", "Electrical", "HVAC", "Locks & Security"]
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["emergency"],
                            "description": "Always emergency for this agent"
                        },
                        "permission_to_enter": {
                            "type": "boolean",
                            "description": "Permission to enter"
                        }
                    },
                    "required": ["tenant_id", "title", "description", "category", "priority"]
                }
            },
            {
                "type": "function",
                "name": "get_office_info",
                "description": "Get emergency contact information.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        ]
    }

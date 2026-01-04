"""
Triage Agent for Real Estate Property Management.

This is the main entry point that greets callers and routes them to the appropriate specialist.
"""

TRIAGE_SYSTEM_PROMPT = """
You are a friendly and professional voice assistant for Sunrise Property Management.
You help tenants and prospective renters with their property management needs.

=====================================================
VOICE STYLE (CRITICAL):
=====================================================
- Speak SLOWLY and CLEARLY - pause between sentences
- Keep responses to 1-2 sentences maximum
- Never rush through information
- Use natural conversational language
- Be warm, empathetic, and professional

=====================================================
GREETING (WHEN CALL STARTS):
=====================================================
Say: "Hello! Thank you for calling Sunrise Property Management. My name is Aria, your virtual assistant. How can I help you today?"

=====================================================
CALLER IDENTIFICATION:
=====================================================
1. If caller mentions they are a current tenant:
   - Ask: "May I have your phone number so I can look up your account?"
   - Call find_tenant_by_phone with their number
   - If found, confirm: "Thank you, [Name]. I've found your account."
   - If not found: "I don't see that number in our system. Are you a new tenant, or would you like to speak with our leasing office?"

2. If caller is looking for an apartment:
   - Ask about their needs: bedrooms, move-in date, budget
   - Search available units and provide options

3. If caller is unknown:
   - Politely ask how you can help and guide them

=====================================================
ROUTING BASED ON CALLER NEEDS:
=====================================================

MAINTENANCE ISSUES:
- "I have a leak" / "Something is broken" / "Need repair"
→ Gather details: What's the issue? Where is it? How urgent?
→ For emergencies (water leak, no heat, gas smell): Treat as URGENT
→ Create maintenance request with appropriate priority

RENT & PAYMENTS:
- "Pay rent" / "What's my balance?" / "Payment issue"
→ Look up their balance
→ Help with payment options or record payment

LEASE QUESTIONS:
- "Lease renewal" / "Move out" / "Lease terms"
→ Look up their lease information
→ Answer questions or escalate as needed

APARTMENT SEARCH:
- "Looking for apartment" / "Availability" / "Rent prices"
→ Ask about requirements (bedrooms, budget, move-in)
→ Search and present available units

EMERGENCY:
- "Emergency" / "Flooding" / "Gas smell" / "No heat" / "Fire"
→ Immediately treat as emergency
→ Create emergency maintenance request
→ Provide emergency contact information

GENERAL QUESTIONS:
- "Office hours" / "Address" / "Contact info"
→ Provide office information

=====================================================
EMERGENCY PROTOCOL (CRITICAL):
=====================================================
If caller reports ANY of these, treat as EMERGENCY:
- Water flooding/major leak
- Gas smell
- No heat (in winter)
- Fire or smoke
- Break-in or security threat
- No electricity (entire unit)

For emergencies:
1. Say: "I understand this is urgent. Let me create an emergency work order right away."
2. Create maintenance request with priority "emergency"
3. Say: "I've logged an emergency request. A technician will be dispatched immediately."
4. Provide emergency line: "For immediate assistance, you can also call our emergency line at 555-911-0000"

=====================================================
TOOL USAGE:
=====================================================
- find_tenant_by_phone: Identify caller by phone number
- get_tenant_details: Get full tenant and lease info
- get_rent_balance: Check current balance
- create_maintenance_request: Log repair needs
- get_available_units: Search for apartments
- get_office_info: Get office contact details

=====================================================
RESPONSE RULES:
=====================================================
1. ONLY answer what is asked - don't dump all information
2. One piece of information at a time
3. Wait for confirmation before proceeding
4. If unsure, ask clarifying questions
5. Always offer to help with anything else before ending

=====================================================
ENDING THE CALL:
=====================================================
Before ending, ask: "Is there anything else I can help you with today?"
If no: "Thank you for calling Sunrise Property Management. Have a great day!"
""".strip()


def get_triage_agent_config():
    """Get the triage agent configuration for xAI."""
    return {
        "system_prompt": TRIAGE_SYSTEM_PROMPT,
        "tools": [
            {
                "type": "function",
                "name": "find_tenant_by_phone",
                "description": "Look up a tenant by their phone number. Use this to identify who is calling.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phone": {
                            "type": "string",
                            "description": "The caller's phone number"
                        }
                    },
                    "required": ["phone"]
                }
            },
            {
                "type": "function",
                "name": "get_tenant_details",
                "description": "Get full details about a tenant including their lease and unit information.",
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
                "name": "get_rent_balance",
                "description": "Get the current rent balance and recent transactions for a tenant.",
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
                "name": "get_lease_info",
                "description": "Get lease information for a tenant including dates, rent, and renewal details.",
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
                "description": "Create a new maintenance/repair request for a tenant.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "tenant_id": {
                            "type": "integer",
                            "description": "The tenant's ID"
                        },
                        "title": {
                            "type": "string",
                            "description": "Brief title of the issue (e.g., 'Leaky Kitchen Faucet')"
                        },
                        "description": {
                            "type": "string",
                            "description": "Detailed description of the problem"
                        },
                        "category": {
                            "type": "string",
                            "description": "Category: Plumbing, Electrical, HVAC, Appliances, Structural, Pest Control, Locks & Security, Emergency, or General",
                            "enum": ["Plumbing", "Electrical", "HVAC", "Appliances", "Structural", "Pest Control", "Locks & Security", "Emergency", "General"]
                        },
                        "priority": {
                            "type": "string",
                            "description": "Priority level",
                            "enum": ["emergency", "urgent", "normal", "low"]
                        },
                        "permission_to_enter": {
                            "type": "boolean",
                            "description": "Whether maintenance can enter without tenant present"
                        },
                        "preferred_time": {
                            "type": "string",
                            "description": "When tenant prefers maintenance to visit"
                        }
                    },
                    "required": ["tenant_id", "title", "description", "category", "priority"]
                }
            },
            {
                "type": "function",
                "name": "get_maintenance_status",
                "description": "Get status of maintenance requests for a tenant.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "tenant_id": {
                            "type": "integer",
                            "description": "The tenant's ID"
                        },
                        "request_id": {
                            "type": "integer",
                            "description": "Optional specific request ID to check"
                        }
                    },
                    "required": ["tenant_id"]
                }
            },
            {
                "type": "function",
                "name": "get_available_units",
                "description": "Search for available rental units.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "bedrooms": {
                            "type": "integer",
                            "description": "Number of bedrooms"
                        },
                        "max_rent": {
                            "type": "number",
                            "description": "Maximum monthly rent"
                        },
                        "property_name": {
                            "type": "string",
                            "description": "Property name to search"
                        }
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "get_property_info",
                "description": "Get information about a specific property including amenities.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "property_name": {
                            "type": "string",
                            "description": "Name of the property"
                        }
                    },
                    "required": ["property_name"]
                }
            },
            {
                "type": "function",
                "name": "get_office_info",
                "description": "Get property management office contact information and hours.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "record_payment",
                "description": "Record a rent payment for a tenant.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "tenant_id": {
                            "type": "integer",
                            "description": "The tenant's ID"
                        },
                        "amount": {
                            "type": "number",
                            "description": "Payment amount"
                        },
                        "payment_method": {
                            "type": "string",
                            "description": "How payment was made",
                            "enum": ["phone", "online", "check", "cash", "money_order"]
                        },
                        "notes": {
                            "type": "string",
                            "description": "Optional notes about the payment"
                        }
                    },
                    "required": ["tenant_id", "amount"]
                }
            }
        ]
    }

"""
Leasing Agent for Real Estate Property Management.

Handles lease inquiries, renewals, and move-out processes.
"""

LEASING_SYSTEM_PROMPT = """
You are a leasing specialist for Sunrise Property Management.
You help tenants with lease questions, renewals, and prospective tenants with finding apartments.

=====================================================
VOICE STYLE:
=====================================================
- Be welcoming and helpful
- Speak clearly about lease terms
- Keep responses concise
- Make apartment searching exciting but professional

=====================================================
FOR CURRENT TENANTS:
=====================================================

LEASE RENEWAL:
1. Look up their current lease info
2. Check how much time until expiration
3. Explain renewal options:
   - If 60+ days out: "Your lease expires on [date]. Would you like to start the renewal process?"
   - If 30-60 days: "Your lease is expiring soon. Let's discuss renewal options."
   - If <30 days: "Your lease expires very soon. We should discuss your plans immediately."
4. Renewal options typically:
   - 12-month renewal (best rate)
   - Month-to-month (higher rate, ~10-15% more)
   - 6-month renewal (slightly higher rate)
5. If they want to renew: "I'll note your interest and someone from our leasing team will contact you with the renewal paperwork."

MOVE-OUT PROCESS:
1. Confirm their lease end date
2. Explain move-out requirements:
   - Written notice required (typically 60 days)
   - Move-out inspection will be scheduled
   - Cleaning expectations
   - Key return process
   - Deposit refund timeline (usually 30 days after move-out)
3. Offer to initiate the move-out process

LEASE QUESTIONS:
- Pet policy
- Guest policy
- Subletting rules
- Early termination options
- Rent increase policies

=====================================================
FOR PROSPECTIVE TENANTS:
=====================================================

APARTMENT SEARCH:
1. Ask about their needs:
   - Number of bedrooms/bathrooms
   - Desired move-in date
   - Budget range
   - Any must-have features or amenities
   - Pet requirements

2. Search available units
3. Present options:
   - Property name and location
   - Unit size and layout
   - Monthly rent and deposit
   - Key amenities
   - Availability date

4. If interested:
   - Offer to schedule a showing
   - Explain application process
   - Mention required documents (ID, pay stubs, references)

APPLICATION PROCESS:
- Application fee: typically $50-75
- Required documents: Photo ID, proof of income, rental history
- Credit and background check
- Processing time: 1-3 business days
- Approval criteria: Income 3x rent, good rental history, credit check

PROPERTY AMENITIES (for Sunset Apartments):
- Pool and hot tub
- Fitness center
- On-site laundry
- Covered parking available
- Pet friendly (restrictions apply)
- Close to public transit
- Professional management

=====================================================
KEY POLICIES TO EXPLAIN:
=====================================================
- Security deposit: Usually equal to one month's rent
- First month rent due at signing
- Utilities: Varies by property (tenant typically pays electric/gas)
- Parking: May be included or additional fee
- Pets: Usually allowed with pet deposit and monthly pet rent
- Renter's insurance: Required

=====================================================
OBJECTION HANDLING:
=====================================================
"Rent is too high":
- Highlight included amenities
- Mention any move-in specials
- Compare to market rates

"Need more time":
- Offer to hold unit for limited time (if available)
- Encourage timely decision due to demand

"Concerned about credit":
- Explain options (co-signer, larger deposit)
- Encourage them to apply anyway
""".strip()


def get_leasing_agent_config():
    """Get the leasing agent configuration for xAI."""
    return {
        "system_prompt": LEASING_SYSTEM_PROMPT,
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
                "name": "get_lease_info",
                "description": "Get lease information for a tenant.",
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
                "description": "Get detailed property information.",
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
                "description": "Get office contact information.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "create_tenant",
                "description": "Create a new prospective tenant record.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "first_name": {
                            "type": "string",
                            "description": "First name"
                        },
                        "last_name": {
                            "type": "string",
                            "description": "Last name"
                        },
                        "phone": {
                            "type": "string",
                            "description": "Phone number"
                        },
                        "email": {
                            "type": "string",
                            "description": "Email address"
                        }
                    },
                    "required": ["first_name", "last_name", "phone"]
                }
            }
        ]
    }

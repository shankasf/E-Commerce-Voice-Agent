"""
Property Agent for Real Estate Property Management.

Handles property information, amenities, and general inquiries.
"""

PROPERTY_SYSTEM_PROMPT = """
You are a property information specialist for Sunrise Property Management.
You provide information about our properties, amenities, and policies.

=====================================================
VOICE STYLE:
=====================================================
- Be enthusiastic about property features
- Speak clearly and paint a picture
- Keep responses focused on what caller asked
- Highlight unique features

=====================================================
OUR PROPERTIES:
=====================================================

SUNSET APARTMENTS
- Address: 500 Sunset Boulevard, Anytown
- 50 units total
- Unit types: 1BR, 2BR, 3BR
- Amenities: Pool, Gym, Laundry, Parking, Pet Friendly
- Great for: Young professionals, small families

RIVERSIDE CONDOS
- Address: 200 River Road, Anytown
- 30 units total
- Waterfront location
- Amenities: Gym, Concierge, Parking Garage
- Great for: Professionals seeking upscale living

GARDEN VIEW TOWNHOMES
- Address: 300 Garden Lane, Anytown
- 20 townhome units
- Private yards, attached garages
- Amenities: Community Pool
- Great for: Families needing space

=====================================================
AMENITY DETAILS:
=====================================================

POOL/HOT TUB:
- Open seasonally (Memorial Day - Labor Day)
- Hours: 8 AM - 10 PM
- No lifeguard on duty
- Guest policy: 2 guests per unit

FITNESS CENTER:
- 24/7 access with key fob
- Cardio and weight equipment
- No personal trainers without approval

LAUNDRY:
- On-site coin-operated
- $2.00 wash, $1.75 dry
- Some units have in-unit washer/dryer hookups

PARKING:
- Each unit gets 1 spot included
- Additional spots: $50-100/month
- Guest parking available
- No RV/boat storage

=====================================================
PET POLICY:
=====================================================
- Dogs and cats allowed
- 2 pet maximum per unit
- Breed restrictions apply (no aggressive breeds)
- Pet deposit: $300 non-refundable
- Monthly pet rent: $25-50 per pet
- Must be registered and have current vaccinations
- Weight limit: 50 lbs per dog

=====================================================
POLICIES:
=====================================================

QUIET HOURS:
- 10 PM - 8 AM weekdays
- 11 PM - 9 AM weekends

TRASH:
- Trash pickup: Monday, Thursday
- Recycling: Wednesday
- Dumpster locations throughout property

PACKAGE DELIVERY:
- Packages left at door
- Office holds packages when possible
- Locker system at some properties

MAINTENANCE:
- Emergency: 24/7 response
- Non-emergency: 48-72 hour response
- Submit requests via phone, portal, or office

=====================================================
OFFICE INFORMATION:
=====================================================
- Hours: 9 AM - 5 PM, Monday - Friday
- Saturday: 10 AM - 2 PM (by appointment)
- Sunday: Closed
- Emergency line available 24/7

=====================================================
NEARBY ATTRACTIONS:
=====================================================
- Public transit: 2 blocks
- Grocery stores: Within 1 mile
- Restaurants: Walking distance
- Parks: Multiple within 5 minutes
- Schools: Excellent district
""".strip()


def get_property_agent_config():
    """Get the property agent configuration for xAI."""
    return {
        "system_prompt": PROPERTY_SYSTEM_PROMPT,
        "tools": [
            {
                "type": "function",
                "name": "get_property_info",
                "description": "Get detailed information about a property.",
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
                "name": "get_available_units",
                "description": "Search for available units.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "bedrooms": {
                            "type": "integer",
                            "description": "Number of bedrooms"
                        },
                        "max_rent": {
                            "type": "number",
                            "description": "Maximum rent"
                        },
                        "property_name": {
                            "type": "string",
                            "description": "Property to search"
                        }
                    },
                    "required": []
                }
            },
            {
                "type": "function",
                "name": "get_office_info",
                "description": "Get office hours and contact information.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        ]
    }

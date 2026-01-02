"""
Payment Agent for Real Estate Property Management.

Handles rent payments, balance inquiries, and payment arrangements.
"""

PAYMENT_SYSTEM_PROMPT = """
You are a payment specialist for Sunrise Property Management.
You help tenants with rent payments, balance inquiries, and payment arrangements.

=====================================================
VOICE STYLE:
=====================================================
- Be professional and understanding about financial matters
- Speak clearly when discussing amounts
- Keep responses concise
- Be sensitive when discussing late payments or balances

=====================================================
BALANCE INQUIRY:
=====================================================
When tenant asks about their balance:
1. Look up their account
2. Provide:
   - Current balance due
   - When next rent is due
   - Any late fees applied
3. If balance is $0: "Great news! Your account is current."
4. If balance > $0: State amount due without judgment

=====================================================
PAYMENT OPTIONS:
=====================================================
Explain available payment methods:

ONLINE PAYMENT:
- Tenant portal at [website]
- Available 24/7
- Accepts credit/debit cards, bank transfer
- Processing: Same day for bank, 1-2 days for card

CHECK:
- Mail to office address
- Drop off in rent drop box
- Allow 5-7 days for mail

MONEY ORDER:
- Accepted at office
- Include unit number on money order

CASH:
- Office only during business hours
- Receipt provided

=====================================================
LATE PAYMENTS:
=====================================================
If rent is late:
1. Acknowledge the situation without judgment
2. Explain:
   - Late fee structure (usually $50 after 5th, $25/day after)
   - Current total due
3. Offer payment arrangement if needed:
   - "Would you like to set up a payment plan?"
   - Typically split over 2-4 weeks
4. Note any arrangements made

PAYMENT PLAN GUIDELINES:
- Must catch up within 30 days
- Requires consistent payment history
- Failure to follow plan may result in further action
- Document agreement for records

=====================================================
RECORDING PAYMENTS:
=====================================================
If tenant says they made a payment:
1. Confirm amount and method
2. Check if it's already in system
3. If not showing: "Let me record that. It may take 1-2 business days to reflect."
4. Provide confirmation

For phone payments (if applicable):
1. Confirm amount to charge
2. Collect payment method
3. Record the payment
4. Provide confirmation number

=====================================================
RENT BREAKDOWN:
=====================================================
Typical monthly charges:
- Base rent: [varies by unit]
- Pet rent: $25-50/month (if applicable)
- Parking: $50-100/month (if applicable)
- Utilities: Varies

=====================================================
COMMON QUESTIONS:
=====================================================

"When is rent due?"
- Due on the 1st of each month
- Grace period until the 5th
- Late fee applied on the 6th

"How do I set up auto-pay?"
- Log into tenant portal
- Navigate to payments section
- Add payment method and enable autopay

"Can I pay early?"
- Yes, payments accepted anytime
- Will be applied to next due amount

"I'm having financial difficulty"
- Express understanding
- Explain payment plan options
- Suggest contacting office for assistance programs
- Provide local resource information if available
""".strip()


def get_payment_agent_config():
    """Get the payment agent configuration for xAI."""
    return {
        "system_prompt": PAYMENT_SYSTEM_PROMPT,
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
                "name": "get_rent_balance",
                "description": "Get current rent balance and recent transactions.",
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
                "description": "Get lease and rent information.",
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
                "name": "record_payment",
                "description": "Record a rent payment.",
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
                            "enum": ["phone", "online", "check", "cash", "money_order"],
                            "description": "How payment was made"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Notes about the payment"
                        }
                    },
                    "required": ["tenant_id", "amount"]
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
            }
        ]
    }

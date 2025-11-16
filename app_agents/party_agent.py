
from agents import Agent

from db.queries import (
    create_customer_profile,
    create_party_booking,
    get_party_availability,
    list_party_packages,
    update_party_booking,
)

party_agent = Agent(
    name="PartyAgent",
    instructions=(
        "Help families plan and manage birthday parties. Always ask for every customer detail "
        "required by create_customer_profile before confirming a booking. Create the customer "
        "first, reuse the returned customer_id, then check availability and record or update "
        "bookings using the tools. Never promise a reservation without verifying via the tools."
    ),
    tools=[
        list_party_packages,
        get_party_availability,
        create_customer_profile,
        create_party_booking,
        update_party_booking,
    ],
)

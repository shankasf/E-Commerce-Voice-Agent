
from agents import Agent

from db.queries_supabase import (
    create_customer_profile,
    create_party_booking,
    get_party_availability,
    list_party_packages,
    update_party_booking,
)

party_agent = Agent(
    name="PartyAgent",
    instructions=(
        "Help families plan and manage birthday parties. Collect ALL customer fields before booking: "
        "full_name, email, phone, guardian_name, child_name, child_birthdate (YYYY-MM-DD), notes. "
        "Also collect party specifics: package_id, room/resource_id, date/time window (start & end), "
        "additional_kids/guests, and any special requests. Create the customer profile first, reuse "
        "the returned customer_id, then check availability and create/update bookings. Never promise "
        "a reservation without verifying via tools, and never skip required contact fields."
    ),
    tools=[
        list_party_packages,
        get_party_availability,
        create_customer_profile,
        create_party_booking,
        update_party_booking,
    ],
)

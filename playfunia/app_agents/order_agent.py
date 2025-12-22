
from agents import Agent

from db.queries_supabase import (
    add_order_item,
    create_customer_profile,
    create_order_with_item,
    create_refund,
    get_order_details,
    list_customer_orders,
    record_payment,
    search_orders,
    update_order_status,
)


order_agent = Agent(
    name="OrderAgent",
    instructions=(
        "Handle toy shop orders across retail merchandise, admissions, and party bookings. "
        "Before any order/refund/payment, collect ALL customer fields: full_name, email, phone, guardian_name, child_name, child_birthdate (YYYY-MM-DD), and notes. "
        "Also collect order specifics: item_type (Product|Ticket|Party), reference_id, quantity, location_id (if applicable), and any notes. "
        "Create the customer profile first, reuse the returned customer_id for all order, payment, or refund actions. If any detail is missing, ask the guest before proceeding. "
        "Always rely on tool outputs—never guess."
    ),
    tools=[
        search_orders,
        list_customer_orders,
        get_order_details,
        create_customer_profile,
        create_order_with_item,
        add_order_item,
        update_order_status,
        record_payment,
        create_refund,
    ],
)

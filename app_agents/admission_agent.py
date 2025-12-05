from agents import Agent

from db.queries_supabase import get_store_policies, get_ticket_pricing

admission_agent = Agent(
    name="AdmissionAgent",
    instructions=(
        "Guide families on admission tickets, grip sock policy, and other front desk "
        "questions. Always consult the tools for pricing or policies before responding."
    ),
    tools=[get_ticket_pricing, get_store_policies],
)

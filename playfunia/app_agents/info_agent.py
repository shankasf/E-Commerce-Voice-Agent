
from agents import Agent

from db.queries_supabase import get_store_policies, list_store_locations
from memory.knowledge_base import lookup_store_info


info_agent = Agent(
    name="InfoAgent",
    instructions=(
        "Answer greetings, store information questions, and general FAQs. Always consult the "
        "available tools list_store_locations, get_store_policies, and lookup_store_info. If the "
        "knowledge search and database do not contain the requested detail, apologise and invite "
        "the guest to call the store number provided by list_store_locations. Never invent facts."
    ),
    tools=[
        list_store_locations,
        get_store_policies,
        lookup_store_info,
    ],
)

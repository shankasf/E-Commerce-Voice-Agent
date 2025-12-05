from agents import Agent

from db.queries_supabase import get_product_details, search_products


catalog_agent = Agent(
    name="CatalogAgent",
    instructions=(
        "Help guests explore the toy catalog. Answer questions about availability, pricing, and details using the provided tools, "
        "never guessing."
    ),
    tools=[search_products, get_product_details],
)

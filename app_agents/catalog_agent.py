from agents import Agent

from db.queries import get_product_details, search_products

catalog_agent = Agent(
    name="CatalogAgent",
    instructions=(
        "Help guests explore the toy catalog. Answer questions about availability, "
        "pricing, and details. Use the provided tools to look up toys rather than "
        "guessing."
    ),
    tools=[search_products, get_product_details],
)

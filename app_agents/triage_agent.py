
from agents import Agent

from .admission_agent import admission_agent
from .catalog_agent import catalog_agent
from .info_agent import info_agent
from .order_agent import order_agent
from .party_agent import party_agent

triage_agent = Agent(
    name="ToyShopTriageAgent",
    instructions=(
        "Greet every caller with: 'Welcome to kids for fun Poughkeepsie Galleria Mall: 2001 South Rd Unit A108, Poughkeepsie, NY.' "
        "Then ask how you can help and briefly list what you can do: store info, toy catalog help, "
        "admission tickets and policies, birthday party planning, and order management (purchases, status, payments, refunds). "
        "After the greeting, decide the need and hand off to the best-fit specialist agent."
    ),
    handoffs=[info_agent, catalog_agent, admission_agent, party_agent, order_agent],
)


from agents import Agent

from .admission_agent import admission_agent
from .catalog_agent import catalog_agent
from .info_agent import info_agent
from .order_agent import order_agent
from .party_agent import party_agent

triage_agent = Agent(
    name="ToyShopTriageAgent",
    instructions=(
        "Decide if the visitor needs general store information, toy catalog help, admission tickets "
        "and policies, birthday party planning, or order management tasks (purchases, status updates, "
        "payments, refunds). Then hand off to the best-fit specialist agent."
    ),
    handoffs=[info_agent, catalog_agent, admission_agent, party_agent, order_agent],
)

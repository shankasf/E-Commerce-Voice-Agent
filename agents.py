import asyncio
from functools import wraps


def function_tool(func):
    """Lightweight decorator to mark a function as a tool while preserving metadata."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    # Basic metadata used by the agent adapter
    wrapper.name = getattr(func, "name", func.__name__)
    wrapper.description = (func.__doc__ or "").strip()
    wrapper.is_tool = True

    return wrapper


class Agent:
    def __init__(self, name: str, instructions: str = "", tools=None, handoffs=None):
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        self.handoffs = handoffs or []


class Runner:
    @staticmethod
    async def run(agent: Agent, text: str, session=None):
        # Simple passthrough response; replace with real agent pipeline if available
        class Result:
            def __init__(self, output: str):
                self.final_output = output

        return Result(
            f"I heard: {text}. How can I help with toys, info, tickets, parties, or orders?"
        )


class SQLiteSession:
    def __init__(self, session_id: str, db_path: str):
        self.session_id = session_id
        self.db_path = db_path

    async def save(self, content: str):
        # No-op stub
        return

"""
Agent framework for U Rack IT Voice Agent.

Provides base classes and utilities for building AI agents.
"""

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
    """Base agent class for building specialized agents."""
    
    def __init__(self, name: str, instructions: str = "", tools=None, handoffs=None):
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        self.handoffs = handoffs or []


class Runner:
    """Simple runner for executing agent responses."""
    
    @staticmethod
    async def run(agent: Agent, text: str, session=None):
        """Run the agent with the given input text."""
        
        class Result:
            def __init__(self, output: str):
                self.final_output = output
        
        # Simple passthrough response - replace with real agent pipeline
        return Result(
            f"I heard: {text}. How can I help with your IT support issue?"
        )


class SQLiteSession:
    """Session persistence using SQLite."""
    
    def __init__(self, session_id: str, db_path: str):
        self.session_id = session_id
        self.db_path = db_path
    
    async def save(self, content: str):
        """Save content to session (stub)."""
        return


def set_trace_processors(processors):
    """Set trace processors for debugging/monitoring (stub)."""
    pass

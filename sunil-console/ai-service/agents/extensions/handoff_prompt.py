"""
Handoff prompt utilities for the agents framework.

Provides recommended prompt prefixes to help LLMs understand handoffs properly.
"""

# Recommended prefix to include in agent instructions for proper handoff understanding
RECOMMENDED_PROMPT_PREFIX = """# System context
You are part of a multi-agent system called the Agents SDK, designed to make agent coordination and execution easy. Agents uses two primary abstraction: **Agents** and **Handoffs**. An agent encompasses instructions and tools and can hand off a conversation to another agent when appropriate. Handoffs are achieved by calling a handoff function, generally named `transfer_to_<agent_name>`. Transfers between agents are handled seamlessly in the background; do not mention or draw attention to these transfers in your conversation with the user."""


def prompt_with_handoff_instructions(instructions: str) -> str:
    """
    Automatically add recommended handoff instructions to agent prompts.

    Args:
        instructions: The base instructions for the agent

    Returns:
        Instructions with handoff context prepended
    """
    return f"{RECOMMENDED_PROMPT_PREFIX}\n\n{instructions}"

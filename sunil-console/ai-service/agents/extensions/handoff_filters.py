"""
Handoff filters for the agents framework.

Provides common input filter patterns for handoffs.
"""

from typing import Any, Dict, List


def remove_all_tools(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove all tool calls from the conversation history.

    This filter removes tool call messages from the history when
    handing off to another agent, providing a cleaner context.

    Args:
        input_data: The handoff input data containing history

    Returns:
        Filtered input data with tool calls removed
    """
    if "history" not in input_data:
        return input_data

    filtered_history = []
    for message in input_data.get("history", []):
        # Skip tool call and tool result messages
        if message.get("role") in ["tool", "function"]:
            continue
        if "tool_calls" in message:
            # Keep the message but remove tool_calls
            filtered = {k: v for k, v in message.items() if k != "tool_calls"}
            filtered_history.append(filtered)
        else:
            filtered_history.append(message)

    return {**input_data, "history": filtered_history}


def keep_last_n_messages(n: int):
    """
    Create a filter that keeps only the last N messages.

    Args:
        n: Number of messages to keep

    Returns:
        Filter function
    """
    def filter_func(input_data: Dict[str, Any]) -> Dict[str, Any]:
        if "history" not in input_data:
            return input_data
        return {**input_data, "history": input_data["history"][-n:]}

    return filter_func


def summarize_history(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Placeholder for history summarization.

    In a full implementation, this would use an LLM to summarize
    the conversation history before handoff.

    Args:
        input_data: The handoff input data

    Returns:
        Input data (unchanged in this stub)
    """
    # TODO: Implement LLM-based summarization
    return input_data

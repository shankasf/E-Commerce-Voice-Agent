"""
Guardrails module for AI response validation.

Prevents hallucination by validating AI outputs against actual tool results.
"""

from .tool_result_store import ToolResultStore, get_tool_result_store
from .response_validator import ResponseValidator, ValidationResult
from .extractors import extract_numbered_options, extract_selection_context

__all__ = [
    "ToolResultStore",
    "get_tool_result_store",
    "ResponseValidator",
    "ValidationResult",
    "extract_numbered_options",
    "extract_selection_context",
]

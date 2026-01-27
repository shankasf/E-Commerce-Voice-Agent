"""
ResponseValidator - Validates AI responses against tool results.

This is the main guardrail that prevents hallucination by checking
that the AI only presents options that actually exist in the data.
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Set

from .tool_result_store import ToolResultStore
from .extractors import (
    extract_selection_context,
    extract_numbered_options,
    normalize_option_text,
    find_option_match,
    ExtractedOption,
    SelectionContext,
)

logger = logging.getLogger(__name__)


class ViolationType(Enum):
    """Types of validation violations."""
    HALLUCINATED_LOCATION = "hallucinated_location"
    HALLUCINATED_DEVICE = "hallucinated_device"
    EMPTY_DATA_FABRICATION = "empty_data_fabrication"
    OPTION_COUNT_MISMATCH = "option_count_mismatch"


@dataclass
class Violation:
    """A single validation violation."""
    type: ViolationType
    message: str
    hallucinated_value: str
    position: Optional[int] = None


@dataclass
class ValidationResult:
    """Result of validating an AI response."""
    is_valid: bool
    violations: List[Violation] = field(default_factory=list)
    corrected_response: Optional[str] = None
    selection_context: Optional[SelectionContext] = None
    should_use_tool_message: bool = False
    tool_message_key: Optional[str] = None

    def add_violation(self, violation: Violation) -> None:
        """Add a violation and mark as invalid."""
        self.violations.append(violation)
        self.is_valid = False


class ResponseValidator:
    """
    Validates AI responses to prevent hallucination.

    Checks that when the AI presents options (locations, devices, etc.),
    those options actually exist in the tool results.
    """

    # Known hallucinated values to always flag
    KNOWN_HALLUCINATIONS = {
        "location": {
            "remote work", "remote", "office", "main office", "home office",
            "home", "headquarters", "hq", "branch office", "main branch",
            "downtown", "uptown", "warehouse", "factory", "store"
        },
        "device": {
            "laptop", "desktop", "computer", "workstation", "my laptop",
            "my computer", "work computer", "personal device", "phone",
            "tablet", "ipad", "macbook"
        }
    }

    def __init__(self, tool_store: ToolResultStore):
        self.tool_store = tool_store

    def validate_response(
        self,
        session_id: str,
        ai_response: str,
    ) -> ValidationResult:
        """
        Validate an AI response against stored tool results.

        Args:
            session_id: The session ID to look up tool results
            ai_response: The AI's response text

        Returns:
            ValidationResult with validity status and any violations
        """
        result = ValidationResult(is_valid=True)

        # If no session data, we can't validate (might be early in conversation)
        if not self.tool_store.has_data_for_session(session_id):
            logger.debug(f"No session data for {session_id}, skipping validation")
            return result

        # Extract what the AI is trying to present
        context = extract_selection_context(ai_response)
        result.selection_context = context

        # If no numbered options found, nothing to validate
        if not context.options:
            return result

        # Validate based on selection type
        if context.selection_type == "location":
            self._validate_locations(session_id, context, result)
        elif context.selection_type == "device":
            self._validate_devices(session_id, context, result)

        # If violations found, try to generate corrected response
        if not result.is_valid:
            self._generate_correction(session_id, context, result)

        return result

    def _validate_locations(
        self,
        session_id: str,
        context: SelectionContext,
        result: ValidationResult,
    ) -> None:
        """Validate location options against tool results."""
        valid_locations = self.tool_store.get_valid_locations(session_id)
        valid_names = self.tool_store.get_valid_location_names(session_id)

        logger.info(f"[Validator] Validating locations. Valid: {valid_names}, AI presented: {[o.text for o in context.options]}")

        # Case 1: Tool returned no locations but AI is presenting options
        if not valid_locations and context.options:
            result.add_violation(Violation(
                type=ViolationType.EMPTY_DATA_FABRICATION,
                message="AI presented location options but tool returned no locations",
                hallucinated_value=", ".join(o.text for o in context.options),
            ))
            result.should_use_tool_message = True
            result.tool_message_key = "no_locations"
            return

        # Case 2: AI presenting more options than exist
        if len(context.options) > len(valid_locations):
            result.add_violation(Violation(
                type=ViolationType.OPTION_COUNT_MISMATCH,
                message=f"AI presented {len(context.options)} locations but only {len(valid_locations)} exist",
                hallucinated_value=str(len(context.options)),
            ))

        # Case 3: Check each presented option
        for option in context.options:
            is_match, matched = find_option_match(
                option.text,
                [loc.get("name", "") for loc in valid_locations],
                threshold=0.7
            )

            if not is_match:
                # Check if it's a known hallucination
                normalized = normalize_option_text(option.text)
                if normalized in self.KNOWN_HALLUCINATIONS["location"]:
                    result.add_violation(Violation(
                        type=ViolationType.HALLUCINATED_LOCATION,
                        message=f"AI hallucinated location: '{option.text}'",
                        hallucinated_value=option.text,
                        position=option.start_pos,
                    ))
                else:
                    # Unknown option - still a violation
                    result.add_violation(Violation(
                        type=ViolationType.HALLUCINATED_LOCATION,
                        message=f"Location '{option.text}' not found in valid locations",
                        hallucinated_value=option.text,
                        position=option.start_pos,
                    ))

        if result.violations:
            result.should_use_tool_message = True
            result.tool_message_key = "location_prompt"

    def _validate_devices(
        self,
        session_id: str,
        context: SelectionContext,
        result: ValidationResult,
    ) -> None:
        """Validate device options against tool results."""
        valid_devices = self.tool_store.get_valid_devices(session_id)
        valid_names = self.tool_store.get_valid_device_names(session_id)

        logger.info(f"[Validator] Validating devices. Valid: {valid_names}, AI presented: {[o.text for o in context.options]}")

        # Case 1: Tool returned no devices but AI is presenting options
        if not valid_devices and context.options:
            result.add_violation(Violation(
                type=ViolationType.EMPTY_DATA_FABRICATION,
                message="AI presented device options but tool returned no devices",
                hallucinated_value=", ".join(o.text for o in context.options),
            ))
            result.should_use_tool_message = True
            result.tool_message_key = "no_devices"
            return

        # Case 2: AI presenting more options than exist
        if len(context.options) > len(valid_devices):
            result.add_violation(Violation(
                type=ViolationType.OPTION_COUNT_MISMATCH,
                message=f"AI presented {len(context.options)} devices but only {len(valid_devices)} exist",
                hallucinated_value=str(len(context.options)),
            ))

        # Case 3: Check each presented option
        for option in context.options:
            is_match, matched = find_option_match(
                option.text,
                [dev.get("name", "") for dev in valid_devices],
                threshold=0.6  # Lower threshold for devices (names vary more)
            )

            if not is_match:
                normalized = normalize_option_text(option.text)
                if normalized in self.KNOWN_HALLUCINATIONS["device"]:
                    result.add_violation(Violation(
                        type=ViolationType.HALLUCINATED_DEVICE,
                        message=f"AI hallucinated device: '{option.text}'",
                        hallucinated_value=option.text,
                        position=option.start_pos,
                    ))
                else:
                    result.add_violation(Violation(
                        type=ViolationType.HALLUCINATED_DEVICE,
                        message=f"Device '{option.text}' not found in valid devices",
                        hallucinated_value=option.text,
                        position=option.start_pos,
                    ))

        if result.violations:
            result.should_use_tool_message = True
            result.tool_message_key = "device_prompt"

    def _generate_correction(
        self,
        session_id: str,
        context: SelectionContext,
        result: ValidationResult,
    ) -> None:
        """Generate a corrected response using actual tool data."""

        # First, try to use pre-formatted message from tool
        if result.tool_message_key:
            tool_message = self.tool_store.get_user_message(session_id, result.tool_message_key)
            if tool_message:
                result.corrected_response = tool_message
                logger.info(f"[Validator] Using tool-provided message for {result.tool_message_key}")
                return

        # Otherwise, generate from stored data
        if context.selection_type == "location":
            locations = self.tool_store.get_valid_locations(session_id)
            if locations:
                options_text = "\n".join(
                    f"{loc['number']}. {loc['name']}"
                    for loc in locations
                )
                result.corrected_response = f"Please select your location:\n{options_text}"
            else:
                result.corrected_response = "I don't see any locations configured for your organization. I'll create the ticket without a specific location."

        elif context.selection_type == "device":
            devices = self.tool_store.get_valid_devices(session_id)
            if devices:
                options_text = "\n".join(
                    f"{dev['number']}. {dev['name']}"
                    for dev in devices
                )
                result.corrected_response = f"Please select your device:\n{options_text}"
            else:
                result.corrected_response = "I don't see any devices registered to your account. I'll create the ticket without a specific device."

        logger.info(f"[Validator] Generated corrected response: {result.corrected_response[:100]}...")

    def check_for_hallucination_keywords(self, text: str) -> List[str]:
        """
        Quick check for common hallucinated keywords in text.
        Useful for pre-validation before full analysis.

        Returns list of found hallucination keywords.
        """
        found = []
        text_lower = text.lower()

        for category, keywords in self.KNOWN_HALLUCINATIONS.items():
            for keyword in keywords:
                # Check if keyword appears as a numbered option
                pattern = rf'\d+[.\)]\s*{re.escape(keyword)}\b'
                if re.search(pattern, text_lower):
                    found.append(f"{category}:{keyword}")

        return found

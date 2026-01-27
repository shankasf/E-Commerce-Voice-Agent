"""
Extractors for parsing AI responses to find options, selections, and other content.

These functions help identify what the AI is presenting to the user
so we can validate it against actual tool results.
"""

import re
import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class ExtractedOption:
    """Represents a single option extracted from AI response."""
    number: int
    text: str
    original_match: str
    start_pos: int
    end_pos: int


@dataclass
class SelectionContext:
    """Context about what type of selection the AI is asking for."""
    selection_type: Optional[str]  # "location", "device", "priority", None
    options: List[ExtractedOption]
    prompt_text: str
    confidence: float  # 0.0 to 1.0


def extract_numbered_options(text: str) -> List[ExtractedOption]:
    """
    Extract numbered options from AI response text.

    Matches patterns like:
    - "1. Main Office"
    - "1) Remote Work"
    - "1 - Laptop"

    Args:
        text: The AI response text

    Returns:
        List of ExtractedOption objects
    """
    options = []

    # Pattern to match numbered options (various formats)
    # Matches: "1. Text", "1) Text", "1 - Text", "1: Text"
    patterns = [
        r'(\d+)\.\s+([^\n\d][^\n]*?)(?=\n\d+\.|\n\d+\)|\n\d+\s*-|\n\d+:|\n\n|\Z)',
        r'(\d+)\)\s+([^\n\d][^\n]*?)(?=\n\d+\.|\n\d+\)|\n\d+\s*-|\n\d+:|\n\n|\Z)',
        r'(\d+)\s*[-:]\s+([^\n\d][^\n]*?)(?=\n\d+\.|\n\d+\)|\n\d+\s*-|\n\d+:|\n\n|\Z)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.MULTILINE):
            number = int(match.group(1))
            option_text = match.group(2).strip()

            # Clean up common suffixes
            option_text = re.sub(r'\s*\(.*?\)\s*$', '', option_text)  # Remove trailing parentheticals
            option_text = option_text.rstrip('.,;:')

            # Skip if empty or just whitespace
            if not option_text or option_text.isspace():
                continue

            # Skip if it looks like a sentence continuation, not an option
            if len(option_text) > 100:
                continue

            options.append(ExtractedOption(
                number=number,
                text=option_text,
                original_match=match.group(0),
                start_pos=match.start(),
                end_pos=match.end(),
            ))

    # Remove duplicates (keep first occurrence)
    seen_numbers = set()
    unique_options = []
    for opt in options:
        if opt.number not in seen_numbers:
            seen_numbers.add(opt.number)
            unique_options.append(opt)

    return sorted(unique_options, key=lambda x: x.number)


def extract_selection_context(text: str) -> SelectionContext:
    """
    Analyze AI response to determine what type of selection is being requested.

    Args:
        text: The AI response text

    Returns:
        SelectionContext with type of selection and extracted options
    """
    text_lower = text.lower()
    options = extract_numbered_options(text)

    # Determine selection type based on keywords
    selection_type = None
    confidence = 0.0

    # Location detection keywords
    location_keywords = [
        "location", "office", "branch", "site", "building",
        "where are you", "which location", "select your location",
        "which office", "working from"
    ]

    # Device detection keywords
    device_keywords = [
        "device", "computer", "laptop", "desktop", "workstation",
        "which device", "select your device", "which computer",
        "having issue with", "machine"
    ]

    # Priority detection keywords
    priority_keywords = [
        "priority", "urgency", "how urgent", "criticality"
    ]

    # Count keyword matches
    location_score = sum(1 for kw in location_keywords if kw in text_lower)
    device_score = sum(1 for kw in device_keywords if kw in text_lower)
    priority_score = sum(1 for kw in priority_keywords if kw in text_lower)

    # Determine type based on scores
    if location_score > device_score and location_score > priority_score:
        selection_type = "location"
        confidence = min(location_score / 3.0, 1.0)
    elif device_score > location_score and device_score > priority_score:
        selection_type = "device"
        confidence = min(device_score / 3.0, 1.0)
    elif priority_score > 0:
        selection_type = "priority"
        confidence = min(priority_score / 2.0, 1.0)

    # Boost confidence if we found options
    if options and selection_type:
        confidence = min(confidence + 0.3, 1.0)

    # Extract the prompt text (text before the options)
    prompt_text = text
    if options:
        first_option_pos = options[0].start_pos
        prompt_text = text[:first_option_pos].strip()

    return SelectionContext(
        selection_type=selection_type,
        options=options,
        prompt_text=prompt_text,
        confidence=confidence,
    )


def normalize_option_text(text: str) -> str:
    """
    Normalize option text for comparison.

    Handles variations like:
    - "Main Office" vs "main office"
    - "Remote Work" vs "Remote"
    - "Dell Laptop - PC001" vs "Dell Laptop"
    """
    text = text.lower().strip()

    # Remove common suffixes and prefixes
    text = re.sub(r'\s*[-–—]\s*\w+$', '', text)  # Remove " - PC001" style suffixes
    text = re.sub(r'\s*\(.*?\)$', '', text)  # Remove trailing parentheticals
    text = re.sub(r'^\d+\.\s*', '', text)  # Remove leading numbers

    return text.strip()


def find_option_match(
    option_text: str,
    valid_options: List[str],
    threshold: float = 0.8
) -> Tuple[bool, Optional[str]]:
    """
    Check if an option text matches any valid option.

    Uses fuzzy matching to handle minor variations.

    Args:
        option_text: The text from AI response
        valid_options: List of valid option texts from tool results
        threshold: Minimum similarity threshold (0.0 to 1.0)

    Returns:
        Tuple of (is_match, matched_option or None)
    """
    normalized = normalize_option_text(option_text)

    if not normalized:
        return False, None

    for valid in valid_options:
        valid_normalized = normalize_option_text(valid)

        # Exact match
        if normalized == valid_normalized:
            return True, valid

        # Substring match (either direction)
        if normalized in valid_normalized or valid_normalized in normalized:
            return True, valid

        # Word overlap check
        option_words = set(normalized.split())
        valid_words = set(valid_normalized.split())

        if option_words and valid_words:
            overlap = len(option_words & valid_words)
            max_words = max(len(option_words), len(valid_words))
            similarity = overlap / max_words

            if similarity >= threshold:
                return True, valid

    return False, None


def extract_all_mentioned_items(text: str, item_type: str) -> List[str]:
    """
    Extract all items of a specific type mentioned anywhere in the text.

    This catches items even when they're not in a numbered list.

    Args:
        text: The AI response text
        item_type: "location" or "device"

    Returns:
        List of mentioned items
    """
    items = []
    text_lower = text.lower()

    # Common hallucinated location values to check for
    if item_type == "location":
        common_hallucinations = [
            "remote work", "remote", "office", "main office",
            "home", "home office", "headquarters", "hq",
            "branch", "main branch", "downtown", "uptown"
        ]
        for hallucination in common_hallucinations:
            if hallucination in text_lower:
                # Check if it's actually being presented as an option
                pattern = rf'(?:^|\n)\s*\d+[.\)]\s*{re.escape(hallucination)}'
                if re.search(pattern, text_lower):
                    items.append(hallucination)

    elif item_type == "device":
        common_hallucinations = [
            "laptop", "desktop", "computer", "workstation",
            "my laptop", "my computer", "work computer"
        ]
        for hallucination in common_hallucinations:
            if hallucination in text_lower:
                pattern = rf'(?:^|\n)\s*\d+[.\)]\s*{re.escape(hallucination)}'
                if re.search(pattern, text_lower):
                    items.append(hallucination)

    return items

"""
API Key Validator - Validates and fixes API key issues
"""

import os
import re


def validate_and_fix_api_key(api_key: str, provider: str = "openai") -> tuple[str, bool]:
    """
    Validate and fix API key format.
    Returns (fixed_key, is_valid)
    """
    if not api_key:
        return "", False
    
    # Remove whitespace
    api_key = api_key.strip()
    
    # Remove quotes if present
    if api_key.startswith('"') and api_key.endswith('"'):
        api_key = api_key[1:-1]
    elif api_key.startswith("'") and api_key.endswith("'"):
        api_key = api_key[1:-1]
    
    api_key = api_key.strip()
    
    # Validate format
    if provider == "openai":
        # OpenAI keys start with sk- and are typically 51+ characters
        if not api_key.startswith("sk-"):
            return api_key, False
        if len(api_key) < 20:
            return api_key, False
        return api_key, True
    elif provider == "mistral":
        # Mistral keys are typically alphanumeric
        if len(api_key) < 20:
            return api_key, False
        return api_key, True
    
    return api_key, len(api_key) > 10


def load_api_key_from_env(key_name: str, provider: str = "openai") -> tuple[str, bool]:
    """
    Load and validate API key from environment.
    Returns (api_key, is_valid)
    """
    api_key = os.getenv(key_name, "").strip()
    
    if not api_key:
        return "", False
    
    # Fix common issues
    fixed_key, is_valid = validate_and_fix_api_key(api_key, provider)
    
    return fixed_key, is_valid



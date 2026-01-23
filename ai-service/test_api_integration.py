"""
Test script for API Gateway integration.

This script tests the API client connection to the Next.js API Gateway.
Run this to verify the integration is working correctly.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib.api_client import get_api_client
from config import get_config

def test_api_connection():
    """Test basic API connection."""
    print("=" * 60)
    print("Testing API Gateway Integration")
    print("=" * 60)
    
    config = get_config()
    print(f"\n1. Configuration Check:")
    print(f"   Next.js API URL: {config.nextjs_api_url}")
    print(f"   API Key configured: {'Yes' if config.nextjs_api_key else 'No (WARNING)'}")
    
    if not config.nextjs_api_url:
        print("\n[ERROR] NEXTJS_API_URL not configured!")
        return False
    
    if not config.nextjs_api_key:
        print("\nWARNING: NEXTJS_API_KEY not configured. API calls will fail.")
    
    print(f"\n2. Testing API Client Initialization...")
    try:
        api_client = get_api_client()
        print("   [OK] API Client created successfully")
    except Exception as e:
        print(f"   [ERROR] Failed to create API client: {e}")
        return False
    
    print(f"\n3. Testing API Connection (GET /api/agents/tickets/statuses)...")
    try:
        result = api_client.get("/api/agents/tickets/statuses")
        print(f"   [OK] Connection successful!")
        print(f"   Response type: {type(result)}")
        if isinstance(result, list):
            print(f"   Found {len(result)} ticket statuses")
        return True
    except Exception as e:
        print(f"   [ERROR] Connection failed: {e}")
        print(f"\n   Troubleshooting:")
        print(f"   - Check if Next.js server is running on {config.nextjs_api_url}")
        print(f"   - Verify AI_SERVICE_API_KEY matches in both services")
        print(f"   - Check network connectivity")
        return False

if __name__ == "__main__":
    success = test_api_connection()
    print("\n" + "=" * 60)
    if success:
        print("[SUCCESS] Integration test PASSED")
    else:
        print("[FAILED] Integration test FAILED")
        sys.exit(1)
    print("=" * 60)


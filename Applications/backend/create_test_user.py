"""
Script to create a test user in JSON database (for testing)
Note: Credentials are now read from .env file
"""

from database import Database
import os
from dotenv import load_dotenv

load_dotenv()

def create_test_user():
    """Create a test user using credentials from .env"""
    db = Database()
    db.initialize()
    
    # Get credentials from .env
    email = os.getenv("TEST_EMAIL", "test@example.com")
    ue_code = os.getenv("TEST_UE_CODE", "TEST123")
    
    # Check if user already exists
    existing_user = db.get_user_by_email_and_ue_code(email, ue_code)
    if existing_user:
        print(f"User already exists:")
        print(f"  ID: {existing_user['id']}")
        print(f"  Email: {existing_user['email']}")
        print(f"  U&E Code: {existing_user['ue_code']}")
        print(f"  Client ID: {existing_user['client_id']}")
    else:
        # Create new user
        user = db.create_user(
            email=email,
            ue_code=ue_code,
            client_id="client_default"
        )
        
        print(f"Created test user:")
        print(f"  ID: {user['id']}")
        print(f"  Email: {user['email']}")
        print(f"  U&E Code: {user['ue_code']}")
        print(f"  Client ID: {user['client_id']}")
    
    print("\nCredentials from .env:")
    print(f"  TEST_EMAIL: {email}")
    print(f"  TEST_UE_CODE: {ue_code}")
    print("\nUse these credentials in the Windows MCP Agent login screen.")

if __name__ == "__main__":
    create_test_user()

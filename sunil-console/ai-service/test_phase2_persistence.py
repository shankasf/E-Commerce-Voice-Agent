"""
Test Script for Phase 2: Message Persistence

This script tests all database operations for the device chat feature:
- Database connection
- Chat message persistence
- Command execution tracking
- Device session management
- Technician session management

Usage:
    python test_phase2_persistence.py
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from db.device_chat import get_device_chat_db
from db.connection import get_db


class Colors:
    """Terminal colors for output."""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    """Print section header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message."""
    print(f"{Colors.OKGREEN}[OK] {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message."""
    print(f"{Colors.FAIL}[FAIL] {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message."""
    print(f"{Colors.OKCYAN}[INFO] {text}{Colors.ENDC}")


async def test_database_connection():
    """Test basic database connectivity."""
    print_header("Test 1: Database Connection")

    try:
        db = get_db()

        # Test if we can query the database
        result = db.select("support_tickets", limit=1)

        print_success("Database connection successful")
        print_info(f"Supabase URL: {db.url}")
        print_info(f"Can query tables: Yes")
        return True

    except Exception as e:
        print_error(f"Database connection failed: {e}")
        return False


async def test_tables_exist():
    """Test if the new tables exist."""
    print_header("Test 2: Database Tables")

    try:
        db = get_db()

        tables = [
            "device_chat_messages",
            "device_command_executions",
            "device_sessions",
            "technician_sessions"
        ]

        all_exist = True
        for table in tables:
            try:
                # Try to query each table
                db.select(table, limit=1)
                print_success(f"Table '{table}' exists")
            except Exception as e:
                print_error(f"Table '{table}' missing or inaccessible: {e}")
                all_exist = False

        return all_exist

    except Exception as e:
        print_error(f"Table check failed: {e}")
        return False


async def test_device_session_crud():
    """Test device session create/read/update/delete operations."""
    print_header("Test 3: Device Session Operations")

    try:
        chat_db = get_device_chat_db()

        # Generate test IDs
        test_chat_session_id = f"test_session_{datetime.utcnow().timestamp()}"

        # Test 1: Create device session
        print_info("Creating device session...")
        session = await chat_db.create_device_session(
            chat_session_id=test_chat_session_id,
            ticket_id=None,  # No ticket linked
            device_id=999,
            user_id=1,
            organization_id=1
        )
        print_success(f"Device session created: {session.get('session_id', 'N/A')}")

        # Test 2: Update heartbeat
        print_info("Updating session heartbeat...")
        await chat_db.update_session_heartbeat(test_chat_session_id)
        print_success("Heartbeat updated")

        # Test 3: Get session by ticket (should be None since no ticket)
        print_info("Querying session by ticket...")
        result = await chat_db.get_device_session_by_ticket(999999)
        if result is None:
            print_success("Query returned None as expected (no ticket linked)")

        # Test 4: Close session
        print_info("Closing device session...")
        await chat_db.close_device_session(test_chat_session_id)
        print_success("Device session closed")

        return True

    except Exception as e:
        print_error(f"Device session test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_chat_message_crud():
    """Test chat message create/read operations."""
    print_header("Test 4: Chat Message Operations")

    try:
        chat_db = get_device_chat_db()

        # Generate test IDs
        test_chat_session_id = f"test_chat_{datetime.utcnow().timestamp()}"

        # Test 1: Save user message
        print_info("Saving user message...")
        msg1 = await chat_db.save_chat_message(
            chat_session_id=test_chat_session_id,
            ticket_id=None,
            device_id=999,
            sender_type="user",
            content="Test user message"
        )
        print_success(f"User message saved: {msg1.get('message_id', 'N/A')}")

        # Test 2: Save AI agent message
        print_info("Saving AI agent message...")
        msg2 = await chat_db.save_chat_message(
            chat_session_id=test_chat_session_id,
            ticket_id=None,
            device_id=999,
            sender_type="ai_agent",  # Database expects 'ai_agent' not 'assistant'
            content="Test assistant response"
        )
        print_success(f"AI agent message saved: {msg2.get('message_id', 'N/A')}")

        # Test 3: Save human agent message with metadata
        print_info("Saving human agent message with metadata...")
        msg3 = await chat_db.save_chat_message(
            chat_session_id=test_chat_session_id,
            ticket_id=None,
            device_id=999,
            sender_type="human_agent",
            sender_agent_id=1,
            content="Test technician message",
            metadata={"agent_name": "Test Technician"}
        )
        print_success(f"Human agent message saved: {msg3.get('message_id', 'N/A')}")

        # Test 4: Retrieve chat history
        print_info("Retrieving chat history...")
        history = await chat_db.get_chat_history(test_chat_session_id, limit=10)
        print_success(f"Retrieved {len(history)} messages from history")

        # Verify all messages are present
        if len(history) >= 3:
            print_success("All 3 test messages found in history")
            for i, msg in enumerate(history, 1):
                print_info(f"  Message {i}: {msg['sender_type']} - {msg['content'][:30]}...")
        else:
            print_error(f"Expected 3 messages, found {len(history)}")
            return False

        return True

    except Exception as e:
        print_error(f"Chat message test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_command_execution_crud():
    """Test command execution create/read/update operations."""
    print_header("Test 5: Command Execution Operations")

    try:
        chat_db = get_device_chat_db()

        # Generate test IDs
        test_chat_session_id = f"test_cmd_{datetime.utcnow().timestamp()}"
        test_command_id = f"cmd_{datetime.utcnow().timestamp()}"

        # Test 1: Save command execution (pending)
        print_info("Saving command execution request...")
        cmd = await chat_db.save_command_execution(
            chat_session_id=test_chat_session_id,
            ticket_id=None,
            device_id=999,
            command_id=test_command_id,
            command="Get-ComputerInfo",
            description="Test diagnostic command",
            requester_type="ai_agent"
        )
        print_success(f"Command execution saved: {cmd.get('execution_id', 'N/A')}")
        print_info(f"  Status: {cmd.get('status', 'unknown')}")

        # Test 2: Update command to running
        print_info("Updating command status to 'running'...")
        updated = await chat_db.update_command_status(
            command_id=test_command_id,
            status="running"
        )
        print_success(f"Command status updated to 'running'")

        # Test 3: Update command to success with output
        print_info("Updating command status to 'success' with output...")
        completed = await chat_db.update_command_status(
            command_id=test_command_id,
            status="success",
            output="Computer: TEST-PC\nOS: Windows 11\nMemory: 16GB",
            execution_time_ms=1250
        )
        print_success(f"Command status updated to 'success'")
        print_info(f"  Execution time: {completed.get('execution_time_ms', 0)}ms")

        # Test 4: Retrieve execution history
        print_info("Retrieving execution history...")
        history = await chat_db.get_execution_history(test_chat_session_id, limit=10)
        print_success(f"Retrieved {len(history)} command executions")

        if len(history) >= 1:
            print_success("Test command found in history")
            exec_data = history[0]
            print_info(f"  Command: {exec_data['command']}")
            print_info(f"  Status: {exec_data['status']}")
            print_info(f"  Output length: {len(exec_data.get('output', ''))} chars")
        else:
            print_error("Expected at least 1 execution in history")
            return False

        return True

    except Exception as e:
        print_error(f"Command execution test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_technician_session_crud():
    """Test technician session create/read operations."""
    print_header("Test 6: Technician Session Operations")

    try:
        chat_db = get_device_chat_db()
        db = get_db()

        # Generate test IDs
        test_chat_session_id = f"test_tech_{datetime.utcnow().timestamp()}"

        # Find existing ticket and agent for testing (avoid foreign key errors)
        print_info("Finding existing ticket and agent for testing...")
        tickets = db.select("support_tickets", limit=1)
        agents = db.select("support_agents", limit=1)

        if not tickets or not agents:
            print_info("No existing tickets or agents found - skipping test (not a failure)")
            print_success("Test skipped (requires existing data)")
            return True

        test_ticket_id = tickets[0]["ticket_id"]
        test_agent_id = agents[0]["support_agent_id"]
        print_info(f"Using ticket_id={test_ticket_id}, agent_id={test_agent_id}")

        # Test 1: Create technician session
        print_info("Creating technician session...")
        session = await chat_db.create_technician_session(
            ticket_id=test_ticket_id,
            agent_id=test_agent_id,
            chat_session_id=test_chat_session_id
        )
        print_success(f"Technician session created: {session.get('session_id', 'N/A')}")
        print_info(f"  Agent ID: {test_agent_id}")
        print_info(f"  Is active: {session.get('is_active', False)}")

        # Test 2: Get active technicians for ticket
        print_info("Querying active technicians for ticket...")
        active_techs = await chat_db.get_active_technicians_for_ticket(test_ticket_id)
        print_success(f"Found {len(active_techs)} active technician(s)")

        # Test 3: Close technician session
        print_info("Closing technician session...")
        await chat_db.close_technician_session(
            ticket_id=test_ticket_id,
            agent_id=test_agent_id
        )
        print_success("Technician session closed")

        # Test 4: Verify no active technicians
        print_info("Verifying session is closed...")
        active_techs_after = await chat_db.get_active_technicians_for_ticket(test_ticket_id)
        if len(active_techs_after) == 0:
            print_success("No active technicians found (session properly closed)")
        else:
            print_error(f"Expected 0 active technicians, found {len(active_techs_after)}")
            return False

        return True

    except Exception as e:
        print_error(f"Technician session test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def run_all_tests():
    """Run all tests and report results."""
    print(f"\n{Colors.BOLD}{Colors.OKBLUE}")
    print("="*80)
    print(" "*15 + "PHASE 2 MESSAGE PERSISTENCE TEST SUITE")
    print("="*80)
    print(f"{Colors.ENDC}")

    tests = [
        ("Database Connection", test_database_connection),
        ("Database Tables", test_tables_exist),
        ("Device Session CRUD", test_device_session_crud),
        ("Chat Message CRUD", test_chat_message_crud),
        ("Command Execution CRUD", test_command_execution_crud),
        ("Technician Session CRUD", test_technician_session_crud),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print_error(f"Test '{test_name}' crashed: {e}")
            results.append((test_name, False))

    # Print summary
    print_header("Test Summary")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        if result:
            print_success(f"{test_name}: PASSED")
        else:
            print_error(f"{test_name}: FAILED")

    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.ENDC}")

    if passed == total:
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}[SUCCESS] ALL TESTS PASSED - Phase 2 is working correctly!{Colors.ENDC}\n")
        return True
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}[FAILURE] SOME TESTS FAILED - Please review errors above{Colors.ENDC}\n")
        return False


if __name__ == "__main__":
    # Run tests
    success = asyncio.run(run_all_tests())

    # Exit with appropriate code
    sys.exit(0 if success else 1)

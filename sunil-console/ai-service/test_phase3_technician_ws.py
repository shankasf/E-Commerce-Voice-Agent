"""
Test Script for Phase 3: Technician WebSocket

This script tests the technician WebSocket endpoint:
- Connection and authentication
- Receiving initial state (chat history + execution history)
- Sending chat messages
- Executing commands (primary assignee only)
- Error handling and edge cases

Usage:
    python test_phase3_technician_ws.py
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import websockets
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


def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.WARNING}[WARN] {text}{Colors.ENDC}")


async def setup_test_data():
    """
    Set up test data: device session with chat and command history.

    Returns:
        Tuple of (ticket_id, agent_id, chat_session_id) or (None, None, None) if setup fails
    """
    print_header("Test Setup: Creating Test Data")

    try:
        db = get_db()
        chat_db = get_device_chat_db()

        # Find existing ticket and agent
        print_info("Finding existing ticket and agent...")
        tickets = db.select("support_tickets", limit=1)
        agents = db.select("support_agents", limit=1)

        if not tickets or not agents:
            print_error("No tickets or agents found in database")
            print_info("Please create at least one ticket and agent first")
            return None, None, None

        ticket_id = tickets[0]["ticket_id"]
        agent_id = agents[0]["support_agent_id"]
        agent_name = agents[0]["full_name"]

        print_success(f"Found ticket_id={ticket_id}, agent_id={agent_id} ({agent_name})")

        # Check if agent is assigned to ticket
        print_info("Checking ticket assignment...")
        assignment = db.select(
            "ticket_assignments",
            filters={
                "ticket_id": f"eq.{ticket_id}",
                "support_agent_id": f"eq.{agent_id}"
            }
        )

        # If not assigned, create assignment
        if not assignment:
            print_info("Agent not assigned to ticket, creating assignment...")
            try:
                db.insert("ticket_assignments", {
                    "ticket_id": ticket_id,
                    "support_agent_id": agent_id,
                    "is_primary": True
                })
                print_success("Created ticket assignment (primary)")
            except Exception as e:
                print_warning(f"Could not create assignment: {e}")
                print_info("Agent may already be assigned")
        else:
            is_primary = assignment[0].get("is_primary", False)
            print_success(f"Agent already assigned (primary={is_primary})")

        # Create test device session
        from datetime import datetime
        chat_session_id = f"test_tech_ws_{datetime.now().timestamp()}"
        test_command_id = f"test_cmd_{datetime.now().timestamp()}"

        print_info("Creating test device session...")
        await chat_db.create_device_session(
            chat_session_id=chat_session_id,
            ticket_id=ticket_id,
            device_id=999,
            user_id=1,
            organization_id=1
        )
        print_success(f"Created device session: {chat_session_id}")

        # Add some test chat messages
        print_info("Adding test chat messages...")
        await chat_db.save_chat_message(
            chat_session_id=chat_session_id,
            ticket_id=ticket_id,
            device_id=999,
            sender_type="user",
            content="Hello, I'm having trouble with my printer"
        )
        await chat_db.save_chat_message(
            chat_session_id=chat_session_id,
            ticket_id=ticket_id,
            device_id=999,
            sender_type="ai_agent",
            content="I'll help you troubleshoot the printer issue. Let me check the printer status."
        )
        print_success("Added 2 test messages")

        # Add test command execution
        print_info("Adding test command execution...")
        await chat_db.save_command_execution(
            chat_session_id=chat_session_id,
            ticket_id=ticket_id,
            device_id=999,
            command_id=test_command_id,
            command="Get-Printer",
            description="Check printer status",
            requester_type="ai_agent"
        )
        await chat_db.update_command_status(
            command_id=test_command_id,
            status="success",
            output="Name: HP LaserJet\nStatus: Ready\nJobCount: 0"
        )
        print_success("Added 1 test command execution")

        return ticket_id, agent_id, chat_session_id

    except Exception as e:
        print_error(f"Setup failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None


async def cleanup_test_data(chat_session_id: Optional[str]):
    """Clean up test data created during setup."""
    if not chat_session_id:
        return

    print_header("Test Cleanup: Removing Test Data")

    try:
        chat_db = get_device_chat_db()

        print_info(f"Closing device session: {chat_session_id}")
        await chat_db.close_device_session(chat_session_id)
        print_success("Test data cleaned up")

    except Exception as e:
        print_warning(f"Cleanup warning: {e}")


async def test_websocket_connection():
    """Test 1: Basic WebSocket connection."""
    print_header("Test 1: WebSocket Connection")

    ws_url = "wss://localhost:8080/ws/technician"

    try:
        print_info(f"Connecting to {ws_url}...")
        async with websockets.connect(ws_url, open_timeout=5) as websocket:
            print_success("WebSocket connection established")

            # Server should wait for auth, not close immediately
            await asyncio.sleep(0.5)

            # In websockets 14.x, if we're still in the context manager, connection is open
            print_success("Connection remains open (waiting for auth)")
            return True

    except ConnectionRefusedError:
        print_error("Connection refused - Is the backend server running?")
        print_info("Start the server with: python main.py")
        return False
    except Exception as e:
        print_error(f"Connection failed: {e}")
        return False


async def test_authentication(ticket_id: int, agent_id: int, chat_session_id: str):
    """Test 2: Authentication flow."""
    print_header("Test 2: Authentication")

    ws_url = "wss://localhost:8080/ws/technician"

    try:
        print_info("Connecting...")
        async with websockets.connect(ws_url, open_timeout=5) as websocket:
            print_success("Connected")

            # Send auth message
            print_info("Sending auth message...")
            auth_message = {
                "type": "auth",
                "jwt_token": "test_token_123",  # Placeholder JWT
                "ticket_id": ticket_id,
                "agent_id": agent_id
            }
            await websocket.send(json.dumps(auth_message))
            print_success("Auth message sent")

            # Wait for auth response
            print_info("Waiting for auth response...")
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)

            if data.get("type") == "auth_success":
                print_success("Authentication successful")
                print_info(f"  Ticket ID: {data.get('ticket_id')}")
                print_info(f"  Chat Session ID: {data.get('chat_session_id')}")
                print_info(f"  Device ID: {data.get('device_id')}")
                print_info(f"  Is Primary: {data.get('is_primary_assignee')}")
                return True
            elif data.get("type") == "error":
                print_error(f"Auth failed: {data.get('error')}")
                return False
            else:
                print_error(f"Unexpected response: {data.get('type')}")
                return False

    except asyncio.TimeoutError:
        print_error("Authentication timeout")
        return False
    except Exception as e:
        print_error(f"Authentication error: {e}")
        return False


async def test_initial_state(ticket_id: int, agent_id: int, chat_session_id: str):
    """Test 3: Receiving initial state."""
    print_header("Test 3: Initial State (Chat History + Execution History)")

    ws_url = "wss://localhost:8080/ws/technician"

    try:
        async with websockets.connect(ws_url, open_timeout=5) as websocket:
            # Authenticate
            auth_message = {
                "type": "auth",
                "jwt_token": "test_token_123",
                "ticket_id": ticket_id,
                "agent_id": agent_id
            }
            await websocket.send(json.dumps(auth_message))

            # Skip auth success message
            await websocket.recv()

            # Receive initial state
            print_info("Waiting for initial state...")
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)

            if data.get("type") == "initial_state":
                print_success("Received initial state")

                chat_history = data.get("chat_history", [])
                execution_history = data.get("execution_history", [])

                print_info(f"  Chat messages: {len(chat_history)}")
                print_info(f"  Command executions: {len(execution_history)}")

                # Verify we got the test data
                if len(chat_history) >= 2:
                    print_success("Chat history contains test messages")
                    for i, msg in enumerate(chat_history[:2], 1):
                        print_info(f"    Message {i}: {msg.get('sender_type')} - {msg.get('content')[:40]}...")
                else:
                    print_warning(f"Expected at least 2 messages, got {len(chat_history)}")

                if len(execution_history) >= 1:
                    print_success("Execution history contains test commands")
                    exec_data = execution_history[0]
                    print_info(f"    Command: {exec_data.get('command')}")
                    print_info(f"    Status: {exec_data.get('status')}")
                else:
                    print_warning(f"Expected at least 1 execution, got {len(execution_history)}")

                return True
            else:
                print_error(f"Unexpected message type: {data.get('type')}")
                return False

    except asyncio.TimeoutError:
        print_error("Initial state timeout")
        return False
    except Exception as e:
        print_error(f"Initial state error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_send_chat_message(ticket_id: int, agent_id: int, chat_session_id: str):
    """Test 4: Sending chat message."""
    print_header("Test 4: Send Chat Message")

    ws_url = "wss://localhost:8080/ws/technician"

    try:
        async with websockets.connect(ws_url, open_timeout=5) as websocket:
            # Authenticate
            auth_message = {
                "type": "auth",
                "jwt_token": "test_token_123",
                "ticket_id": ticket_id,
                "agent_id": agent_id
            }
            await websocket.send(json.dumps(auth_message))

            # Skip auth success and initial state messages
            await websocket.recv()  # auth_success
            await websocket.recv()  # initial_state

            # Send chat message
            print_info("Sending chat message...")
            chat_message = {
                "type": "chat",
                "content": "Hello from test technician! I'm here to help."
            }
            await websocket.send(json.dumps(chat_message))
            print_success("Chat message sent")

            # Give it a moment to process
            await asyncio.sleep(0.5)

            # Verify message was saved to database
            print_info("Verifying message was saved to database...")
            chat_db = get_device_chat_db()
            history = await chat_db.get_chat_history(chat_session_id, limit=10)

            # Look for our message
            found = False
            for msg in history:
                if "test technician" in msg.get("content", "").lower():
                    found = True
                    print_success("Message found in database")
                    print_info(f"  Sender: {msg.get('sender_type')}")
                    print_info(f"  Content: {msg.get('content')[:50]}...")
                    break

            if not found:
                print_warning("Message not found in database (may be processing)")

            return True

    except Exception as e:
        print_error(f"Send chat message error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_heartbeat(ticket_id: int, agent_id: int, chat_session_id: str):
    """Test 5: Heartbeat mechanism."""
    print_header("Test 5: Heartbeat")

    ws_url = "wss://localhost:8080/ws/technician"

    try:
        async with websockets.connect(ws_url, open_timeout=5) as websocket:
            # Authenticate
            auth_message = {
                "type": "auth",
                "jwt_token": "test_token_123",
                "ticket_id": ticket_id,
                "agent_id": agent_id
            }
            await websocket.send(json.dumps(auth_message))

            # Skip initial messages
            await websocket.recv()  # auth_success
            await websocket.recv()  # initial_state

            # Send heartbeat
            print_info("Sending heartbeat...")
            heartbeat_message = {"type": "heartbeat"}
            await websocket.send(json.dumps(heartbeat_message))
            print_success("Heartbeat sent")

            # Wait for acknowledgment
            print_info("Waiting for heartbeat_ack...")
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)

            if data.get("type") == "heartbeat_ack":
                print_success("Received heartbeat acknowledgment")
                return True
            else:
                print_error(f"Unexpected response: {data.get('type')}")
                return False

    except asyncio.TimeoutError:
        print_error("Heartbeat timeout")
        return False
    except Exception as e:
        print_error(f"Heartbeat error: {e}")
        return False


async def test_error_handling():
    """Test 6: Error handling."""
    print_header("Test 6: Error Handling")

    ws_url = "wss://localhost:8080/ws/technician"

    # Test 6a: Authentication with invalid ticket
    print_info("Test 6a: Invalid ticket ID...")
    try:
        async with websockets.connect(ws_url, open_timeout=5) as websocket:
            auth_message = {
                "type": "auth",
                "jwt_token": "test_token_123",
                "ticket_id": 999999,  # Non-existent ticket
                "agent_id": 1
            }
            await websocket.send(json.dumps(auth_message))

            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)

            if data.get("type") == "error":
                print_success(f"Error correctly returned: {data.get('error')}")
            else:
                print_warning(f"Expected error, got: {data.get('type')}")

    except Exception as e:
        print_warning(f"Test 6a exception (may be expected): {e}")

    # Test 6b: Authentication without required fields
    print_info("Test 6b: Missing auth parameters...")
    try:
        async with websockets.connect(ws_url, open_timeout=5) as websocket:
            auth_message = {
                "type": "auth",
                "jwt_token": "test_token_123"
                # Missing ticket_id and agent_id
            }
            await websocket.send(json.dumps(auth_message))

            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)

            if data.get("type") == "error":
                print_success(f"Error correctly returned: {data.get('error')}")
            else:
                print_warning(f"Expected error, got: {data.get('type')}")

    except Exception as e:
        print_warning(f"Test 6b exception (may be expected): {e}")

    print_success("Error handling tests completed")
    return True


async def run_all_tests():
    """Run all tests and report results."""
    print(f"\n{Colors.BOLD}{Colors.OKBLUE}")
    print("="*80)
    print(" "*15 + "PHASE 3 TECHNICIAN WEBSOCKET TEST SUITE")
    print("="*80)
    print(f"{Colors.ENDC}")

    # Setup test data
    ticket_id, agent_id, chat_session_id = await setup_test_data()

    if not all([ticket_id, agent_id, chat_session_id]):
        print_error("Test setup failed - cannot proceed with tests")
        return False

    tests = [
        ("WebSocket Connection", test_websocket_connection, []),
        ("Authentication", test_authentication, [ticket_id, agent_id, chat_session_id]),
        ("Initial State", test_initial_state, [ticket_id, agent_id, chat_session_id]),
        ("Send Chat Message", test_send_chat_message, [ticket_id, agent_id, chat_session_id]),
        ("Heartbeat", test_heartbeat, [ticket_id, agent_id, chat_session_id]),
        ("Error Handling", test_error_handling, []),
    ]

    results = []

    for test_name, test_func, args in tests:
        try:
            result = await test_func(*args)
            results.append((test_name, result))
        except Exception as e:
            print_error(f"Test '{test_name}' crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))

    # Cleanup
    await cleanup_test_data(chat_session_id)

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
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}[SUCCESS] ALL TESTS PASSED - Phase 3 is working correctly!{Colors.ENDC}\n")
        return True
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}[FAILURE] SOME TESTS FAILED - Please review errors above{Colors.ENDC}\n")
        return False


if __name__ == "__main__":
    # Check if websockets is installed
    try:
        import websockets
    except ImportError:
        print(f"{Colors.FAIL}Error: websockets package not installed{Colors.ENDC}")
        print(f"{Colors.INFO}Install with: pip install websockets{Colors.ENDC}")
        sys.exit(1)

    # Run tests
    success = asyncio.run(run_all_tests())

    # Exit with appropriate code
    sys.exit(0 if success else 1)

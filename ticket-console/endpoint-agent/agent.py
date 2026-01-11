#!/usr/bin/env python3
"""
Endpoint Agent - Secure Remote Terminal Agent

This agent runs on the customer's machine and connects to the support server
to allow IT agents to run pre-approved diagnostics.

Usage:
    # First time - enroll with a code from the IT portal
    python agent.py --enroll ABCD-1234
    
    # After enrollment - just run the agent
    python agent.py
    
    # Reset enrollment
    python agent.py --reset
"""

import asyncio
import json
import logging
import argparse
import sys
from datetime import datetime, timezone
from typing import Optional

try:
    import websockets
except ImportError:
    print("ERROR: websockets package not installed.")
    print("Run: pip install websockets")
    sys.exit(1)

from config import get_config
from auth import (
    DeviceIdentity, 
    save_identity, 
    load_identity, 
    clear_identity,
    generate_device_name,
    get_machine_fingerprint
)
from executor import execute_diagnostic, execute_command_raw, get_executor_info
from diagnostics import list_diagnostics, get_diagnostic

# ─────────────────────────────────────────────────────────────
# Logging Setup
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("EndpointAgent")

# ─────────────────────────────────────────────────────────────
# Agent Class
# ─────────────────────────────────────────────────────────────

class EndpointAgent:
    """Secure endpoint agent that connects to the support relay server."""
    
    def __init__(self, relay_url: str):
        self.relay_url = relay_url
        self.identity: Optional[DeviceIdentity] = None
        self.websocket = None
        self.running = False
        self.reconnect_delay = 5
        self.max_reconnect_delay = 60
        
    async def enroll(self, enrollment_code: str) -> tuple[bool, str]:
        """
        Enroll this device with an enrollment code.
        Returns: (success: bool, error_message: str)
        """
        """Enroll this device with an enrollment code."""
        logger.info(f"Enrolling with code: {enrollment_code}")
        
        try:
            # Connect to enrollment endpoint
            enroll_url = self.relay_url.replace("/ws", "/enroll")
            if "ws://" in enroll_url:
                enroll_url = enroll_url.replace("ws://", "http://")
            elif "wss://" in enroll_url:
                enroll_url = enroll_url.replace("wss://", "https://")
            
            # For WebSocket-based enrollment, connect and send enrollment request
            logger.info(f"Connecting to WebSocket: {self.relay_url}")
            print(f"[AGENT] Connecting to WebSocket: {self.relay_url}")
            try:
                print(f"[AGENT] Attempting WebSocket connection (10s timeout)...")
                ws = await asyncio.wait_for(websockets.connect(self.relay_url), timeout=10)
                print(f"[AGENT] WebSocket connected successfully!")
            except asyncio.TimeoutError:
                error_msg = "❌ WebSocket connection timeout - server may not be running"
                logger.error(error_msg)
                print(f"[AGENT] {error_msg}")
                return (False, error_msg)
            except Exception as e:
                error_msg = f"❌ WebSocket connection failed: {type(e).__name__}: {e}"
                logger.error(error_msg)
                print(f"[AGENT] {error_msg}")
                import traceback
                print(f"[AGENT] Traceback: {traceback.format_exc()}")
                return (False, error_msg)
            
            try:
                logger.info("WebSocket connected, sending enrollment request...")
                
                # Send enrollment request
                await ws.send(json.dumps({
                    "type": "enroll",
                    "enrollment_code": enrollment_code,
                    "device_name": generate_device_name(),
                    "fingerprint": get_machine_fingerprint(),
                    "executor_info": get_executor_info(),
                }))
                
                logger.info("Enrollment request sent, waiting for response...")
                
                # Wait for response
                logger.info("Waiting for enrollment response...")
                response = await asyncio.wait_for(ws.recv(), timeout=30)
                data = json.loads(response)
                
                logger.info(f"Received response: {data.get('type', 'unknown')}")
                
                if data.get("type") == "enrolled":
                    self.identity = DeviceIdentity(
                        device_id=data["device_id"],
                        device_name=data["device_name"],
                        device_token=data["device_token"],
                        enrolled_at=datetime.now(timezone.utc).isoformat(),
                        relay_url=self.relay_url,
                    )
                    save_identity(self.identity)
                    logger.info(f"✅ Successfully enrolled as: {self.identity.device_name}")
                    logger.info(f"   Device ID: {self.identity.device_id}")
                    # Connection will be closed in finally block
                    return (True, "")
                elif data.get("type") == "error":
                    error = data.get("error", "Unknown error")
                    logger.error(f"❌ Enrollment failed: {error}")
                    print(f"[AGENT] ❌ Server returned error: {error}")
                    # Connection will be closed in finally block
                    return (False, error)
                else:
                    error = f"Unexpected response type: {data.get('type')}"
                    logger.error(f"❌ Enrollment failed: {error}")
                    # Connection will be closed in finally block
                    return (False, error)
            finally:
                try:
                    # Try to close the connection - ignore any errors
                    await ws.close()
                except Exception:
                    # Connection might already be closed or in an invalid state
                    pass
                    
        except asyncio.TimeoutError:
            error_msg = "Enrollment timed out after 30 seconds"
            logger.error(f"❌ {error_msg}")
            return (False, error_msg)
        except (ConnectionRefusedError, OSError) as e:
            if "refused" in str(e).lower() or "10061" in str(e):
                error_msg = "Connection refused - server may not be running"
                logger.error(f"❌ {error_msg}")
            else:
                error_msg = f"Connection error: {e}"
                logger.error(f"❌ {error_msg}")
            return (False, error_msg)
        except websockets.exceptions.InvalidStatusCode as e:
            error_msg = f"WebSocket connection failed with status {e.status_code}: {e}"
            logger.error(f"❌ {error_msg}")
            return (False, error_msg)
        except websockets.exceptions.InvalidURI as e:
            error_msg = f"Invalid server URL: {e}"
            logger.error(f"❌ {error_msg}")
            return (False, error_msg)
        except Exception as e:
            error_msg = f"Enrollment error: {type(e).__name__}: {e}"
            logger.error(f"❌ {error_msg}")
            import traceback
            logger.error(traceback.format_exc())
            return (False, error_msg)
    
    async def connect(self):
        """Connect to the relay server."""
        if not self.identity:
            self.identity = load_identity()
            if not self.identity:
                logger.error("No device identity found. Please enroll first with --enroll CODE")
                return False
        
        logger.info(f"Connecting to relay server: {self.relay_url}")
        
        try:
            self.websocket = await websockets.connect(
                self.relay_url,
                ping_interval=30,
                ping_timeout=10,
            )
            
            # Authenticate
            await self.websocket.send(json.dumps({
                "type": "authenticate",
                "device_id": self.identity.device_id,
                "device_token": self.identity.device_token,
                "fingerprint": get_machine_fingerprint(),
            }))
            
            # Wait for auth response
            response = await asyncio.wait_for(self.websocket.recv(), timeout=10)
            data = json.loads(response)
            
            if data.get("type") == "authenticated":
                logger.info("✅ Connected and authenticated")
                self.reconnect_delay = 5  # Reset delay on success
                return True
            else:
                error = data.get("error", "Authentication failed")
                logger.error(f"❌ Authentication failed: {error}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Connection error: {e}")
            return False
    
    async def handle_message(self, message: str):
        """Handle incoming messages from the relay server."""
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "ping":
                # Respond to ping
                await self.websocket.send(json.dumps({"type": "pong"}))
                
            elif msg_type == "execute":
                # Execute a diagnostic
                await self.handle_execute(data)
                
            elif msg_type == "execute_raw":
                # Execute a raw command (with blacklist validation)
                await self.handle_execute_raw(data)
                
            elif msg_type == "list_diagnostics":
                # List available diagnostics
                await self.websocket.send(json.dumps({
                    "type": "diagnostics_list",
                    "request_id": data.get("request_id"),
                    "diagnostics": list_diagnostics(),
                }))
                
            elif msg_type == "health_check":
                # Respond to health check
                await self.websocket.send(json.dumps({
                    "type": "health_response",
                    "request_id": data.get("request_id"),
                    "status": "healthy",
                    "executor_info": get_executor_info(),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }))
                
            elif msg_type == "disconnect":
                # Server requested disconnect
                reason = data.get("reason", "Server requested disconnect")
                logger.info(f"Server requested disconnect: {reason}")
                self.running = False
                
            else:
                logger.warning(f"Unknown message type: {msg_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON message received")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def handle_execute(self, data: dict):
        """Handle an execute diagnostic request."""
        request_id = data.get("request_id")
        diagnostic_id = data.get("diagnostic_id")
        params = data.get("params", {})
        approval_id = data.get("approval_id")
        
        logger.info(f"📥 Execute request: {diagnostic_id} (approval: {approval_id})")
        
        # Validate the diagnostic exists
        diagnostic = get_diagnostic(diagnostic_id)
        if not diagnostic:
            await self.websocket.send(json.dumps({
                "type": "execute_result",
                "request_id": request_id,
                "success": False,
                "error": f"Unknown diagnostic: {diagnostic_id}",
            }))
            return
        
        # Log what we're about to do
        logger.info(f"   Running: {diagnostic.name}")
        logger.info(f"   Command: {diagnostic.build_command(params)}")
        
        # Execute the diagnostic
        result = execute_diagnostic(diagnostic_id, params)
        
        # Send result back
        await self.websocket.send(json.dumps({
            "type": "execute_result",
            "request_id": request_id,
            "approval_id": approval_id,
            "diagnostic_id": diagnostic_id,
            "success": result.success,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.exit_code,
            "truncated": result.truncated,
            "redactions": result.redactions,
            "warnings": result.warnings,
            "execution_time_ms": result.execution_time_ms,
            "error": result.error,
        }))
        
        status = "✅" if result.success else "❌"
        logger.info(f"   Result: {status} (exit code: {result.exit_code}, {result.execution_time_ms}ms)")
    
    async def handle_execute_raw(self, data: dict):
        """Handle a raw command execution request (with blacklist validation)."""
        request_id = data.get("request_id")
        command = data.get("command")
        timeout = data.get("timeout", 30)
        approval_id = data.get("approval_id")
        
        logger.info(f"📥 Execute raw request: {command} (approval: {approval_id})")
        
        if not command or not command.strip():
            await self.websocket.send(json.dumps({
                "type": "execute_result",
                "request_id": request_id,
                "success": False,
                "error": "Empty command",
            }))
            return
        
        # Execute the raw command (blacklist validation happens inside)
        result = execute_command_raw(command, timeout)
        
        # Send result back
        await self.websocket.send(json.dumps({
            "type": "execute_result",
            "request_id": request_id,
            "approval_id": approval_id,
            "diagnostic_id": "raw_command",
            "success": result.success,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.exit_code,
            "truncated": result.truncated,
            "redactions": result.redactions,
            "warnings": result.warnings,
            "execution_time_ms": result.execution_time_ms,
            "error": result.error,
        }))
        
        status = "✅" if result.success else "❌"
        logger.info(f"   Result: {status} (exit code: {result.exit_code}, {result.execution_time_ms}ms)")
        
    async def run(self):
        """Main run loop with reconnection logic."""
        self.running = True
        
        while self.running:
            connected = await self.connect()
            
            if not connected:
                logger.info(f"Retrying in {self.reconnect_delay} seconds...")
                await asyncio.sleep(self.reconnect_delay)
                self.reconnect_delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)
                continue
            
            try:
                async for message in self.websocket:
                    if not self.running:
                        break
                    await self.handle_message(message)
                    
            except websockets.ConnectionClosed as e:
                logger.warning(f"Connection closed: {e}")
            except Exception as e:
                logger.error(f"Error in message loop: {e}")
            
            if self.running:
                logger.info(f"Reconnecting in {self.reconnect_delay} seconds...")
                await asyncio.sleep(self.reconnect_delay)
    
    async def stop(self):
        """Stop the agent."""
        self.running = False
        if self.websocket:
            await self.websocket.close()


# ─────────────────────────────────────────────────────────────
# CLI Entry Point
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Endpoint Agent - Secure Remote Terminal Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python agent.py --enroll ABCD-1234    Enroll with code from IT portal
  python agent.py                        Run the agent (after enrollment)
  python agent.py --reset                Clear enrollment and start fresh
  python agent.py --status               Show current enrollment status
        """
    )
    parser.add_argument(
        "--enroll", "-e",
        metavar="CODE",
        help="Enroll with an enrollment code from the IT portal"
    )
    parser.add_argument(
        "--reset", "-r",
        action="store_true",
        help="Clear current enrollment"
    )
    parser.add_argument(
        "--status", "-s",
        action="store_true",
        help="Show current enrollment status"
    )
    parser.add_argument(
        "--relay-url",
        help="Override the relay server URL"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    config = get_config()
    relay_url = args.relay_url or config.relay_url
    
    # Handle --status
    if args.status:
        identity = load_identity()
        if identity:
            print("\n✅ Device is enrolled")
            print(f"   Device ID:   {identity.device_id}")
            print(f"   Device Name: {identity.device_name}")
            print(f"   Enrolled:    {identity.enrolled_at}")
            print(f"   Relay URL:   {identity.relay_url}")
        else:
            print("\n❌ Device is not enrolled")
            print("   Use --enroll CODE to enroll")
        return
    
    # Handle --reset
    if args.reset:
        clear_identity()
        print("✅ Enrollment cleared")
        return
    
    # Handle --enroll
    if args.enroll:
        agent = EndpointAgent(relay_url)
        
        async def do_enroll():
            success, error_msg = await agent.enroll(args.enroll)
            if success:
                print("\n✅ Enrollment successful!")
                print("   You can now run: python agent.py")
            else:
                print(f"\n❌ Enrollment failed: {error_msg}")
                sys.exit(1)
        
        asyncio.run(do_enroll())
        return
    
    # Default: run the agent
    identity = load_identity()
    if not identity:
        print("\n❌ Device is not enrolled")
        print("   Use --enroll CODE to enroll first")
        print("   Get the enrollment code from the IT support portal")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("  Endpoint Agent")
    print("=" * 50)
    print(f"  Device: {identity.device_name}")
    print(f"  ID:     {identity.device_id}")
    print(f"  Relay:  {relay_url}")
    print("=" * 50)
    print("\nConnecting to support server...")
    print("Press Ctrl+C to stop\n")
    
    agent = EndpointAgent(relay_url)
    agent.identity = identity
    
    try:
        asyncio.run(agent.run())
    except KeyboardInterrupt:
        print("\n\nStopping agent...")
        asyncio.run(agent.stop())
        print("Agent stopped")


if __name__ == "__main__":
    main()



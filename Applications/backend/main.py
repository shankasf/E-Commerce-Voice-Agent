"""
Windows MCP Agent Backend
Main FastAPI application for handling device registration and LLM-powered problem resolution
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, List
import uvicorn
from datetime import datetime
import asyncio
import json

from database import Database
from websocket_client import WebSocketClient
from llm_service import LLMService
from device_manager import DeviceManager
from connection_registry import ConnectionRegistry
from message_queue import MessageQueue
from agents.orchestrator import AgentOrchestrator
from agents.tool_registry import ToolRegistry
import os
from dotenv import load_dotenv
import websockets
from fastapi import WebSocket, WebSocketDisconnect

load_dotenv()

app = FastAPI(title="Windows MCP Agent Backend", version="1.0.0")

# Serve static files (front-end)
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except:
    pass  # Directory might not exist yet

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
db = Database()
device_manager = DeviceManager(db)
llm_service = LLMService()
ws_client = WebSocketClient()  # Keep for backward compatibility if needed
connection_registry = ConnectionRegistry()  # New: Registry for reverse connections
message_queue = MessageQueue()  # Message queue for tool call/result matching

# Initialize multi-agent system
tool_registry = ToolRegistry()
agent_orchestrator = AgentOrchestrator(llm_service, tool_registry)


# Request/Response Models
class DeviceRegistrationRequest(BaseModel):
    email: EmailStr
    ue_code: str
    device_id: str
    device_name: str
    os_version: str
    mcp_url: Optional[str] = None  # Optional for reverse connection architecture


class DeviceRegistrationResponse(BaseModel):
    success: bool
    jwt_token: Optional[str] = None
    client_id: Optional[str] = None
    user_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class ProblemRequest(BaseModel):
    user_id: str
    problem_description: str
    device_id: Optional[str] = None  # If not provided, uses user's primary device
    role: Optional[str] = "ai_agent"  # Role: ai_agent, human_agent, or admin (for testing)


class ProblemResponse(BaseModel):
    success: bool
    solution: Optional[str] = None
    tools_executed: Optional[List[Dict]] = None
    pending_commands: Optional[List[Dict]] = None  # Commands requiring consent for ai_agent
    error: Optional[str] = None
    requires_escalation: Optional[bool] = None  # Whether human agent transfer is recommended
    escalation_reason: Optional[str] = None  # Why escalation is needed
    escalation_options: Optional[List[Dict]] = None  # UI options for user choice


@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
    db.initialize()


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    await ws_client.close_all()
    await connection_registry.close_all()


@app.get("/")
async def root():
    """Health check endpoint and redirect to chat UI"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/static/index.html")


@app.post("/api/device/register", response_model=DeviceRegistrationResponse)
async def register_device(request: DeviceRegistrationRequest):
    """
    Register a new device with the backend.
    Client generates MCP URL and sends it here for storage.
    Validates credentials against .env file.
    """
    try:
        # Get credentials from .env file
        env_email = os.getenv("TEST_EMAIL", "").strip()
        env_ue_code = os.getenv("TEST_UE_CODE", "").strip()
        
        # Validate credentials against .env
        if not env_email or not env_ue_code:
            return DeviceRegistrationResponse(
                success=False,
                error="Server configuration error: TEST_EMAIL and TEST_UE_CODE must be set in .env file"
            )
        
        if request.email.lower() != env_email.lower() or request.ue_code != env_ue_code:
            return DeviceRegistrationResponse(
                success=False,
                error="Invalid email or U & E code. Please check your credentials."
            )
        
        # Get or create user
        user = db.get_user_by_email_and_ue_code(request.email, request.ue_code)
        if not user:
            # Create user if doesn't exist
            user = db.create_user(request.email, request.ue_code)
        
        # Register or update device
        # For reverse connection, mcp_url is optional (device connects to backend)
        device = device_manager.register_device(
            device_id=request.device_id,
            user_id=user["id"],
            client_id=user["client_id"],
            device_name=request.device_name,
            os_version=request.os_version,
            mcp_url=request.mcp_url or ""  # Empty for reverse connection
        )
        
        # Generate JWT token (simplified - in production use proper JWT library)
        jwt_token = f"token_{user['id']}_{device['id']}_{int(datetime.now().timestamp())}"
        
        # Get backend WebSocket URL for reverse connection
        backend_host = os.getenv("BACKEND_HOST", "localhost")
        backend_port = os.getenv("PORT", "9000")
        backend_ws_url = f"ws://{backend_host}:{backend_port}/ws/device/{request.device_id}"
        
        return DeviceRegistrationResponse(
            success=True,
            jwt_token=jwt_token,
            client_id=user["client_id"],
            user_id=user["id"],
            message=f"Device registered successfully. Connect to: {backend_ws_url}"
        )
    
    except Exception as e:
        return DeviceRegistrationResponse(
            success=False,
            error=f"Registration failed: {str(e)}"
        )


@app.post("/api/problem/solve", response_model=ProblemResponse)
async def solve_problem(request: ProblemRequest):
    """
    Solve a user's Windows problem using LLM and tool execution.
    Backend connects to user's device WebSocket server and executes tools.
    """
    try:
        # Get user's device
        if request.device_id:
            device = db.get_device(request.device_id)
        else:
            device = device_manager.get_user_primary_device(request.user_id)
        
        if not device:
            return ProblemResponse(
                success=False,
                error="No device found for user. Please register a device first."
            )
        
        device_id = device["id"]
        os_version = device.get("os_version", "").lower()
        is_ubuntu = "ubuntu" in os_version or "linux" in os_version
        is_windows = "windows" in os_version or "microsoft" in os_version
        
        print(f"Solving problem for device {device['device_name']} (ID: {device_id}, OS: {os_version})")
        
        # Use multi-agent system to create execution plan
        # Get role from request (default to ai_agent for backward compatibility)
        user_role = request.role or "ai_agent"
        print(f"[Multi-Agent System] Analyzing problem: {request.problem_description} (Role: {user_role})")
        
        try:
            # Determine platform info for agents
            platform_info = None
            if is_ubuntu:
                platform_info = "linux"
            elif is_windows:
                platform_info = "windows"
            
            tool_plan, agent_context = await agent_orchestrator.create_execution_plan(
                problem_description=request.problem_description,
                user_role=user_role,
                device_id=device_id,
                platform_info=platform_info
            )
        except ValueError as ve:
            # LLM configuration or API errors
            return ProblemResponse(
                success=False,
                error=f"LLM service error: {str(ve)}. Please check your API key configuration."
            )
        except Exception as e:
            # Other errors
            return ProblemResponse(
                success=False,
                error=f"Failed to generate execution plan: {str(e)}"
            )

        # Check if the plan is empty
        if not tool_plan:
            # Check if there were permission denials
            if agent_context.permission_denials:
                # Generate role-specific permission error message
                denied_tools = [denial['tool_name'] for denial in agent_context.permission_denials]
                required_roles = set([denial['required_role'] for denial in agent_context.permission_denials])

                # Format the list of denied tools
                tools_list = ", ".join(denied_tools[:3])  # Show first 3 tools
                if len(denied_tools) > 3:
                    tools_list += f", and {len(denied_tools) - 3} more"

                # Determine the role upgrade suggestion
                if "admin" in required_roles:
                    required_role_msg = "admin"
                elif "human_agent" in required_roles:
                    required_role_msg = "human_agent"
                else:
                    required_role_msg = "a higher privilege role"

                permission_error = (
                    f"❌ Permission Denied: You don't have permission to perform this action.\n\n"
                    f"Your current role '{user_role}' does not allow access to the following tools: {tools_list}.\n\n"
                    f"These tools require '{required_role_msg}' privileges.\n\n"
                    f"To perform this action, please:\n"
                    f"1. Contact your administrator to upgrade your role to '{required_role_msg}'\n"
                    f"2. Or request that an administrator or human agent performs this action for you"
                )

                return ProblemResponse(
                    success=False,
                    error=permission_error
                )
            else:
                # No permission denials, so it's an LLM/API issue
                return ProblemResponse(
                    success=False,
                    error="Could not generate tool execution plan. The LLM did not return any valid tools. Please check your API key and try again."
                )
        
        print(f"Generated tool plan with {len(tool_plan)} tools to execute")
        
        # Check if device is connected via reverse connection
        if not connection_registry.is_connected(device_id):
            # Fallback to old method if mcp_url exists (backward compatibility)
            mcp_url = device.get("mcp_url", "")
            if mcp_url:
                print(f"Device not connected via WebSocket, trying direct connection to {mcp_url}")
                connection = await ws_client.connect(mcp_url)
                if not connection:
                    return ProblemResponse(
                        success=False,
                        error=f"Device is not connected. Please ensure:\n1. The Windows MCP Agent is running\n2. The device has connected to the backend WebSocket endpoint\n3. Check device connection status"
                    )
                # Use old method with tool_plan already generated
                return await _solve_with_direct_connection(request, device, connection, tool_plan)
            else:
                return ProblemResponse(
                    success=False,
                    error=f"Device is not connected. The Windows MCP Agent must be running and connected to the backend. Device ID: {device_id}"
                )
        
        # Get connection from registry (device is already connected)
        print(f"Using existing connection for device {device_id}")
        
        # Execute tools using connection registry
        tools_executed = []
        solution_steps = []
        diagnostic_data = {}
        pending_commands = []  # Commands requiring consent for ai_agent
        
        for tool_call in tool_plan:
            try:
                tool_name = tool_call["name"]
                tool_args = tool_call.get("arguments", {})
                tool_role = tool_call.get("role", "ai_agent")
                tool_reason = tool_call.get("reason", "")
                tool_description = tool_call.get("description", tool_reason)
                
                # Map tool names based on platform
                original_tool_name = tool_name
                mapped_tool_name = _map_tool_name_for_platform(tool_name, is_ubuntu, is_windows)
                if mapped_tool_name != tool_name:
                    print(f"Mapping tool name: {tool_name} -> {mapped_tool_name} for platform")
                    tool_name = mapped_tool_name
                
                # Handle platform-specific argument transformations
                if is_ubuntu:
                    # For Ubuntu, immediate_restart/system_restart_no_delay should use restart_system with delay_seconds=0
                    if original_tool_name in ["immediate_restart", "system_restart_no_delay"]:
                        tool_args["delay_seconds"] = 0
                    elif tool_name == "restart_system" and "delay_seconds" not in tool_args:
                        # Default delay for restart_system if not specified
                        tool_args["delay_seconds"] = 60
                    # For execute_terminal_command on Ubuntu, ensure shell is Linux-compatible
                    elif tool_name == "execute_terminal_command" and "shell" in tool_args:
                        shell = tool_args["shell"]
                        if shell and shell.lower() in ["cmd", "powershell", "pwsh", "cmd.exe", "powershell.exe"]:
                            # Remove invalid Windows shell - let tool auto-detect Linux shell
                            print(f"Removing invalid Windows shell '{shell}' for Ubuntu device, will auto-detect Linux shell")
                            del tool_args["shell"]
                
                # Handle command consent for ai_agent execute_terminal_command
                if tool_name == "execute_terminal_command" and tool_role == "ai_agent":
                    # Require consent for ai_agent terminal commands
                    command_text = tool_args.get("command", "")
                    # Create a 2-line description if not provided
                    if not tool_description or len(tool_description.split('\n')) < 2:
                        if tool_description:
                            desc_lines = tool_description.split('\n')
                            if len(desc_lines) == 1:
                                tool_description = f"{tool_description}\nThis command will execute with regular user privileges (no admin elevation)."
                        else:
                            tool_description = f"Execute terminal command: {command_text}\nThis command will execute with regular user privileges (no admin elevation)."
                    
                    command_id = f"cmd_{int(datetime.now().timestamp())}_{len(pending_commands)}"
                    pending_commands.append({
                        "command_id": command_id,
                        "command": command_text,
                        "description": tool_description,
                        "arguments": tool_args,
                        "tool_name": tool_name
                    })
                    print(f"Command '{command_text}' requires user consent (ai_agent)")
                    continue  # Skip execution, wait for consent
                
                print(f"Executing tool: {tool_name} with args: {tool_args}")
                
                # Send tool call via connection registry
                call_id = f"call_{int(datetime.now().timestamp())}_{tool_name}"
                tool_call_message = {
                    "type": "tool_call",
                    "id": call_id,
                    "name": tool_name,
                    "arguments": tool_args,
                    "role": tool_role
                }

                print(f"[ToolExecution] Sending tool call {call_id} to device {device_id}")
                print(f"[ToolExecution] Tool: {tool_name}, Args: {tool_args}")

                # Send to device
                sent = await connection_registry.send_to_device(device_id, tool_call_message)
                if not sent:
                    raise Exception("Failed to send tool call to device")

                print(f"[ToolExecution] Waiting for result for call_id: {call_id} (timeout: 30s)")
                # Wait for response (with timeout)
                import asyncio
                result = await _wait_for_tool_result(device_id, call_id, timeout=30.0)
                print(f"[ToolExecution] Received result for call_id: {call_id}, status: {result.get('status')}")
                
                # Store the result
                tool_result = {
                    "tool": tool_name,
                    "arguments": tool_args,
                    "result": result,
                    "status": result.get("status", "unknown"),
                    "description": tool_description
                }
                tools_executed.append(tool_result)
                
                # Collect diagnostic data
                if result.get("status") == "success":
                    output = result.get("output", "")
                    diagnostic_data[tool_name] = output
                    solution_steps.append(f"✓ {tool_name}: {output[:100] if len(str(output)) > 100 else output}")
                    print(f"Tool {tool_name} succeeded: {output[:100]}")
                else:
                    error_msg = result.get("error", "Failed")
                    solution_steps.append(f"✗ {tool_name}: {error_msg}")
                    print(f"Tool {tool_name} failed: {error_msg}")

                    # INTELLIGENT RECOVERY: If list_files fails with "Directory does not exist", automatically search for it
                    if tool_name == "list_files" and "does not exist" in error_msg.lower():
                        directory_name = tool_args.get("directory", "")
                        if directory_name:
                            print(f"[IntelligentRecovery] Directory '{directory_name}' not found. Searching for it automatically...")
                            try:
                                # Automatically search for the directory using search_files
                                search_call_id = f"call_{int(datetime.now().timestamp())}_search_files_recovery"
                                search_tool_call = {
                                    "type": "tool_call",
                                    "id": search_call_id,
                                    "name": "search_files",
                                    "arguments": {
                                        "pattern": directory_name,
                                        "search_paths": [],  # Search all user directories
                                        "recursive": True
                                    },
                                    "role": tool_role
                                }

                                print(f"[IntelligentRecovery] Searching for '{directory_name}' folder...")
                                sent = await connection_registry.send_to_device(device_id, search_tool_call)
                                if sent:
                                    search_result = await _wait_for_tool_result(device_id, search_call_id, timeout=30.0)
                                    if search_result.get("status") == "success":
                                        search_output = search_result.get("output", "")
                                        print(f"[IntelligentRecovery] Search completed: {search_output[:200]}")

                                        # Parse search results to find the directory
                                        import json
                                        try:
                                            search_data = json.loads(search_output) if isinstance(search_output, str) else search_output

                                            # Check if we found the folder
                                            found_folders = []
                                            if isinstance(search_data, dict) and "files" in search_data:
                                                files = search_data["files"]
                                                # Look for directories with matching name
                                                for file_info in files:
                                                    if isinstance(file_info, dict):
                                                        file_path = file_info.get("path", "")
                                                        if directory_name.lower() in file_path.lower():
                                                            # Extract the directory path
                                                            import os
                                                            dir_path = os.path.dirname(file_path) if not file_info.get("is_directory") else file_path
                                                            if dir_path and directory_name.lower() in dir_path.lower():
                                                                found_folders.append(dir_path)

                                            if found_folders:
                                                # Found the folder! Now list files in it
                                                found_path = found_folders[0]  # Use first match
                                                print(f"[IntelligentRecovery] Found '{directory_name}' at: {found_path}")
                                                print(f"[IntelligentRecovery] Re-attempting list_files with correct path...")

                                                # Re-attempt list_files with found path
                                                retry_call_id = f"call_{int(datetime.now().timestamp())}_list_files_retry"
                                                retry_tool_call = {
                                                    "type": "tool_call",
                                                    "id": retry_call_id,
                                                    "name": "list_files",
                                                    "arguments": {
                                                        "directory": found_path,
                                                        "recursive": tool_args.get("recursive", True)
                                                    },
                                                    "role": tool_role
                                                }

                                                sent = await connection_registry.send_to_device(device_id, retry_tool_call)
                                                if sent:
                                                    retry_result = await _wait_for_tool_result(device_id, retry_call_id, timeout=30.0)
                                                    if retry_result.get("status") == "success":
                                                        # SUCCESS! Replace the failed result with successful one
                                                        print(f"[IntelligentRecovery] SUCCESS! Files listed in '{found_path}'")
                                                        retry_output = retry_result.get("output", "")
                                                        diagnostic_data[tool_name] = retry_output

                                                        # Update the tool_result to reflect success
                                                        tool_result["result"] = retry_result
                                                        tool_result["status"] = "success"

                                                        # Update solution steps
                                                        solution_steps[-1] = f"✓ {tool_name} (auto-recovered): Found '{directory_name}' and listed files successfully"
                                                        print(f"Tool {tool_name} auto-recovered successfully")
                                                    else:
                                                        print(f"[IntelligentRecovery] Retry failed: {retry_result.get('error')}")
                                                        # Add recovery attempt to solution steps
                                                        solution_steps.append(f"ℹ Attempted recovery: Searched for '{directory_name}' folder but list_files retry failed")
                                            else:
                                                print(f"[IntelligentRecovery] No matching folders found for '{directory_name}'")
                                                # Add recovery attempt to solution steps
                                                solution_steps.append(f"ℹ Searched for '{directory_name}' folder but no matches found on the system")
                                        except Exception as parse_error:
                                            print(f"[IntelligentRecovery] Error parsing search results: {parse_error}")
                                            # Add recovery attempt to solution steps
                                            solution_steps.append(f"ℹ Attempted to search for '{directory_name}' folder but encountered an error")
                                    else:
                                        print(f"[IntelligentRecovery] Search failed: {search_result.get('error')}")
                                        # Add recovery attempt to solution steps
                                        solution_steps.append(f"ℹ Attempted to search for '{directory_name}' folder but search failed")
                            except Exception as recovery_error:
                                print(f"[IntelligentRecovery] Recovery attempt failed: {recovery_error}")
                                # Add recovery attempt to solution steps
                                solution_steps.append(f"ℹ Attempted intelligent recovery but encountered an error")
                
            except Exception as e:
                error_msg = f"Exception executing {tool_call.get('name', 'unknown')}: {str(e)}"
                print(f"Error: {error_msg}")
                tools_executed.append({
                    "tool": tool_call.get("name", "unknown"),
                    "error": error_msg
                })
                solution_steps.append(f"✗ {tool_call.get('name', 'unknown')}: {error_msg}")
        
        # Detect authorization failures and escalation scenarios
        requires_escalation = False
        escalation_reason = ""
        for tool_exec in tools_executed:
            if tool_exec.get("status") != "success":
                error = tool_exec.get("error", "") or tool_exec.get("result", {}).get("error", "")
                if "not authorized" in error.lower() or "permission" in error.lower() or "requires elevated" in error.lower():
                    requires_escalation = True
                    escalation_reason = f"Action requires elevated privileges beyond AI agent capabilities"
                    break

        # Generate final solution summary
        print(f"Generating solution summary from {len(tools_executed)} tool executions...")
        final_solution = await llm_service.generate_solution_summary(
            problem=request.problem_description,
            tools_executed=tools_executed,
            solution_steps=solution_steps,
            pending_commands=pending_commands if pending_commands else None
        )

        print(f"Problem solving completed successfully")
        if pending_commands:
            print(f"Pending commands requiring consent: {len(pending_commands)}")
            # Update solution to mention pending commands
            if final_solution and not ("approval" in final_solution.lower() or "consent" in final_solution.lower() or "pending" in final_solution.lower()):
                final_solution += f"\n\nNote: {len(pending_commands)} command(s) require your approval before execution. Please review and approve them in the terminal."

        # Build response with escalation metadata
        response_data = {
            "success": True,
            "solution": final_solution,
            "tools_executed": tools_executed,
            "pending_commands": pending_commands if pending_commands else None
        }

        # Add escalation metadata if needed
        if requires_escalation:
            response_data["requires_escalation"] = True
            response_data["escalation_reason"] = escalation_reason
            response_data["escalation_options"] = [
                {
                    "id": "continue_chat",
                    "label": "Continue chatting with AI Agent",
                    "description": "Ask other questions or request tasks within AI agent capabilities"
                },
                {
                    "id": "transfer_human",
                    "label": "Transfer to Human Agent",
                    "description": "Connect with a human agent who has elevated privileges"
                }
            ]

        return ProblemResponse(**response_data)
    
    except Exception as e:
        return ProblemResponse(
            success=False,
            error=f"Problem solving failed: {str(e)}"
        )


@app.post("/api/command/execute")
async def execute_approved_command(request: Dict):
    """
    Execute an approved command (for ai_agent role after user consent).
    """
    try:
        command_id = request.get("command_id")
        user_id = request.get("user_id")
        device_id = request.get("device_id")
        command = request.get("command")
        arguments = request.get("arguments", {})
        
        if not command_id or not user_id or not device_id or not command:
            return {"success": False, "error": "Missing required parameters"}
        
        # Get device
        device = db.get_device(device_id)
        if not device:
            return {"success": False, "error": "Device not found"}
        
        if device.get("user_id") != user_id:
            return {"success": False, "error": "Device does not belong to user"}
        
        # Check if device is connected
        connection = connection_registry.get_connection(device_id)
        if not connection:
            return {"success": False, "error": "Device is not connected"}
        
        os_version = device.get("os_version", "").lower()
        is_ubuntu = "ubuntu" in os_version or "linux" in os_version
        
        # Prepare tool call
        tool_name = "execute_terminal_command"
        tool_args = arguments.copy()
        if "command" not in tool_args:
            tool_args["command"] = command
        
        # Handle platform-specific transformations
        if is_ubuntu and "shell" in tool_args:
            shell = tool_args["shell"]
            if shell and shell.lower() in ["cmd", "powershell", "pwsh", "cmd.exe", "powershell.exe"]:
                del tool_args["shell"]
        
        print(f"Executing approved command: {command}")
        
        # Send tool call via connection registry
        call_id = f"call_{int(datetime.now().timestamp())}_{tool_name}"
        tool_call_message = {
            "type": "tool_call",
            "id": call_id,
            "name": tool_name,
            "arguments": tool_args,
            "role": "ai_agent"  # Always ai_agent for consent-approved commands
        }
        
        # Send to device
        sent = await connection_registry.send_to_device(device_id, tool_call_message)
        if not sent:
            return {"success": False, "error": "Failed to send command to device"}
        
        # Wait for response (with timeout)
        result = await _wait_for_tool_result(device_id, call_id, timeout=30.0)

        # Generate summary of command output for user
        summary = None
        if result.get("status") == "success" and result.get("output"):
            try:
                # Get original problem description from request if available
                original_problem = request.get("problem_description", f"List files using command: {command}")

                summary = await llm_service.generate_solution_summary(
                    problem=original_problem,
                    tools_executed=[{
                        "tool": "execute_terminal_command",
                        "arguments": tool_args,
                        "result": result,
                        "status": result.get("status"),
                        "description": f"Executed command: {command}"
                    }],
                    solution_steps=[f"✓ execute_terminal_command: {result.get('output', '')[:200]}..."]
                )
            except Exception as e:
                print(f"Error generating command summary: {e}")
                summary = None

        return {
            "success": result.get("status") == "success",
            "command_id": command_id,
            "result": result,
            "output": result.get("output", ""),
            "error": result.get("error"),
            "summary": summary  # LLM-generated summary of the output
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/user/{user_id}/devices")
async def get_user_devices(user_id: str):
    """Get all devices registered for a user"""
    devices = db.get_user_devices(user_id)
    return {"devices": devices}


@app.websocket("/ws/device/{device_id}")
async def websocket_device_endpoint(websocket: WebSocket, device_id: str):
    """
    WebSocket endpoint for Windows devices to connect.
    Devices connect here and maintain persistent connection for receiving tool calls.
    """
    try:
        # Validate device registration before proceeding
        print(f"WebSocket connection attempt from device_id: {device_id}")
        device = db.get_device(device_id)
        
        if not device:
            print(f"WebSocket connection rejected: Device {device_id} not found in database")
            # For debugging: log that device was not found
            print(f"Device lookup failed for device_id: {device_id}")
            
            # In FastAPI, we need to accept before we can close
            await websocket.accept()
            await websocket.close(code=1008, reason="Device not registered")
            return
        
        # Accept the WebSocket connection (device is registered)
        await websocket.accept()
        print(f"Device {device_id} ({device.get('device_name', 'unknown')}) connected via WebSocket")
    except Exception as e:
        print(f"Error in WebSocket endpoint for device {device_id}: {e}")
        import traceback
        traceback.print_exc()
        # Try to accept and close gracefully
        try:
            await websocket.accept()
            await websocket.close(code=1011, reason=f"Server error: {str(e)}")
        except:
            pass
        return
    
    # Register connection in registry
    await connection_registry.register_connection(
        device_id=device_id,
        connection=websocket,
        user_id=device.get("user_id"),
        device_name=device.get("device_name")
    )
    
    try:
        # Listen for messages from device (tool results, heartbeats, etc.)
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types from device
                print(f"[WebSocket] Received message from {device_id}: {data[:200]}")  # Debug log
                if message.get("type") == "heartbeat":
                    # Device heartbeat - just acknowledge
                    await websocket.send_text(json.dumps({"type": "heartbeat_ack"}))
                    print(f"[WebSocket] Sent heartbeat_ack to {device_id}")
                elif message.get("type") == "tool_result":
                    # Tool result - notify waiting coroutine
                    call_id = message.get("id")
                    print(f"[WebSocket] Received tool_result from {device_id} for call_id: {call_id}")
                    if call_id:
                        await message_queue.set_result(call_id, message)
                        print(f"[WebSocket] Tool result delivered to message_queue for call {call_id}")
                    else:
                        print(f"[WebSocket] ERROR: tool_result message missing 'id' field")
                else:
                    print(f"[WebSocket] Unknown message type: {message.get('type')}")
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error handling message from {device_id}: {e}")
                break
                
    except Exception as e:
        print(f"WebSocket error for device {device_id}: {e}")
    finally:
        # Unregister connection when device disconnects
        await connection_registry.unregister_connection(device_id)
        print(f"Device {device_id} disconnected")


def _map_tool_name_for_platform(tool_name: str, is_ubuntu: bool, is_windows: bool) -> str:
    """
    Map tool names based on platform.
    Maps Windows-specific tool names to Ubuntu/Linux equivalents.
    """
    if is_ubuntu:
        # Map Windows tool names to Ubuntu tool names
        tool_name_mappings = {
            "check_event_logs_summary": "check_system_logs",
            "immediate_restart": "restart_system",  # Will be handled with delay_seconds=0
            "system_restart_no_delay": "restart_system",  # Will be handled with delay_seconds=0
            # Add more mappings as needed
        }
        return tool_name_mappings.get(tool_name, tool_name)
    elif is_windows:
        # Windows uses the tool names as-is from the registry
        return tool_name
    else:
        # Unknown platform, try original name
        return tool_name


async def _wait_for_tool_result(device_id: str, call_id: str, timeout: float = 30.0) -> dict:
    """Wait for tool result from device using message queue"""
    return await message_queue.wait_for_result(call_id, timeout)


async def _solve_with_direct_connection(
    request: ProblemRequest,
    device: dict,
    connection,
    tool_plan: List[Dict]
) -> ProblemResponse:
    """Fallback method using direct connection (old architecture)"""
    tools_executed = []
    solution_steps = []
    
    # Detect platform from device
    os_version = device.get("os_version", "").lower()
    is_ubuntu = "ubuntu" in os_version or "linux" in os_version
    is_windows = "windows" in os_version or "microsoft" in os_version
    
    for tool_call in tool_plan:
        try:
            # Map tool names based on platform
            tool_name = tool_call["name"]
            original_tool_name = tool_name
            mapped_tool_name = _map_tool_name_for_platform(tool_name, is_ubuntu, is_windows)
            if mapped_tool_name != tool_name:
                print(f"Mapping tool name: {tool_name} -> {mapped_tool_name} for platform")
                tool_name = mapped_tool_name
            
            # Handle platform-specific argument transformations
            tool_args = tool_call.get("arguments", {}).copy()
            if is_ubuntu:
                # For Ubuntu, immediate_restart/system_restart_no_delay should use restart_system with delay_seconds=0
                if original_tool_name in ["immediate_restart", "system_restart_no_delay"]:
                    tool_args["delay_seconds"] = 0
            
            result = await ws_client.send_tool_call(
                connection,
                tool_name=tool_name,
                arguments=tool_args,
                role=tool_call.get("role", "ai_agent")
            )
            tools_executed.append({
                "tool": tool_call["name"],
                "arguments": tool_call.get("arguments", {}),
                "result": result
            })
            if result.get("status") == "success":
                solution_steps.append(f"✓ {tool_call['name']}: {result.get('output', 'Completed')}")
            else:
                solution_steps.append(f"✗ {tool_call['name']}: {result.get('error', 'Failed')}")
        except Exception as e:
            tools_executed.append({
                "tool": tool_call["name"],
                "error": str(e)
            })
    
    final_solution = await llm_service.generate_solution_summary(
        problem=request.problem_description,
        tools_executed=tools_executed,
        solution_steps=solution_steps
    )
    
    await ws_client.disconnect(connection)
    
    return ProblemResponse(
        success=True,
        solution=final_solution,
        tools_executed=tools_executed
    )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    active_connections = len(connection_registry.get_all_connections())
    return {
        "status": "healthy",
        "database": "connected" if db.is_connected() else "disconnected",
        "active_device_connections": active_connections,
        "timestamp": datetime.now().isoformat()
    }


# TEST FEATURE: List all tools (can be disabled via ENABLE_TEST_FEATURES env var)
ENABLE_TEST_FEATURES = os.getenv("ENABLE_TEST_FEATURES", "false").lower() == "true"


@app.get("/api/tools/list-all")
async def list_all_tools():
    """
    TEST FEATURE: List all available tools regardless of role.
    This endpoint is only enabled when ENABLE_TEST_FEATURES=true in .env file.
    To disable: Set ENABLE_TEST_FEATURES=false or remove it from .env
    """
    if not ENABLE_TEST_FEATURES:
        raise HTTPException(
            status_code=403,
            detail="Test features are disabled. Set ENABLE_TEST_FEATURES=true in .env to enable."
        )
    
    all_tools = tool_registry.get_all_tools_dict()
    
    # Group by role and risk for better readability
    grouped = {
        "ai_agent": {
            "safe": [],
            "caution": [],
            "elevated": []
        },
        "human_agent": {
            "safe": [],
            "caution": [],
            "elevated": []
        },
        "admin": {
            "safe": [],
            "caution": [],
            "elevated": []
        }
    }
    
    for tool in all_tools:
        role = tool["min_role"]
        risk = tool["risk"]
        grouped[role][risk].append(tool)
    
    return {
        "enabled": True,
        "total_tools": len(all_tools),
        "tools_by_role": grouped,
        "all_tools": all_tools,
        "note": "This is a TEST FEATURE. Disable by setting ENABLE_TEST_FEATURES=false in .env"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)


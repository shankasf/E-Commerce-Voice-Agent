"""
LLM Service - Uses Mistral AI, OpenAI, or compatible API to analyze problems and plan tool execution
"""

import os
from typing import List, Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv
from utils.api_key_validator import load_api_key_from_env, validate_and_fix_api_key

load_dotenv(override=True)


class LLMService:
    def __init__(self):
        # Check for OpenAI first (preferred) - with proper validation
        openai_api_key, openai_valid = load_api_key_from_env("OPENAI_API_KEY", "openai")
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4").strip()

        # Fallback to Mistral AI
        mistral_api_key, mistral_valid = load_api_key_from_env("MISTRAL_API_KEY", "mistral")
        mistral_base_url = os.getenv("MISTRAL_API_URL", "https://api.mistral.ai/v1").strip()
        mistral_model = os.getenv("MISTRAL_MODEL", "mistral-large-latest").strip()

        # Streaming configuration
        self.enable_streaming = os.getenv("ENABLE_STREAMING", "true").lower() == "true"
        
        if openai_valid and openai_api_key:
            try:
                # Use OpenAI - with validated key
                self.client = OpenAI(api_key=openai_api_key)
                self.model = openai_model
                self.provider = "openai"
                streaming_status = "enabled" if self.enable_streaming else "disabled"
                print(f"✓ LLM Service: Using OpenAI with model {openai_model} (streaming: {streaming_status})")
                print(f"  API key validated (length: {len(openai_api_key)}, starts with: {openai_api_key[:7]}...)")
            except Exception as e:
                raise RuntimeError(f"Failed to initialize OpenAI client: {e}. Please check your OPENAI_API_KEY configuration.")
        elif mistral_valid and mistral_api_key:
            try:
                # Use Mistral AI
                self.client = OpenAI(
                    api_key=mistral_api_key,
                    base_url=mistral_base_url
                )
                self.model = mistral_model
                self.provider = "mistral"
                streaming_status = "enabled" if self.enable_streaming else "disabled"
                print(f"✓ LLM Service: Using Mistral AI with model {mistral_model} (streaming: {streaming_status})")
            except Exception as e:
                raise RuntimeError(f"Failed to initialize Mistral client: {e}. Please check your MISTRAL_API_KEY configuration.")
        else:
            # Production mode: require valid API key
            raise RuntimeError(
                "LLM Service: No valid API key found. Production mode requires a valid API key.\n"
                "  To configure:\n"
                "  1. Set OPENAI_API_KEY in .env file (preferred)\n"
                "  2. Or set MISTRAL_API_KEY in .env file\n"
                "  3. Ensure the key is valid and active"
            )
    
    async def analyze_problem_and_plan_tools(
        self,
        problem_description: str,
        user_role: str = "ai_agent",
        stream: bool = None
    ) -> List[Dict]:
        """
        Analyze user's problem and create a plan of tools to execute.
        Uses strong prompting to ensure safe and effective tool selection.

        Args:
            problem_description: The user's problem description
            user_role: The user's role (ai_agent, human_agent, admin)
            stream: If True, uses streaming API. If None, uses ENABLE_STREAMING config (default: None)
        """

        system_prompt = """You are an expert Windows IT support assistant with access to diagnostic and remediation tools.

Your goal is to analyze user problems and create a safe, step-by-step plan to resolve them using available Windows tools.

AVAILABLE TOOLS (by role):

AI_AGENT (Safe - Auto-approved):
- check_cpu_usage: Check CPU utilization
- check_memory_usage: Check memory usage
- check_disk_usage: Check disk space
- check_system_uptime: Check system uptime
- check_event_logs_summary: Summary of event logs (last 24h)
- check_network_status: Check network interface status
- search_files: Search for files across user directories (e.g., find all Excel files, search for PDFs)
- list_files: List files in a specific directory with optional pattern filtering
- restart the system: Restart the system

AI_AGENT (Caution - Temporary disruption):
- flush_dns_cache: Flush DNS cache
- renew_ip_address: Renew IP address
- reset_network_stack: Reset network stack (requires admin)
- restart_whitelisted_service: Restart safe services (Spooler, Themes, AudioSrv, BITS, WSearch)
- clear_windows_temp: Clear Windows temp files
- clear_user_temp: Clear user temp files

HUMAN_AGENT (Additional tools):
- restart_any_service: Restart any whitelisted service
- restart_application: Restart an application by process name
- network_adapter_reset: Reset network adapter
- windows_update_repair: Repair Windows Update components

ADMIN (Elevated tools):
- registry_fix: Fix registry issues (whitelisted keys only)
- firewall_rule_repair: Repair firewall rules

RULES:
1. Always start with SAFE diagnostic tools to understand the problem
2. Only use CAUTION tools if necessary and after diagnostics
3. Never suggest tools that require higher role than available
4. Create a logical sequence: diagnose → identify issue → remediate → verify
5. Be specific with tool arguments
6. Consider user impact - prefer non-disruptive solutions first

Return a JSON array of tool calls in this format:
[
  {
    "name": "tool_name",
    "arguments": {"arg1": "value1"},
    "role": "ai_agent",
    "reason": "Why this tool is needed"
  }
]"""

        user_prompt = f"""User Problem: {problem_description}

Current Role: {user_role}

Analyze this problem and create a step-by-step tool execution plan. Start with diagnostics, then remediation if needed.

Return ONLY a valid JSON array of tool calls, no other text."""

        if not self.client:
            raise RuntimeError("LLM client not initialized. Please check your API key configuration.")

        # Use config value if stream parameter not explicitly provided
        use_streaming = stream if stream is not None else self.enable_streaming

        try:
            if use_streaming:
                # Use OpenAI Responses API with streaming
                stream_response = self.client.responses.create(
                    model=self.model,
                    instructions=system_prompt,
                    input=user_prompt,
                    temperature=0.3,
                    stream=True
                )

                # Collect streamed content from events
                content = ""
                # Check if stream_response is actually iterable (not bool/int/str/etc)
                try:
                    # Try to iterate - this will fail immediately if not iterable
                    iter(stream_response)
                    is_iterable = True
                except TypeError:
                    is_iterable = False

                if not is_iterable or isinstance(stream_response, (bool, str, int, float)):
                    print(f"[LLM] Warning: stream_response is not iterable or is primitive type (type: {type(stream_response)}), falling back to non-streaming")
                    # Fallback: try non-streaming
                    response = self.client.responses.create(
                        model=self.model,
                        instructions=system_prompt,
                        input=user_prompt,
                        temperature=0.3
                    )
                    content = response.output_text
                else:
                    try:
                        for event in stream_response:
                            # Handle different event types
                            if hasattr(event, 'type'):
                                if event.type == 'response.output_text.delta':
                                    # Accumulate text deltas
                                    if hasattr(event, 'delta') and event.delta:
                                        content += event.delta
                                elif event.type == 'response.output_text.done':
                                    # Final text is available
                                    if hasattr(event, 'output_text') and event.output_text:
                                        content = event.output_text
                                        break
                    except TypeError as e:
                        print(f"[LLM] Error iterating stream_response: {e}, falling back to non-streaming")
                        # Fallback: try non-streaming
                        response = self.client.responses.create(
                            model=self.model,
                            instructions=system_prompt,
                            input=user_prompt,
                            temperature=0.3
                        )
                        content = response.output_text
            else:
                # Use OpenAI Responses API without streaming
                response = self.client.responses.create(
                    model=self.model,
                    instructions=system_prompt,
                    input=user_prompt,
                    temperature=0.3
                )

                # Access the output text from response
                content = response.output_text

            # Parse response
            import json

            # Try to parse as JSON
            try:
                result = json.loads(content)

                # Extract tool calls array
                if isinstance(result, dict) and "tools" in result:
                    return result["tools"]
                elif isinstance(result, list):
                    return result
                elif isinstance(result, dict):
                    # If it's a dict with tool info, wrap it
                    return [result]
                else:
                    return []
            except json.JSONDecodeError:
                # If not valid JSON, try to extract JSON from text
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                    return result if isinstance(result, list) else []
                return []

        except Exception as e:
            error_msg = str(e)
            # Provide more helpful error messages
            if "401" in error_msg or "invalid_api_key" in error_msg.lower() or "unauthorized" in error_msg.lower():
                print(f"LLM Error: Invalid API key for {self.provider}.")
                print(f"  - Check that your {self.provider.upper()}_API_KEY in .env file is correct")
                print(f"  - Ensure there are no extra spaces or quotes around the key")
                print(f"  - Verify the key is active at https://platform.openai.com/account/api-keys" if self.provider == "openai" else "")
                print(f"  - Current key format: {self.client.api_key[:10]}..." if hasattr(self.client, 'api_key') else "")
            elif "429" in error_msg or "rate_limit" in error_msg.lower():
                print(f"LLM Error: Rate limit exceeded for {self.provider}. Please try again later.")
            else:
                print(f"LLM Error ({self.provider}): {e}")
            # Re-raise in production - no mock fallback
            raise
    
    async def generate_solution_summary(
        self,
        problem: str,
        tools_executed: List[Dict],
        solution_steps: List[str],
        pending_commands: Optional[List[Dict]] = None,
        stream: bool = None
    ) -> str:
        """
        Generate a human-readable solution summary

        Args:
            problem: The original problem description
            tools_executed: List of tools that were executed
            solution_steps: List of solution steps
            pending_commands: Optional list of pending commands
            stream: If True, uses streaming API. If None, uses ENABLE_STREAMING config (default: None)
        """
        
        system_prompt = """You are a helpful IT support assistant. Summarize the problem resolution in clear, user-friendly language.

IMPORTANT OUTPUT FORMATTING RULES:
- Do NOT use markdown formatting (no **, ##, #, *, etc.)
- Use plain text only
- Use simple line breaks and spacing for readability
- Do NOT use bold, italic, or heading markers
- Write in a natural, conversational tone
- Use simple formatting like "Problem:" instead of "## Problem" or "**Problem**"
- Keep the output clean and readable without markdown syntax

CRITICAL CONTEXT AWARENESS:
- If disk usage output mentions "WSL" or "Windows Subsystem for Linux", clarify that this is the WSL virtual disk space, NOT the Windows host disk space
- WSL virtual disks can show different capacity than the actual Windows physical disk
- When reporting disk usage for WSL environments, always mention this distinction
- Be accurate - do not claim it's the physical disk if it's clearly a WSL virtual disk
- If there are pending commands requiring user approval, DO NOT claim they were executed. State that they require user approval.

FILE LISTING INSTRUCTIONS:
- When list_files or search_files tool output is provided, parse the JSON results and present files in a user-friendly format
- Group files by directory/folder
- Mention file types (PDFs, documents, images, etc.) in natural language
- Highlight notable files (large files, important documents)
- Use natural language like "You have 5 PDF documents in the Car_Documents folder" instead of showing raw JSON
- Make it conversational and easy to understand
- Example: "I found 12 files organized in 4 folders: Assessments contains a Python script, AWS_Learnings has HTML and JSON files, Car_Documents has 5 PDF documents (ID cards and vehicle letters), and UPSC PYQS contains a large 12.7 MB PDF file with previous year questions and a JSON dataset."

INTELLIGENT RECOVERY ACKNOWLEDGMENT:
- If solution steps mention "auto-recovered" or "Intelligent Recovery", acknowledge that the system automatically resolved the issue
- Example: "Initially, the folder wasn't found in the expected location, but I automatically searched your system and found it at [path]. I then successfully listed all files."
- Make it conversational and show that the AI proactively solved the problem

AUTHORIZATION & ESCALATION HANDLING:
- If tools failed due to insufficient permissions (e.g., "AI Agent is not authorized"), clearly explain:
  1. What the user requested
  2. Why the AI agent cannot perform this action (security/permission level)
  3. Provide two clear options:
     a) Continue with other questions or tasks within AI agent capabilities
     b) Transfer to a human agent who has elevated privileges
- Be conversational and helpful, not apologetic
- Example: "This action requires elevated privileges that I don't have as an AI agent. You can either continue chatting with me about other topics, or I can transfer you to a human agent who can help with this request."
- DO NOT automatically transfer - always give the user choice
"""

        pending_info = ""
        if pending_commands:
            pending_info = f"\n\nPending Commands (Requiring User Approval):\n{chr(10).join([f"- {cmd.get('command', 'unknown')}" for cmd in pending_commands])}\n\nIMPORTANT: These commands have NOT been executed yet. They require user approval before execution. Do NOT claim they were executed in your summary."

        user_prompt = f"""Problem: {problem}

Tools Executed:
{chr(10).join([f"- {tool.get('tool', 'unknown')}: {tool.get('result', {}).get('output', 'N/A')}" for tool in tools_executed])}

Solution Steps:
{chr(10).join(solution_steps)}{pending_info}

Create a clear, concise summary explaining:
1. What the problem was
2. What diagnostic steps were taken (if any)
3. What actions were performed (ONLY include tools that were actually executed)
4. Current status and recommendations
5. If there are pending commands, mention that they require user approval before execution

CRITICAL: 
- Only mention actions that were ACTUALLY executed (listed in Tools Executed)
- If there are pending commands, clearly state they require user approval and have NOT been executed yet
- Do NOT claim pending commands were executed

IMPORTANT CONTEXT:
- If disk usage information shows WSL (Windows Subsystem for Linux), clearly state that this is WSL virtual disk usage, NOT Windows host disk usage
- The WSL virtual disk capacity may differ from the actual Windows physical disk capacity
- Always be accurate about what is being measured

IMPORTANT: Write in plain text only. Do NOT use markdown formatting (no **, ##, #, *, etc.). Use simple text formatting only."""

        if not self.client:
            raise RuntimeError("LLM client not initialized. Please check your API key configuration.")

        # Use config value if stream parameter not explicitly provided
        use_streaming = stream if stream is not None else self.enable_streaming

        try:
            if use_streaming:
                # Use OpenAI Responses API with streaming
                stream_response = self.client.responses.create(
                    model=self.model,
                    instructions=system_prompt,
                    input=user_prompt,
                    temperature=0.7,
                    stream=True
                )

                # Collect streamed content from events
                content = ""
                # Check if stream_response is actually iterable (not bool/int/str/etc)
                try:
                    # Try to iterate - this will fail immediately if not iterable
                    iter(stream_response)
                    is_iterable = True
                except TypeError:
                    is_iterable = False

                if not is_iterable or isinstance(stream_response, (bool, str, int, float)):
                    print(f"[LLM] Warning: stream_response is not iterable or is primitive type (type: {type(stream_response)}), falling back to non-streaming")
                    # Fallback: try non-streaming
                    response = self.client.responses.create(
                        model=self.model,
                        instructions=system_prompt,
                        input=user_prompt,
                        temperature=0.7
                    )
                    content = response.output_text
                else:
                    try:
                        for event in stream_response:
                            # Handle different event types
                            if hasattr(event, 'type'):
                                if event.type == 'response.output_text.delta':
                                    # Accumulate text deltas
                                    if hasattr(event, 'delta') and event.delta:
                                        content += event.delta
                                elif event.type == 'response.output_text.done':
                                    # Final text is available
                                    if hasattr(event, 'output_text') and event.output_text:
                                        content = event.output_text
                                        break
                    except TypeError as e:
                        print(f"[LLM] Error iterating stream_response: {e}, falling back to non-streaming")
                        # Fallback: try non-streaming
                        response = self.client.responses.create(
                            model=self.model,
                            instructions=system_prompt,
                            input=user_prompt,
                            temperature=0.7
                        )
                        content = response.output_text
            else:
                # Use OpenAI Responses API without streaming
                response = self.client.responses.create(
                    model=self.model,
                    instructions=system_prompt,
                    input=user_prompt,
                    temperature=0.7
                )

                # Access the output text from response
                content = response.output_text
            
            # Post-process to remove any markdown formatting that might have slipped through
            # Remove markdown headers
            import re
            content = re.sub(r'^#+\s*', '', content, flags=re.MULTILINE)
            # Remove markdown bold/italic
            content = re.sub(r'\*\*([^*]+)\*\*', r'\1', content)
            content = re.sub(r'\*([^*]+)\*', r'\1', content)
            # Remove markdown code blocks (keep the content)
            content = re.sub(r'```[a-z]*\n?', '', content)
            content = re.sub(r'`([^`]+)`', r'\1', content)
            
            return content
        
        except Exception as e:
            error_msg = str(e)
            print(f"[LLM] Exception in generate_solution_summary: {type(e).__name__}: {error_msg}")
            import traceback
            traceback.print_exc()

            # Provide more helpful error messages
            if "401" in error_msg or "invalid_api_key" in error_msg.lower() or "unauthorized" in error_msg.lower():
                print(f"LLM Error: Invalid API key for {self.provider}.")
                print(f"  - Check that your {self.provider.upper()}_API_KEY in .env file is correct")
                print(f"  - Ensure there are no extra spaces or quotes around the key")
                print(f"  - Verify the key is active at https://platform.openai.com/account/api-keys" if self.provider == "openai" else "")
            elif "429" in error_msg or "rate_limit" in error_msg.lower():
                print(f"LLM Error: Rate limit exceeded for {self.provider}. Please try again later.")
            else:
                print(f"LLM Error ({self.provider}): {e}")
            # Re-raise in production - no mock fallback
            raise


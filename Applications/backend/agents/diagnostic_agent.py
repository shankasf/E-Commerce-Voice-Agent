"""
Diagnostic Agent - Specialized in analyzing problems and gathering diagnostic data
"""

from typing import List, Dict
from .base_agent import BaseAgent, AgentContext
from .tool_registry import ToolRegistry


class DiagnosticAgent(BaseAgent):
    """
    Diagnostic Agent focuses on understanding the problem through safe diagnostic tools.
    """
    
    def __init__(self, llm_service, tool_registry: ToolRegistry):
        super().__init__("DiagnosticAgent", llm_service, tool_registry)
        self.tool_registry = tool_registry
    
    async def analyze(self, context: AgentContext) -> List[Dict]:
        """
        Analyze the problem and create a diagnostic plan.
        Focuses on SAFE tools to gather information.
        """
        available_tools = self.get_available_tools(context.user_role)
        tools_description = self.tool_registry.format_tools_for_prompt(context.user_role)
        
        system_prompt = f"""You are a Diagnostic Agent specialized in analyzing system problems and understanding user intent intelligently.

Your role is to:
1. Understand what the user is asking for - be intelligent about interpreting requests
2. Select appropriate SAFE diagnostic tools that gather information without modifying the system
3. Balance being efficient while being comprehensive when needed
4. Recognize different types of requests and respond appropriately

AVAILABLE DIAGNOSTIC TOOLS (SAFE - Read-only, informational):
{tools_description}

IMPORTANT: You can ONLY use the SAFE tools listed above. These tools gather information without making system changes.
For action requests (restart, flush, clear, etc.), return [] - those will be handled by another agent.

CRITICAL INTENT RECOGNITION RULES:

HEALTH CHECK REQUESTS (RUN COMPREHENSIVE DIAGNOSTICS):
- "check health", "device health", "system health", "assess health", "health check", "overall health"
- "how is my system", "how is my device", "system status", "device status"
- "check everything", "full system check", "complete health assessment"
- These requests explicitly ask for comprehensive assessment → Use: check_cpu_usage, check_memory_usage, check_disk_usage, check_system_uptime, check_event_logs_summary (or check_system_logs on Linux)

SPECIFIC REQUESTS (USE TARGETED DIAGNOSTICS):
- "check my IP" / "what's my IP" → check_ip_address only
- "check network" / "network status" → check_network_status only
- "check disk space" / "disk usage" → check_disk_usage only
- "check CPU" / "CPU usage" → check_cpu_usage only
- "check memory" / "memory usage" → check_memory_usage only
- "check logs" / "system logs" → check_event_logs_summary (or check_system_logs on Linux) only
- "system uptime" / "how long running" → check_system_uptime only

ACTION REQUESTS (NO DIAGNOSTICS NEEDED):
- "restart [application]" → Return [] (no diagnostics, action only)
- "restart system" / "reboot" → Return [] (no diagnostics, action only)
- "flush DNS" / "renew IP" → Return [] (these are actions, not diagnostics)

INFORMATIONAL QUERIES (USE APPROPRIATE TOOLS):
- For queries like "list applications", "show processes", "list services", "show network connections":
  * AI_AGENT: Return [] (these will be handled by remediation agent if needed, but typically not available)
  * HUMAN_AGENT/ADMIN: Can use execute_terminal_command in remediation agent, so return [] here
- Standard diagnostic queries ("check CPU", "check memory", etc.) → Use appropriate check_* tools

FILE SEARCH/LIST REQUESTS (USE FILE TOOLS):
- "find files", "search for files", "locate files", "show me files" → Use search_files
- "find all Excel files", "search for PDFs", "locate images" → Use search_files with category
- "list files in [directory]", "show files in [folder]" → Use list_files
- "show all files in Music", "list Downloads folder" → Use list_files

IMPORTANT - Folder Name Resolution (Dynamic):
- Use ANY folder name the user mentions - the Windows app will automatically find it
- The app searches: user profile, common locations, and subdirectories (depth 2)
- Works with ANY folder: "Music", "MyProjects", "WorkFiles", "Photos", custom folders, etc.
- DON'T try to construct full paths - just use the folder name as-is
- For listing "all files" in a folder, ALWAYS use recursive=true to include subdirectories
- Examples:
  * "show me all files in Music folder" → list_files(directory="Music", recursive=true)
  * "list files in MyProjects" → list_files(directory="MyProjects", recursive=true)
  * "find Excel files in WorkDocs" → search_files(pattern="*.xlsx", search_paths=["WorkDocs"])
  * "list Downloads" → list_files(directory="Downloads", recursive=true)
  * User can say ANY folder name - the app will find it automatically

PERFORMANCE/ISSUE REQUESTS (USE RELEVANT DIAGNOSTICS):
- "system is slow" → check_cpu_usage AND check_memory_usage (both needed to diagnose slowness)
- "running out of space" / "disk full" → check_disk_usage
- "network not working" / "can't connect" → check_network_status
- "errors" / "problems" / "issues" → check_event_logs_summary (or check_system_logs) AND relevant resource checks

INTELLIGENT INTERPRETATION:
- Think about what the user actually wants to know
- Health/status/assessment requests = comprehensive diagnostics
- Specific queries = targeted diagnostics
- Action requests = no diagnostics
- Be helpful and thorough when health assessment is requested
- Be precise and efficient for specific queries

EXAMPLES:
- User: "check the whole health of my device" → [check_cpu_usage, check_memory_usage, check_disk_usage, check_system_uptime, check_event_logs_summary]
- User: "assess my device health" → [check_cpu_usage, check_memory_usage, check_disk_usage, check_system_uptime, check_event_logs_summary]
- User: "how is my system" → [check_cpu_usage, check_memory_usage, check_disk_usage, check_system_uptime, check_event_logs_summary]
- User: "restart chrome" → [] (action request, no diagnostics)
- User: "check my IP address" → [check_ip_address] (specific query)
- User: "system is slow" → [check_cpu_usage, check_memory_usage] (performance issue needs both)
- User: "disk full" → [check_disk_usage] (specific issue)
- User: "network not working" → [check_network_status] (specific issue)
- User: "show me all files in Music folder" → [list_files] with directory argument
- User: "find all Excel files" → [search_files] with category="excel"
- User: "search for PDFs in Documents" → [search_files] with pattern="*.pdf"

Return ONLY a JSON array of tool calls. Return empty array [] ONLY for action requests."""
        
        user_prompt = f"""User Request: {context.problem_description}

Current Role: {context.user_role}

Analyze this request and determine what diagnostics are needed.

KEY QUESTIONS TO ASK YOURSELF:
1. Is this a health/status/assessment request? → Use comprehensive diagnostics (CPU, memory, disk, uptime, logs)
2. Is this a specific query? → Use the specific relevant tool only
3. Is this an action request? → Return [] (empty array, no diagnostics needed)
4. Is this a performance/issue report? → Use relevant diagnostics to diagnose the issue

INTENT RECOGNITION:
- Health/assessment keywords: "health", "status", "assess", "check overall", "how is", "everything", "complete"
- Action keywords: "restart", "reboot", "flush", "renew", "reset" (when not asking for info)
- Specific keywords: "IP", "disk", "CPU", "memory", "network", "logs", "uptime"

Be intelligent and helpful - understand what the user actually wants to know.

Return ONLY a valid JSON array of tool calls.
Format:
[
  {{
    "name": "tool_name",
    "arguments": {{}},
    "role": "{context.user_role}",
    "reason": "Why this diagnostic is needed based on user's request"
  }}
]

If this is an action request (like restart), return [] (empty array)."""
        
        if not self.llm_service.client:
            raise RuntimeError("LLM client not initialized. Please check your API key configuration.")
        
        try:
            # Use OpenAI Responses API with streaming for better responsiveness
            stream_response = self.llm_service.client.responses.create(
                model=self.llm_service.model,
                instructions=system_prompt,
                input=user_prompt,
                temperature=0.1,  # Very low temperature for maximum consistency, correctness, and precision
                stream=True
            )

            # Collect streamed content from events
            content = ""
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

            import json
            content = content.strip()
            
            # Parse JSON response
            try:
                result = json.loads(content)
                
                # Handle different response formats
                if isinstance(result, list):
                    tool_plan = result
                elif isinstance(result, dict):
                    if "tools" in result:
                        tool_plan = result["tools"]
                    elif "tool_calls" in result:
                        tool_plan = result["tool_calls"]
                    elif "plan" in result:
                        tool_plan = result["plan"]
                    elif "name" in result:
                        tool_plan = [result]
                    else:
                        tool_plan = []
                else:
                    tool_plan = []
                
                # Validate tools are safe diagnostic tools (dynamic based on metadata)
                # Let validate_tool_plan handle the role/permission checking
                # We just need to filter out non-diagnostic tools (CAUTION/ELEVATED risk)
                safe_diagnostic_tools = set(self.get_available_tools(context.user_role))

                validated = []
                for tool_call in tool_plan:
                    tool_name = tool_call.get("name", "")
                    if not tool_name:
                        print(f"Warning: Diagnostic agent found tool call without name: {tool_call}")
                        continue
                    if tool_name in safe_diagnostic_tools:
                        validated.append(tool_call)
                    else:
                        print(f"Warning: Diagnostic agent skipping non-diagnostic tool: {tool_name}")

                validated_plan = self.validate_tool_plan(validated, context.user_role, context)
                print(f"Diagnostic Agent: Parsed {len(tool_plan)} tools, validated {len(validated_plan)} tools")
                return validated_plan
                
            except json.JSONDecodeError as json_err:
                # Try to extract JSON from markdown code blocks or text
                import re
                
                # Get safe diagnostic tools dynamically
                safe_diagnostic_tools = set(self.get_available_tools(context.user_role))

                # Try to find JSON in code blocks
                json_block_match = re.search(r'```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```', content, re.DOTALL)
                if json_block_match:
                    try:
                        result = json.loads(json_block_match.group(1))
                        if isinstance(result, list):
                            validated = [t for t in result if t.get("name", "") in safe_diagnostic_tools]
                            return self.validate_tool_plan(validated, context.user_role, context)
                    except:
                        pass

                # Try to find JSON array or object in the text
                json_match = re.search(r'(\[.*?\]|\{.*?\})', content, re.DOTALL)
                if json_match:
                    try:
                        result = json.loads(json_match.group(1))
                        if isinstance(result, list):
                            validated = [t for t in result if t.get("name", "") in safe_diagnostic_tools]
                            return self.validate_tool_plan(validated, context.user_role, context)
                    except:
                        pass
                
                print(f"Diagnostic Agent JSON Parse Error: {json_err}")
                print(f"  LLM Response (full): {content}")
                print(f"  User Request: {context.problem_description}")
                raise ValueError(f"Failed to parse Diagnostic Agent LLM response as JSON. Response: {content[:200]}...")
        
        except Exception as e:
            error_msg = str(e)
            print(f"Diagnostic Agent Error: {error_msg}")
            
            # Check if it's an API key issue
            if "401" in error_msg or "invalid_api_key" in error_msg.lower() or "unauthorized" in error_msg.lower():
                raise ValueError(f"LLM API authentication failed. Please check your API key configuration.")
            elif "429" in error_msg or "rate_limit" in error_msg.lower():
                raise ValueError(f"LLM API rate limit exceeded. Please try again later.")
            else:
                # Re-raise to surface the actual error
                raise
    
    
    def get_available_tools(self, role: str) -> List[str]:
        """
        Get diagnostic tools dynamically based on tool metadata.
        Returns all SAFE risk tools that don't require user notice.
        This is dynamic - works with any safe diagnostic tool you add to the registry.
        """
        return self.tool_registry.get_safe_diagnostic_tools(role)


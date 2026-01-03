"""
Remediation Agent - Specialized in executing remediation actions based on diagnostic data
"""

from typing import List, Dict
from .base_agent import BaseAgent, AgentContext
from .tool_registry import ToolRegistry


class RemediationAgent(BaseAgent):
    """
    Remediation Agent focuses on executing actions to fix problems.
    Uses diagnostic data to make informed decisions.
    """
    
    def __init__(self, llm_service, tool_registry: ToolRegistry):
        super().__init__("RemediationAgent", llm_service, tool_registry)
        self.tool_registry = tool_registry
    
    async def analyze(self, context: AgentContext) -> List[Dict]:
        """
        Analyze diagnostic data and create a remediation plan.
        """
        available_tools = self.get_available_tools(context.user_role)
        tools_description = self.tool_registry.format_tools_for_prompt(context.user_role)
        
        # Format diagnostic data for context
        diagnostic_summary = "\n".join([
            f"- {tool}: {data}" for tool, data in context.diagnostic_data.items()
        ]) if context.diagnostic_data else "No diagnostic data available yet."
        
        system_prompt = f"""You are a Remediation Agent specialized in fixing Windows system problems.

Your role is to:
1. Analyze diagnostic data to identify the root cause
2. Select appropriate remediation tools to fix the problem
3. Create an action plan based on the user's request and diagnostic findings
4. Intelligently handle edge cases and variations in user language

AVAILABLE TOOLS:
{tools_description}

DIAGNOSTIC DATA:
{diagnostic_summary}

CRITICAL: restart_application Tool - Intelligent Process Name Extraction

When the user requests to restart an application, you MUST intelligently extract the correct Windows process name from their natural language request.

PROCESS NAME MAPPING GUIDE (Common Applications):
- Chrome/Google Chrome/Chrome Browser → "chrome"
- Microsoft Edge/Edge Browser → "msedge"
- Firefox/Mozilla Firefox → "firefox"
- Notepad → "notepad"
- Word/Microsoft Word → "winword"
- Excel/Microsoft Excel → "excel"
- PowerPoint/Microsoft PowerPoint → "powerpnt"
- Outlook/Microsoft Outlook → "outlook"
- Teams/Microsoft Teams → "teams"
- Visual Studio Code/VSCode → "code"
- Visual Studio → "devenv"
- Windows Explorer/File Explorer → "explorer"
- Task Manager → "taskmgr"
- Calculator → "calculator"
- Paint → "mspaint"
- Command Prompt/CMD → "cmd"
- PowerShell → "powershell"
- Windows Terminal → "WindowsTerminal"
- Spotify → "Spotify"
- Discord → "Discord"
- Zoom → "Zoom"
- Adobe Acrobat/Reader → "AcroRd32" or "Acrobat"
- Adobe Photoshop → "Photoshop"
- Steam → "steam"

EDGE CASE HANDLING RULES:

1. PROCESS NAME EXTRACTION:
   - Remove common words: "restart", "restarting", "restart the", "please", "can you", "could you"
   - Remove file extensions if present: ".exe" should be stripped
   - Convert to lowercase for matching
   - Handle brand names: "Google Chrome" → "chrome", "Microsoft Edge" → "msedge"
   - Handle abbreviations: "VS Code" → "code", "VS" → "devenv" (if Visual Studio context)
   - If user says "browser" without specifying, check diagnostic data for running browsers, or use "chrome" as default
   - If user says "my application" or "the app", look for context clues in the conversation

2. MULTIPLE VARIATIONS:
   - "restart chrome" → "chrome"
   - "restart Google Chrome" → "chrome"
   - "restart Chrome browser" → "chrome"
   - "chrome needs restarting" → "chrome"
   - "please restart chrome.exe" → "chrome" (remove .exe)
   - "can you restart the chrome browser" → "chrome"
   - "restarting chrome" → "chrome"

3. FALLBACK STRATEGIES:
   - If process name is ambiguous, use the most common Windows process name
   - If user mentions an application you don't recognize, extract the core name and remove common words
   - For unknown applications, use the exact name provided (user may know their process name)

4. APPLICATION STATE HANDLING:
   - If diagnostic data shows the application is not running, still attempt restart (it will start the application)
   - If multiple instances exist, restart_application will handle all instances
   - System processes (like "winlogon", "csrss", "lsass") should NOT be restarted - these are critical system processes
   - If user requests to restart a system process, suggest alternative solutions or escalate

5. INTELLIGENT WIRING:
   - If user says "restart chrome" but diagnostic shows Chrome is not running, still use restart_application (it will start Chrome)
   - If user says "restart my browser" without specifying, check diagnostic data for running browsers first
   - If user says "restart the application" or "restart it", look for context in previous messages or diagnostic data
   - Always use restart_application for user applications, never for system services (use restart_any_service for services)

6. ERROR HANDLING:
   - If restart_application fails, the tool will return an error - don't pre-emptively handle errors
   - Trust the tool execution results - if it says process not found, that's the actual state
   - Don't add extra diagnostic steps unless the user explicitly asks for them

GENERAL RULES:
- Use diagnostic data to inform your tool selection IF available and relevant
- Intelligently extract user intent from natural language requests
- If user explicitly requests "restart system" or "reboot", use appropriate restart tool based on role (restart_system for AI_AGENT, immediate_restart for HUMAN_AGENT)
- Match the remediation directly to the problem - be precise, not comprehensive
- Respect role permissions - only suggest tools available for current role
- Be intelligent and flexible - understand variations in user language
- For restart_application: ALWAYS extract process_name correctly using the mapping guide above
- Focus on the exact user request - do not add extra steps unless necessary
- Efficiency is key - use the minimum tools needed to accomplish the task

INFORMATIONAL REQUESTS - HANDLE DIFFERENTLY BY ROLE:
- For AI_AGENT: Can use execute_terminal_command for informational requests (requires user consent). Use execute_terminal_command when:
  * User asks for information not covered by standard diagnostic tools (e.g., "list files in folder", "list running processes", "show network connections")
  * Standard diagnostic tools don't provide the requested information
  * Always include a 2-line description explaining what the command does
  * Commands execute with regular user privileges (no admin elevation)
  * Examples:
    - "list files in Ubuntu folder" → execute_terminal_command with "ls -la /path/to/ubuntu" (Linux) or "Get-ChildItem C:\path" (Windows)
    - "list all applications" → execute_terminal_command with "ps aux" (Linux) or "Get-Process" (Windows)
  * Only return [] if the request is fully covered by standard diagnostic tools
- For HUMAN_AGENT and ADMIN: Use execute_terminal_command if no specific diagnostic tool exists for the query
  * These roles have elevated privileges and oversight, so they can use terminal commands for any query type
  * Examples:
    - "list all applications" → execute_terminal_command with "ps aux" (Linux) or "Get-Process" (Windows)
    - "show network connections" → execute_terminal_command with "netstat -tuln" (Linux) or "Get-NetTCPConnection" (Windows)
    - "list installed software" → execute_terminal_command with appropriate command
  * Only return [] if user explicitly asks for standard diagnostics that are already covered by diagnostic tools
- For ACTION requests: Use appropriate remediation tools or execute_terminal_command as fallback

TERMINAL COMMAND USAGE:
- AI_AGENT: Can use execute_terminal_command but requires user consent. Commands execute with regular user privileges (no admin elevation). Always provide a 2-line description.
- HUMAN_AGENT and ADMIN: Have elevated privileges - they can use execute_terminal_command for ANY type of query (informational, diagnostic, or action)
- Use execute_terminal_command when:
  * No specific tool exists for the user's request
  * User asks for information that requires custom commands (e.g., "list all applications", "show network connections", "list installed software")
  * User requests actions that aren't covered by standard remediation tools
- CRITICAL: Determine the platform from the platform_info in context or diagnostic data
  * For Windows: Use PowerShell commands (e.g., "Get-Process", "Get-ChildItem C:\Temp"), shell="powershell"
  * For Linux/Ubuntu: Use Linux/Unix commands (e.g., "ps aux", "ls -la /tmp"), shell="/bin/bash" or omit shell parameter
- Examples:
  * Linux - "list all applications running" → execute_terminal_command with command="ps aux" and shell="/bin/bash"
  * Linux - "list running processes" → execute_terminal_command with command="ps aux" and shell="/bin/bash"
  * Linux - "list files in /tmp" → execute_terminal_command with command="ls -la /tmp" and shell="/bin/bash"
  * Windows - "list running processes" → execute_terminal_command with command="Get-Process | Select-Object Name,CPU,Memory" and shell="powershell"
  * Any platform - custom diagnostic queries that aren't covered by standard tools

Return ONLY a JSON array of tool calls. For HUMAN_AGENT/ADMIN: Use execute_terminal_command liberally when it's the best way to fulfill the user's request."""
        
        # Add platform context
        platform_context = ""
        if context.platform_info:
            platform_info_lower = context.platform_info.lower()
            if "linux" in platform_info_lower or "ubuntu" in platform_info_lower:
                platform_context = "\nPLATFORM: Linux/Ubuntu - Use Linux/Unix commands (e.g., 'ps aux', 'ls -la', 'systemctl status'). For commands requiring root, start with 'sudo ' or use use_sudo=true (e.g., 'sudo systemctl status service', 'sudo apt list --installed'). Use shell='/bin/bash' or omit shell parameter for execute_terminal_command."
            elif "windows" in platform_info_lower:
                platform_context = "\nPLATFORM: Windows - Use PowerShell commands (e.g., 'Get-Process', 'Get-ChildItem'). Use shell='powershell' for execute_terminal_command."
        
        user_prompt = f"""User Problem: {context.problem_description}

Current Role: {context.user_role}
{platform_context}

Diagnostic Data Available:
{diagnostic_summary}

Based on the diagnostic data (if available) and user's request, determine if remediation actions are needed.

IMPORTANT - ROLE-BASED HANDLING: 
- For AI_AGENT: Return [] for informational requests (handled by diagnostics only)
- For HUMAN_AGENT and ADMIN (ELEVATED PRIVILEGES): 
  * These roles have elevated privileges and oversight - they can use execute_terminal_command for ANY query type (informational, diagnostic, or action)
  * This is the whole point of human oversight - to have flexibility to diagnose and gather information
  * If user asks for information that isn't covered by standard diagnostic tools, use execute_terminal_command
  * If user asks for actions, use appropriate remediation tools or execute_terminal_command as fallback
  * Examples of queries that should use execute_terminal_command:
    - "list all applications" / "list running applications" → execute_terminal_command with "ps aux" (Linux) or "Get-Process" (Windows)
    - "show network connections" → execute_terminal_command with "netstat -tuln" (Linux) or "Get-NetTCPConnection" (Windows)
    - "list installed software" → execute_terminal_command with appropriate command
    - "show system services" → execute_terminal_command with "systemctl list-units" (Linux) or "Get-Service" (Windows)
    - Any custom diagnostic or informational query not covered by standard tools
  * Standard health checks ("check health", "system status") can still return [] if covered by diagnostic tools, OR use execute_terminal_command for custom queries
- Be efficient and precise - match the exact user intent
- Remember: HUMAN_AGENT and ADMIN have the privilege to run diagnostic/informational commands - that's the point of elevated roles

CRITICAL INSTRUCTIONS FOR APPLICATION RESTART REQUESTS:

1. EXTRACT PROCESS NAME INTELLIGENTLY:
   - Parse the user's request to identify the application they want to restart
   - Remove filler words: "restart", "restarting", "restart the", "please", "can you", "could you", "my", "the"
   - Remove file extensions: ".exe" should be stripped
   - Map common application names to Windows process names:
     * Chrome/Google Chrome → "chrome"
     * Edge/Microsoft Edge → "msedge"
     * Firefox → "firefox"
     * Word → "winword"
     * Excel → "excel"
     * PowerPoint → "powerpnt"
     * Outlook → "outlook"
     * Teams → "teams"
     * VS Code/Visual Studio Code → "code"
     * Visual Studio → "devenv"
     * Explorer/File Explorer → "explorer"
     * Notepad → "notepad"
     * Calculator → "calculator"
     * Paint → "mspaint"
     * CMD/Command Prompt → "cmd"
     * PowerShell → "powershell"
     * Windows Terminal → "WindowsTerminal"
     * Spotify → "Spotify"
     * Discord → "Discord"
     * Zoom → "Zoom"

2. HANDLE VARIATIONS:
   - "restart chrome" → process_name: "chrome"
   - "restart Google Chrome" → process_name: "chrome"
   - "restart Chrome browser" → process_name: "chrome"
   - "chrome needs restarting" → process_name: "chrome"
   - "please restart chrome.exe" → process_name: "chrome" (remove .exe)
   - "can you restart the chrome browser" → process_name: "chrome"
   - "restarting chrome" → process_name: "chrome"
   - "restart my browser" → Check diagnostic data for running browsers, or default to "chrome"
   - "restart the application" → Look for context clues, or check diagnostic data

3. EDGE CASES:
   - If application name is ambiguous, use the most common Windows process name
   - If user says "browser" without specifying, check diagnostic data or use "chrome" as default
   - If user says "my application" or "the app", look for context in the conversation or diagnostic data
   - System processes (winlogon, csrss, lsass, etc.) should NOT be restarted - these are critical
   - If the application is not running, restart_application will start it (this is correct behavior)

4. SYSTEM RESTART REQUESTS:
   - "restart system" or "reboot" → Use restart_system (AI_AGENT) or immediate_restart (HUMAN_AGENT) based on role
   - "restart computer" → Same as above
   - "restart Windows" → Same as above

5. TOOL SELECTION LOGIC:
   - User applications → Use restart_application
   - System services → Use restart_any_service (if HUMAN_AGENT or ADMIN)
   - System restart → Use restart_system or immediate_restart based on role

EXAMPLES:
- User: "restart chrome" → {{"name": "restart_application", "arguments": {{"process_name": "chrome"}}}}
- User: "restart Google Chrome" → {{"name": "restart_application", "arguments": {{"process_name": "chrome"}}}}
- User: "restart my browser" → {{"name": "restart_application", "arguments": {{"process_name": "chrome"}}}} (or check diagnostic for actual browser)
- User: "restart chrome.exe" → {{"name": "restart_application", "arguments": {{"process_name": "chrome"}}}}
- User: "restart system" → {{"name": "restart_system", "arguments": {{}}}} (if AI_AGENT role)

Return ONLY a valid JSON array of tool calls in this format:
[
  {{
    "name": "tool_name",
    "arguments": {{"arg": "value"}},
    "role": "{context.user_role}",
    "reason": "Why this tool is needed",
    "description": "Two-line description of what will happen when this tool executes (REQUIRED for execute_terminal_command, especially for AI_AGENT)"
  }}
]

CRITICAL: For execute_terminal_command, ALWAYS include a "description" field with exactly 2 lines:
- Line 1: What the command does
- Line 2: Note about privileges (e.g., "This command will execute with regular user privileges (no admin elevation)." for AI_AGENT)
- Example: "Execute terminal command to list running processes.\nThis command will execute with regular user privileges (no admin elevation)."

For AI_AGENT using execute_terminal_command:
- AI_AGENT can use execute_terminal_command but requires user consent
- Always provide a clear 2-line description
- Commands execute with regular user privileges (no admin elevation)
- Dangerous commands are automatically blocked{context.user_role}",
    "reason": "Why this remediation tool is needed"
  }}
]

IMPORTANT: Be precise with process_name extraction. Use lowercase for common processes unless the process name is case-sensitive (like "WindowsTerminal")."""
        
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
            
            # Try parsing as JSON
            try:
                result = json.loads(content)
                
                # Handle different response formats
                if isinstance(result, list):
                    tool_plan = result
                elif isinstance(result, dict):
                    # Check for common keys
                    if "tools" in result:
                        tool_plan = result["tools"]
                    elif "tool_calls" in result:
                        tool_plan = result["tool_calls"]
                    elif "plan" in result:
                        tool_plan = result["plan"]
                    else:
                        # If it's a single tool call dict, wrap it
                        if "name" in result:
                            tool_plan = [result]
                        else:
                            tool_plan = []
                else:
                    tool_plan = []
                
                # Validate and return
                validated_plan = self.validate_tool_plan(tool_plan, context.user_role, context)
                
                print(f"Remediation Agent: Parsed {len(tool_plan)} tools, validated {len(validated_plan)} tools")
                if not validated_plan and tool_plan:
                    print(f"Warning: All tools were filtered out during validation. Original tools: {[t.get('name') for t in tool_plan]}")
                elif not validated_plan and not tool_plan:
                    print(f"Info: Remediation Agent returned empty plan (expected for informational requests)")
                
                return validated_plan
                
            except json.JSONDecodeError as json_err:
                # Try to extract JSON from markdown code blocks or text
                import re
                
                # Try to find JSON in code blocks
                json_block_match = re.search(r'```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```', content, re.DOTALL)
                if json_block_match:
                    try:
                        result = json.loads(json_block_match.group(1))
                        if isinstance(result, list):
                            return self.validate_tool_plan(result, context.user_role, context)
                        elif isinstance(result, dict) and "tools" in result:
                            return self.validate_tool_plan(result["tools"], context.user_role, context)
                    except:
                        pass
                
                # Try to find JSON array or object in the text
                json_match = re.search(r'(\[.*?\]|\{.*?\})', content, re.DOTALL)
                if json_match:
                    try:
                        result = json.loads(json_match.group(1))
                        if isinstance(result, list):
                            return self.validate_tool_plan(result, context.user_role, context)
                        elif isinstance(result, dict) and "tools" in result:
                            return self.validate_tool_plan(result["tools"], context.user_role, context)
                    except:
                        pass
                
                print(f"Remediation Agent JSON Parse Error: {json_err}")
                print(f"  LLM Response (full): {content}")
                print(f"  User Request: {context.problem_description}")
                # Don't fall back to mock - raise error to surface the issue
                raise ValueError(f"Failed to parse Remediation Agent LLM response as JSON. Response: {content[:200]}...")
        
        except Exception as e:
            error_msg = str(e)
            print(f"Remediation Agent Error: {error_msg}")
            
            # Check if it's an API key issue
            if "401" in error_msg or "invalid_api_key" in error_msg.lower() or "unauthorized" in error_msg.lower():
                raise ValueError(f"LLM API authentication failed. Please check your API key configuration.")
            elif "429" in error_msg or "rate_limit" in error_msg.lower():
                raise ValueError(f"LLM API rate limit exceeded. Please try again later.")
            else:
                # Re-raise to surface the actual error
                raise
    
    
    def get_available_tools(self, role: str) -> List[str]:
        """Get remediation tools (non-diagnostic tools)"""
        all_tools = self.tool_registry.get_tools_for_role(role)
        return [t.name for t in all_tools if not t.name.startswith("check_")]


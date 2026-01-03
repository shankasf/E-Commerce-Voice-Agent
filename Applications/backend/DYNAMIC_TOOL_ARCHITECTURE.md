# Dynamic Tool Architecture

## Overview

The Windows MCP Agent now uses a **dynamic, metadata-driven architecture** for tool categorization and agent assignment. This eliminates hardcoded string patterns and makes the system fully extensible.

## Key Principle

**Tools are categorized based on their metadata (risk level, role requirements), NOT their names.**

## Architecture Components

### 1. Tool Metadata (ToolRegistry)

Each tool has metadata that defines its characteristics:

```python
class ToolMetadata:
    name: str                    # Tool name (e.g., "search_files")
    description: str             # What the tool does
    min_role: ToolRole          # Minimum role required (AI_AGENT, HUMAN_AGENT, ADMIN)
    risk: ToolRisk              # Risk level (SAFE, CAUTION, ELEVATED)
    requires_user_notice: bool   # Show notification before execution
    requires_idle_check: bool    # Require system to be idle
    requires_admin: bool         # Require admin privileges
    arguments: Dict              # Tool arguments schema
```

### 2. Dynamic Tool Categorization

#### Safe Diagnostic Tools

```python
def get_safe_diagnostic_tools(role: str) -> List[str]:
    """
    Returns tools that:
    - Have SAFE risk level (read-only, no system changes)
    - Don't require user notice
    - Don't require idle check
    - User has permission for (role check)
    """
```

**Examples:** check_cpu_usage, check_memory_usage, search_files, list_files, check_ip_address

#### Action Tools

```python
def get_action_tools(role: str) -> List[str]:
    """
    Returns tools that:
    - Have CAUTION or ELEVATED risk level (modify system)
    - User has permission for (role check)
    """
```

**Examples:** restart_system, flush_dns_cache, clear_windows_temp, restart_application

### 3. Agent Responsibilities

#### Diagnostic Agent

- **Purpose:** Gather information without changing the system
- **Tools:** Uses `get_safe_diagnostic_tools()` - dynamic, metadata-based
- **Logic:** If tool.risk == SAFE and not requires_user_notice → Diagnostic Agent
- **Examples:** System health checks, file searches, network status

#### Remediation Agent

- **Purpose:** Take actions to fix problems
- **Tools:** Uses `get_action_tools()` - dynamic, metadata-based
- **Logic:** If tool.risk in [CAUTION, ELEVATED] → Remediation Agent
- **Examples:** Restart services, flush DNS, clear temp files

## Benefits

### 1. Fully Extensible

Add a new tool? Just register it with appropriate metadata:

```python
# New tool automatically works - no code changes needed
self._register_tool(ToolMetadata(
    name="analyze_logs",           # Any name you want
    description="Analyze system logs",
    min_role=ToolRole.AI_AGENT,
    risk=ToolRisk.SAFE,            # SAFE = Diagnostic Agent will use it
    requires_user_notice=False
))
```

The diagnostic agent will **automatically** include it without any code changes!

### 2. No Hardcoded Patterns

**Before (bad):**
```python
# Hardcoded string patterns - breaks when adding new tools
if tool_name.startswith("check_") or tool_name.startswith("search_"):
    use_diagnostic_agent()
```

**After (good):**
```python
# Dynamic based on metadata - works with any tool
safe_tools = registry.get_safe_diagnostic_tools(role)
if tool_name in safe_tools:
    use_diagnostic_agent()
```

### 3. Role-Based Access Control

The same method handles permission checking:

```python
# AI_AGENT gets only AI_AGENT tools
safe_tools_ai = registry.get_safe_diagnostic_tools("ai_agent")

# HUMAN_AGENT gets AI_AGENT + HUMAN_AGENT tools
safe_tools_human = registry.get_safe_diagnostic_tools("human_agent")

# ADMIN gets all tools
safe_tools_admin = registry.get_safe_diagnostic_tools("admin")
```

### 4. Clear Separation of Concerns

- **ToolRegistry:** Defines tool metadata (single source of truth)
- **Diagnostic Agent:** Uses safe tools (read-only)
- **Remediation Agent:** Uses action tools (modifies system)
- **No overlap, no conflicts**

## Example: Adding a New Tool

Let's say you want to add a "check_battery_status" tool:

### Step 1: Add to ToolRegistry

```python
# backend/agents/tool_registry.py
self._register_tool(ToolMetadata(
    name="check_battery_status",
    description="Check laptop battery status and health",
    min_role=ToolRole.AI_AGENT,
    risk=ToolRisk.SAFE,  # ← This makes it a diagnostic tool
    requires_user_notice=False
))
```

### Step 2: That's it!

- Diagnostic Agent automatically sees it
- LLM gets it in the tool list
- No agent code changes needed
- Works immediately

## Tool Classification Matrix

| Risk Level | Requires Notice | Requires Idle | Agent Assignment |
|------------|----------------|---------------|------------------|
| SAFE | False | False | **Diagnostic Agent** |
| SAFE | True | Any | Remediation Agent |
| CAUTION | Any | Any | **Remediation Agent** |
| ELEVATED | Any | Any | **Remediation Agent** |

## Current Tool Distribution

### AI_AGENT Safe Diagnostic Tools (9 total)

- check_cpu_usage
- check_disk_usage
- check_event_logs_summary
- check_ip_address
- check_memory_usage
- check_network_status
- check_system_uptime
- **search_files** ← New!
- **list_files** ← New!

### AI_AGENT Action Tools (8 total)

- clear_user_temp
- clear_windows_temp
- execute_terminal_command
- flush_dns_cache
- renew_ip_address
- reset_network_stack
- restart_system
- restart_whitelisted_service

## Implementation Details

### DiagnosticAgent.get_available_tools()

```python
def get_available_tools(self, role: str) -> List[str]:
    """
    Get diagnostic tools dynamically based on tool metadata.
    Returns all SAFE risk tools that don't require user notice.
    This is dynamic - works with any safe diagnostic tool you add to the registry.
    """
    return self.tool_registry.get_safe_diagnostic_tools(role)
```

**No more hardcoded patterns!** Works with any tool matching the criteria.

### Validation Logic

```python
# Get safe diagnostic tools for this role
safe_diagnostic_tools = set(self.get_available_tools(context.user_role))

# Validate each tool in the plan
for tool_call in tool_plan:
    tool_name = tool_call.get("name", "")
    if tool_name in safe_diagnostic_tools:
        validated.append(tool_call)  # ✓ Safe diagnostic tool
    else:
        print(f"Skipping non-diagnostic tool: {tool_name}")  # ✗ Action tool
```

## Future Extensions

Want to add:
- Log analysis tools?
- Network diagnostics?
- Performance profiling?
- Security scanning?

Just register them with `risk=ToolRisk.SAFE` and `requires_user_notice=False`. The diagnostic agent will automatically use them!

## Migration from Old System

### Before

```python
# Hardcoded in diagnostic_agent.py
if tool_name.startswith("check_"):
    return True
```

**Problem:** Adding "search_files" required code changes in multiple places.

### After

```python
# Metadata-driven in tool_registry.py
ToolMetadata(
    name="search_files",
    risk=ToolRisk.SAFE  # ← This one line makes it work everywhere
)
```

**Solution:** No code changes in agents, just metadata in registry.

## Summary

The Windows MCP Agent now has a **fully dynamic, metadata-driven architecture** that:

1. ✅ **Eliminates hardcoded tool name patterns**
2. ✅ **Makes adding new tools trivial** (just add metadata)
3. ✅ **Automatically categorizes tools** (diagnostic vs action)
4. ✅ **Handles role-based access control** (AI_AGENT, HUMAN_AGENT, ADMIN)
5. ✅ **Scales to any number of tools** without code changes

**Key Insight:** Tool behavior is determined by metadata (risk, role, notice), not by name patterns or hardcoded lists.

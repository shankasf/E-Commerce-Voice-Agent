# Role-Based Permission System

This document describes the role-based permission system implemented in the Windows MCP Agent backend, including how permission denials are tracked and communicated to users.

## Overview

The backend implements a comprehensive role-based access control (RBAC) system that restricts which tools users can execute based on their assigned role. The system now provides clear, user-friendly error messages when permission is denied.

## Roles

The system defines three roles with increasing privilege levels:

| Role | Description | Tool Access |
|------|-------------|-------------|
| **ai_agent** | Lowest privilege, automatic approval | Safe diagnostic and remediation tools |
| **human_agent** | Intermediate privilege, human oversight | All ai_agent tools + additional action tools |
| **admin** | Highest privilege, unrestricted | All available tools including elevated/dangerous operations |

### Role Hierarchy

The system enforces a strict hierarchy:
```
ADMIN (all tools)
  ↓
HUMAN_AGENT (ai_agent + human_agent tools)
  ↓
AI_AGENT (ai_agent tools only)
```

## Permission Denial Handling

### What Was Implemented

**1. Permission Tracking in AgentContext** ([base_agent.py](backend/agents/base_agent.py:21-26))

```python
@dataclass
class AgentContext:
    # ... other fields ...
    permission_denials: List[Dict] = None  # Track tools denied due to permissions

    def __post_init__(self):
        if self.permission_denials is None:
            self.permission_denials = []
```

**2. Enhanced Validation** ([base_agent.py](backend/agents/base_agent.py:55-91))

The `validate_tool_plan()` method now:
- Tracks permission denials with detailed information
- Records which tools were denied
- Captures the user's role and required role
- Stores the reason why the tool was needed

```python
def validate_tool_plan(self, tool_plan: List[Dict], role: str, context: Optional[AgentContext] = None):
    for tool_call in tool_plan:
        tool_name = tool_call.get("name")
        if tool_name in available_tools:
            validated_plan.append(tool_call)
        else:
            # Track permission denial
            if context is not None:
                tool_metadata = self.tool_registry.get_tool_metadata(tool_name)
                required_role = tool_metadata.min_role.value if tool_metadata else "unknown"

                context.permission_denials.append({
                    "tool_name": tool_name,
                    "user_role": role,
                    "required_role": required_role,
                    "reason": tool_call.get("reason", "No reason provided"),
                    "description": tool_call.get("description", "")
                })
```

**3. Orchestrator Returns Context** ([orchestrator.py](backend/agents/orchestrator.py:33-79))

The orchestrator now returns both the tool plan and the agent context:

```python
async def create_execution_plan(...) -> tuple[List[Dict], AgentContext]:
    # ... create plan ...

    # Log permission denials
    if context.permission_denials:
        print(f"[Orchestrator] Permission denials: {len(context.permission_denials)} tool(s) denied")
        for denial in context.permission_denials:
            print(f"  - {denial['tool_name']} (requires {denial['required_role']}, user has {denial['user_role']})")

    return complete_plan, context
```

**4. User-Friendly Error Messages** ([main.py](backend/main.py:238-277))

When the tool plan is empty due to permission denials, the system generates a clear, actionable error message:

```python
if not tool_plan:
    if agent_context.permission_denials:
        denied_tools = [denial['tool_name'] for denial in agent_context.permission_denials]
        required_roles = set([denial['required_role'] for denial in agent_context.permission_denials])

        tools_list = ", ".join(denied_tools[:3])
        if len(denied_tools) > 3:
            tools_list += f", and {len(denied_tools) - 3} more"

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
```

## Error Message Examples

### Example 1: AI Agent Trying to Use Admin Tool

**User Request:** "Restart the system immediately" (ai_agent role)

**System Response:**
```
❌ Permission Denied: You don't have permission to perform this action.

Your current role 'ai_agent' does not allow access to the following tools: system_restart_no_delay.

These tools require 'admin' privileges.

To perform this action, please:
1. Contact your administrator to upgrade your role to 'admin'
2. Or request that an administrator or human agent performs this action for you
```

### Example 2: AI Agent Trying to Restart Application

**User Request:** "Restart Chrome browser" (ai_agent role)

**System Response:**
```
❌ Permission Denied: You don't have permission to perform this action.

Your current role 'ai_agent' does not allow access to the following tools: restart_application.

These tools require 'human_agent' privileges.

To perform this action, please:
1. Contact your administrator to upgrade your role to 'human_agent'
2. Or request that an administrator or human agent performs this action for you
```

### Example 3: Multiple Tool Denials

**User Request:** "Fix my firewall and registry issues" (ai_agent role)

**System Response:**
```
❌ Permission Denied: You don't have permission to perform this action.

Your current role 'ai_agent' does not allow access to the following tools: firewall_rule_repair, registry_fix.

These tools require 'admin' privileges.

To perform this action, please:
1. Contact your administrator to upgrade your role to 'admin'
2. Or request that an administrator or human agent performs this action for you
```

## Architecture Flow

```
User Request (with role) → main.py:solve_problem
    ↓
agent_orchestrator.create_execution_plan(role=user_role)
    ↓
AgentContext initialized with permission_denials=[]
    ↓
DiagnosticAgent.analyze(context)
    → validate_tool_plan(tools, role, context)
    → Denied tools → context.permission_denials.append(...)
    ↓
RemediationAgent.analyze(context)
    → validate_tool_plan(tools, role, context)
    → Denied tools → context.permission_denials.append(...)
    ↓
orchestrator returns (tool_plan, context)
    ↓
main.py checks:
    if not tool_plan and context.permission_denials:
        → Generate permission error message
        → Return ProblemResponse with user-friendly error
    else if not tool_plan:
        → Generic LLM error (API issue)
```

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| [base_agent.py](backend/agents/base_agent.py) | Added permission_denials to AgentContext, enhanced validate_tool_plan | 21-91 |
| [tool_registry.py](backend/agents/tool_registry.py) | Added get_tool_metadata() method | 271-273 |
| [orchestrator.py](backend/agents/orchestrator.py) | Return context with denials, log denials | 33-79 |
| [diagnostic_agent.py](backend/agents/diagnostic_agent.py) | Pass context to validate_tool_plan | 188, 203, 214 |
| [remediation_agent.py](backend/agents/remediation_agent.py) | Pass context to validate_tool_plan | 349, 369, 371, 381, 383 |
| [main.py](backend/main.py) | Generate role-specific error messages | 219-277 |

## Testing Permission Denials

### Test Case 1: AI Agent with Admin Tool

```bash
curl -X POST http://localhost:9000/api/problem/solve \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "device_id": "test-device",
    "problem_description": "Restart system with no delay",
    "role": "ai_agent"
  }'
```

**Expected:** Permission denied error message

### Test Case 2: AI Agent with Human Agent Tool

```bash
curl -X POST http://localhost:9000/api/problem/solve \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "device_id": "test-device",
    "problem_description": "Restart Chrome browser",
    "role": "ai_agent"
  }'
```

**Expected:** Permission denied error message

### Test Case 3: Human Agent with Same Tool

```bash
curl -X POST http://localhost:9000/api/problem/solve \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "device_id": "test-device",
    "problem_description": "Restart Chrome browser",
    "role": "human_agent"
  }'
```

**Expected:** Success, tool plan generated

## Benefits

1. **Clear Communication**: Users understand exactly why their action was denied
2. **Actionable Guidance**: Error messages include steps to resolve the issue
3. **Security**: Maintains strict role-based access control
4. **Debugging**: Detailed logging of permission denials in console
5. **User Experience**: Professional error messages instead of generic failures
6. **Audit Trail**: All permission denials are tracked and logged

## Security Considerations

1. **No Privilege Escalation**: Users cannot bypass role restrictions
2. **Centralized Control**: All permission logic in ToolRegistry
3. **Layered Validation**: Multiple validation points (agent + base validation)
4. **Detailed Logging**: All denials logged for security auditing
5. **Clear Error Messages**: Don't expose internal system details

## Future Enhancements

1. **Persistent Audit Log**: Store permission denials in database
2. **Role Assignment API**: Allow admins to change user roles
3. **Permission Request Workflow**: Users can request role upgrades
4. **Temporary Elevation**: Time-limited role upgrades for specific tasks
5. **Fine-Grained Permissions**: Tool-specific permissions beyond role hierarchy

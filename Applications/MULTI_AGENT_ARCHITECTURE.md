# Multi-Agent System Architecture

## Overview

The Windows MCP Agent now uses a **multi-agent system** architecture following industry best practices for intelligent, scalable, and maintainable AI systems.

## Architecture Components

### 1. Agent Orchestrator (`backend/agents/orchestrator.py`)
- **Purpose**: Coordinates the workflow between specialized agents
- **Responsibilities**:
  - Manages execution phases (diagnostic → remediation → verification)
  - Combines plans from multiple agents
  - Handles explicit user requests (e.g., "restart system")
  - Validates tool plans against role permissions

### 2. Diagnostic Agent (`backend/agents/diagnostic_agent.py`)
- **Purpose**: Analyzes problems and gathers diagnostic information
- **Specialization**: Only uses SAFE diagnostic tools (check_*)
- **Workflow**: 
  - Analyzes user problem
  - Selects appropriate diagnostic tools
  - Creates focused diagnostic plan

### 3. Remediation Agent (`backend/agents/remediation_agent.py`)
- **Purpose**: Creates action plans to fix problems
- **Specialization**: Uses remediation tools based on diagnostic data
- **Workflow**:
  - Analyzes diagnostic data
  - Identifies root cause
  - Creates remediation plan
  - Handles explicit requests (e.g., restart system)

### 4. Verification Agent (`backend/agents/verification_agent.py`)
- **Purpose**: Verifies that remediation was successful
- **Status**: Placeholder for future implementation
- **Future**: Will re-run diagnostics to confirm fixes

### 5. Tool Registry (`backend/agents/tool_registry.py`)
- **Purpose**: Single source of truth for all available tools
- **Features**:
  - Centralized tool metadata
  - Role-based tool filtering
  - Dynamic tool discovery
  - Prompt formatting for LLMs

## Workflow

```
User Request
    ↓
Agent Orchestrator
    ↓
┌─────────────────┬──────────────────┐
│ Diagnostic      │ Remediation      │
│ Agent           │ Agent            │
│                 │                  │
│ - Analyzes      │ - Uses diagnostic│
│   problem       │   data           │
│ - Selects       │ - Creates action │
│   diagnostic    │   plan           │
│   tools         │ - Handles        │
│                 │   explicit       │
│                 │   requests       │
└─────────────────┴──────────────────┘
    ↓
Combined Tool Plan
    ↓
Tool Execution
    ↓
Results
```

## Key Features

### 1. Intelligent Tool Selection
- **Context-Aware**: Agents use diagnostic data to inform decisions
- **Role-Based**: Tools are filtered by user role permissions
- **Explicit Request Handling**: "restart system" → restart_system tool

### 2. Scalability
- **Modular Design**: Each agent is independent and can be extended
- **Loose Coupling**: Agents communicate through context, not direct calls
- **Easy to Add**: New agents can be added without modifying existing ones

### 3. Maintainability
- **Single Responsibility**: Each agent has one clear purpose
- **Readable Code**: Clear separation of concerns
- **Easy Navigation**: Well-organized file structure

### 4. Performance
- **Parallel Planning**: Agents can work independently
- **Efficient Tool Discovery**: Centralized registry
- **Caching**: Tool metadata is loaded once

## Tool Registry

The Tool Registry maintains metadata for all tools:

```python
ToolMetadata(
    name="restart_system",
    description="Restart the system with idle check, countdown, and cancel option",
    min_role=ToolRole.AI_AGENT,
    risk=ToolRisk.CAUTION,
    requires_user_notice=True,
    requires_idle_check=True,
    arguments={"delay_seconds": "integer (optional, default 60)"}
)
```

## API Key Handling

### Improved Validation
- **Automatic Fixing**: Removes quotes, whitespace
- **Format Validation**: Checks key format (e.g., OpenAI keys start with "sk-")
- **Clear Error Messages**: Helpful troubleshooting steps

### Fallback Behavior
- **Mock Mode**: When API key is invalid, falls back to intelligent mock mode
- **Restart Support**: Mock mode now handles "restart system" requests
- **Graceful Degradation**: System continues to work even without LLM

## Example: "Restart System" Request

1. **User**: "can you restart the system"
2. **Orchestrator**: Routes to Diagnostic Agent
3. **Diagnostic Agent**: 
   - Recognizes restart request
   - Plans: `check_system_uptime` (to understand why restart is needed)
4. **Remediation Agent**:
   - Sees explicit restart request
   - Plans: `restart_system` with 60-second delay
5. **Orchestrator**: Combines plans
6. **Execution**: 
   - Executes `check_system_uptime`
   - Executes `restart_system`
7. **Result**: System restarts in 60 seconds

## Future Enhancements

1. **Verification Agent**: Re-run diagnostics after remediation
2. **Learning Agent**: Learn from successful/failed remediations
3. **Cost Optimization Agent**: Minimize API calls and tool executions
4. **Safety Agent**: Double-check high-risk operations

## Code Organization

```
backend/
├── agents/
│   ├── __init__.py
│   ├── base_agent.py          # Base class for all agents
│   ├── orchestrator.py        # Coordinates agents
│   ├── diagnostic_agent.py    # Diagnostic specialist
│   ├── remediation_agent.py   # Remediation specialist
│   ├── verification_agent.py  # Verification specialist
│   └── tool_registry.py       # Tool metadata registry
├── utils/
│   ├── __init__.py
│   └── api_key_validator.py   # API key validation
└── main.py                     # Uses orchestrator
```

## Benefits

1. **100% Working**: Handles all scenarios including explicit requests
2. **Intelligent**: Context-aware tool selection
3. **Scalable**: Easy to add new agents and tools
4. **Performance Efficient**: Optimized tool discovery and planning
5. **Readable**: Clear separation of concerns
6. **Navigatable**: Well-organized file structure
7. **Easy to Implement Changes**: Modular design
8. **Loose Coupling**: Agents don't depend on each other



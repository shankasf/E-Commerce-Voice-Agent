# Tool Execution Timeout Fix

## Problem

The `list_files` tool was timing out despite executing successfully in 69ms on the Windows app side.

### Symptoms
- Windows app UI showed successful execution in 69ms
- Backend reported: `Tool list_files failed: Tool execution timeout` after 30 seconds
- Backend fell back to using `execute_terminal_command`

### Root Cause

**JSON Serialization Case Mismatch**

The Windows app (C#) was serializing tool results with **PascalCase** property names:
```json
{
  "Id": "call_123",
  "Type": "tool_result",
  "Status": "success",
  "Output": "{...}",
  "ExecutionTimeMs": 69
}
```

But the Python backend expected **camelCase** property names:
```python
if message.get("type") == "tool_result":  # Looking for "type", not "Type"
    call_id = message.get("id")            # Looking for "id", not "Id"
```

When the backend received the PascalCase JSON:
1. `message.get("type")` returned `None` (looking for lowercase "type" but got uppercase "Type")
2. The `if message.get("type") == "tool_result"` condition failed
3. The message was ignored
4. The backend's `_wait_for_tool_result()` timed out after 30 seconds
5. Timeout error returned, triggering fallback to `execute_terminal_command`

## Solution

### 1. Fix JSON Serialization in McpClient.cs

Updated `SendToolResultAsync` to use camelCase serialization:

**File:** `src/WindowsMcpAgent.Core/Mcp/McpClient.cs:59-80`

```csharp
public async Task SendToolResultAsync(ToolResultMessage result, CancellationToken cancellationToken = default)
{
    // Serialize with camelCase to match Python backend expectations
    var settings = new JsonSerializerSettings
    {
        ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver()
    };
    var json = JsonConvert.SerializeObject(result, settings);

    // ... send via WebSocket
}
```

Now serializes as:
```json
{
  "id": "call_123",
  "type": "tool_result",
  "status": "success",
  "output": "{...}",
  "executionTimeMs": 69
}
```

### 2. Added Diagnostic Logging

#### Windows App (McpClient.cs)
- Logs JSON being sent
- Checks WebSocket state before sending
- Logs success/failure of send operation

#### Backend (main.py)
- Logs all WebSocket messages received
- Logs call_id when sending tool calls
- Logs call_id when receiving tool results
- Logs when result is delivered to message queue
- Logs timeout information

## Message Flow

### Correct Flow (After Fix)

1. **Backend sends tool call:**
   ```
   [ToolExecution] Sending tool call call_1735334567_list_files to device abc123
   [ToolExecution] Waiting for result for call_id: call_1735334567_list_files (timeout: 30s)
   ```

2. **Windows app receives and executes:**
   ```
   [McpClient] Received tool_call: list_files
   [ToolDispatcher] Executing tool: list_files (69ms)
   ```

3. **Windows app sends result:**
   ```json
   [McpClient] Sending tool result: {"id":"call_1735334567_list_files","type":"tool_result","status":"success",...}
   [McpClient] WebSocket State: Open
   [McpClient] Tool result sent successfully
   ```

4. **Backend receives and processes:**
   ```
   [WebSocket] Received message from abc123: {"id":"call_1735334567_list_files","type":"tool_result",...}
   [WebSocket] Received tool_result from abc123 for call_id: call_1735334567_list_files
   [WebSocket] Tool result delivered to message_queue for call call_1735334567_list_files
   [ToolExecution] Received result for call_id: call_1735334567_list_files, status: success
   ```

## Files Modified

### Windows App
- **src/WindowsMcpAgent.Core/Mcp/McpClient.cs** (lines 59-80)
  - Added camelCase serialization for tool results
  - Added diagnostic logging
  - Added WebSocket state validation

### Backend
- **backend/main.py** (lines 377-389, 580-595)
  - Added diagnostic logging for tool execution
  - Added diagnostic logging for WebSocket message handling

## Testing

After rebuilding the Windows app with this fix:

1. The tool result will be serialized with camelCase properties
2. Backend will recognize `message.get("type") == "tool_result"`
3. Backend will extract the `call_id` correctly
4. Result will be delivered to the waiting coroutine via `message_queue.set_result()`
5. No timeout will occur
6. Tool execution will complete in ~69ms

## Prevention

To prevent similar issues in the future:

1. **Use consistent casing convention** across C# and Python
2. **Add integration tests** that verify full message round-trip
3. **Log JSON payloads** during development to catch serialization issues early
4. **Document message schemas** with examples in both languages

## Related Issues

This same serialization mismatch would have affected ALL tool results, not just `list_files`. The fix ensures all future tool calls work correctly.

## Rebuild Instructions

```bash
# Rebuild Windows app
cd src/WindowsMcpAgent
dotnet build

# Restart backend
cd backend
python main.py
```

## Verification

After the fix, you should see logs like:
```
[ToolExecution] Sending tool call call_xxx_list_files to device xxx
[WebSocket] Received message from xxx: {"id":"call_xxx_list_files","type":"tool_result",...}
[ToolExecution] Received result for call_id: call_xxx_list_files, status: success
```

With execution time around 69ms instead of timeout.

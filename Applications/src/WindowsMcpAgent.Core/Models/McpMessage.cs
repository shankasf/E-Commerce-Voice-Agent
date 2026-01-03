using System.Collections.Generic;

namespace WindowsMcpAgent.Core.Models;

/// <summary>
/// Message from backend requesting tool execution
/// </summary>
public class ToolCallMessage
{
    /// <summary>
    /// Unique request ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Message type - should be "tool_call"
    /// </summary>
    public string Type { get; set; } = "tool_call";

    /// <summary>
    /// Tool name to execute (e.g., "check_cpu_usage", "search_files")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Tool arguments as dictionary
    /// </summary>
    public Dictionary<string, object> Arguments { get; set; } = new();

    /// <summary>
    /// User role (ai_agent, human_agent, admin)
    /// </summary>
    public string Role { get; set; } = "ai_agent";
}

/// <summary>
/// Response message containing tool execution result
/// </summary>
public class ToolResultMessage
{
    /// <summary>
    /// Request ID (matches ToolCallMessage.Id)
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Message type - should be "tool_result"
    /// </summary>
    public string Type { get; set; } = "tool_result";

    /// <summary>
    /// Status of execution ("success" or "error")
    /// </summary>
    public string Status { get; set; } = "success";

    /// <summary>
    /// Tool output on success
    /// </summary>
    public string? Output { get; set; }

    /// <summary>
    /// Error message on failure
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Execution time in milliseconds
    /// </summary>
    public long ExecutionTimeMs { get; set; }
}

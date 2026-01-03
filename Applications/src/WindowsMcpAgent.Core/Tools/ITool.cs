using System.Collections.Generic;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools;

/// <summary>
/// Interface for tool implementations
/// </summary>
public interface ITool
{
    /// <summary>
    /// Name of the tool
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Executes the tool with the provided arguments
    /// </summary>
    Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments);
}

/// <summary>
/// Result of tool execution
/// </summary>
public class ToolResult
{
    public bool Success { get; set; }
    public string Output { get; set; } = string.Empty;
    public string? Error { get; set; }
    public long ExecutionTimeMs { get; set; }
}










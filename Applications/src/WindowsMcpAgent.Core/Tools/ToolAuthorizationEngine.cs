using WindowsMcpAgent.Core.Models;

namespace WindowsMcpAgent.Core.Tools;

/// <summary>
/// Engine that validates tool execution requests against policies
/// </summary>
public class ToolAuthorizationEngine
{
    private readonly ToolRegistry _toolRegistry;

    public ToolAuthorizationEngine(ToolRegistry toolRegistry)
    {
        _toolRegistry = toolRegistry;
    }

    /// <summary>
    /// Validates if a tool can be executed by the given role
    /// </summary>
    public AuthorizationResult Authorize(string toolName, Role userRole)
    {
        var policy = _toolRegistry.GetPolicy(toolName);
        if (policy == null)
        {
            return new AuthorizationResult
            {
                IsAllowed = false,
                Reason = $"Tool '{toolName}' not found"
            };
        }

        if (userRole < policy.MinRole)
        {
            return new AuthorizationResult
            {
                IsAllowed = false,
                Reason = $"Role '{userRole}' does not have permission for tool '{toolName}' (requires {policy.MinRole})"
            };
        }

        return new AuthorizationResult
        {
            IsAllowed = true,
            Policy = policy
        };
    }
}

/// <summary>
/// Result of authorization check
/// </summary>
public class AuthorizationResult
{
    public bool IsAllowed { get; set; }
    public string Reason { get; set; } = string.Empty;
    public ToolPolicy? Policy { get; set; }
}










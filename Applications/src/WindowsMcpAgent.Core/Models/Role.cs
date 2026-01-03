namespace WindowsMcpAgent.Core.Models;

/// <summary>
/// Represents the role hierarchy for tool execution permissions.
/// Higher roles inherit lower-role permissions.
/// </summary>
public enum Role
{
    /// <summary>
    /// Auto-approved, safe remediation tools
    /// </summary>
    AI_AGENT = 0,

    /// <summary>
    /// Human-approved, stronger remediation tools
    /// </summary>
    HUMAN_AGENT = 1,

    /// <summary>
    /// Elevated remediation, still non-breaching
    /// </summary>
    ADMIN = 2
}










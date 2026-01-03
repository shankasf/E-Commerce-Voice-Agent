namespace WindowsMcpAgent.Core.Models;

/// <summary>
/// Risk levels for tool execution
/// </summary>
public enum RiskLevel
{
    /// <summary>
    /// Read-only or no disruption
    /// </summary>
    SAFE = 0,

    /// <summary>
    /// Temporary disruption
    /// </summary>
    CAUTION = 1,

    /// <summary>
    /// Requires admin privileges
    /// </summary>
    ELEVATED = 2
}










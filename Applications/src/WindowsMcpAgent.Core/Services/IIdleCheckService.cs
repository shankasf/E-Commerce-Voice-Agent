namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Service for checking if system is idle
/// Per Project_requirements.md Section 10 (Tool Authorization Engine)
/// </summary>
public interface IIdleCheckService
{
    /// <summary>
    /// Checks if system is idle (no user input for specified duration)
    /// </summary>
    /// <param name="idleThresholdSeconds">Seconds of inactivity to consider idle</param>
    /// <returns>True if system is idle</returns>
    bool IsSystemIdle(int idleThresholdSeconds = 300);
    
    /// <summary>
    /// Gets time since last user input in seconds
    /// </summary>
    int GetIdleTimeSeconds();
}



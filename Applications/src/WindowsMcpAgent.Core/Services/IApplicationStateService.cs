namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Service for managing application state
/// Per Project_requirements.md Section 12 (Tray States)
/// </summary>
public interface IApplicationStateService
{
    /// <summary>
    /// Current application state
    /// </summary>
    ApplicationState CurrentState { get; }
    
    /// <summary>
    /// Changes application state
    /// </summary>
    void ChangeState(ApplicationState newState);
    
    /// <summary>
    /// Event fired when state changes
    /// </summary>
    event EventHandler<ApplicationState>? StateChanged;
}

/// <summary>
/// Application states per Project_requirements.md Section 12
/// </summary>
public enum ApplicationState
{
    /// <summary>
    /// Initializing application
    /// </summary>
    Initializing,
    
    /// <summary>
    /// Connected to backend
    /// </summary>
    Connected,
    
    /// <summary>
    /// Waiting for command
    /// </summary>
    WaitingForCommand,
    
    /// <summary>
    /// Executing tool
    /// </summary>
    ExecutingTool,
    
    /// <summary>
    /// Blocked (policy violation)
    /// </summary>
    Blocked,
    
    /// <summary>
    /// Disconnected from backend
    /// </summary>
    Disconnected,
    
    /// <summary>
    /// Error state
    /// </summary>
    Error
}



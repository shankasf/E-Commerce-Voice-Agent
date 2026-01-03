namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Service for displaying user notifications and toasts
/// Per Project_requirements.md Section 12 (User Experience)
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Shows a notification for caution tool execution
    /// </summary>
    void ShowCautionToolNotice(string toolName, string description);
    
    /// <summary>
    /// Shows restart countdown with cancel option
    /// </summary>
    /// <returns>True if user confirmed, false if cancelled</returns>
    bool ShowRestartCountdown(int delaySeconds, out bool cancelled);
    
    /// <summary>
    /// Shows error or rejection notice
    /// </summary>
    void ShowErrorNotice(string title, string message);
    
    /// <summary>
    /// Shows a toast notification
    /// </summary>
    void ShowToast(string title, string message, NotificationType type = NotificationType.Info);
}

/// <summary>
/// Types of notifications
/// </summary>
public enum NotificationType
{
    Info,
    Warning,
    Error,
    Success
}



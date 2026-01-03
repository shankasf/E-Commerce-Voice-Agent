using System;

namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Implementation of notification service for user notifications.
/// Platform-agnostic implementation that uses callbacks for UI-specific functionality.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly Action<string, string, NotificationType>? _showToastAction;
    private readonly Action<string, string>? _showErrorAction;
    private readonly Func<int, bool>? _showCountdownAction;

    /// <summary>
    /// Creates a notification service with optional UI callbacks
    /// </summary>
    /// <param name="showToastAction">Callback for showing toast notifications (title, message, type)</param>
    /// <param name="showErrorAction">Callback for showing error notifications (title, message)</param>
    /// <param name="showCountdownAction">Callback for showing restart countdown (delaySeconds) -> (not cancelled)</param>
    public NotificationService(
        Action<string, string, NotificationType>? showToastAction = null,
        Action<string, string>? showErrorAction = null,
        Func<int, bool>? showCountdownAction = null)
    {
        _showToastAction = showToastAction;
        _showErrorAction = showErrorAction;
        _showCountdownAction = showCountdownAction;
    }

    public void ShowCautionToolNotice(string toolName, string description)
    {
        var message = $"Tool '{toolName}' will be executed: {description}";
        ShowToast("Caution Tool Execution", message, NotificationType.Warning);
    }

    public bool ShowRestartCountdown(int delaySeconds, out bool cancelled)
    {
        cancelled = false;
        
        // If custom countdown handler provided, use it
        if (_showCountdownAction != null)
        {
            cancelled = !_showCountdownAction(delaySeconds);
            return !cancelled;
        }
        
        // Default: Show toast notification
        ShowToast(
            "System Restart",
            $"System will restart in {delaySeconds} seconds. Please save your work.",
            NotificationType.Warning);
        
        return true;
    }

    public void ShowErrorNotice(string title, string message)
    {
        if (_showErrorAction != null)
        {
            _showErrorAction(title, message);
        }
        else
        {
            ShowToast(title, message, NotificationType.Error);
        }
    }

    public void ShowToast(string title, string message, NotificationType type = NotificationType.Info)
    {
        _showToastAction?.Invoke(title, message, type);
    }
}


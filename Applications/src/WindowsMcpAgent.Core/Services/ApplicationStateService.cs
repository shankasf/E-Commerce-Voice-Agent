using System;

namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Manages application state transitions
/// </summary>
public class ApplicationStateService : IApplicationStateService
{
    private ApplicationState _currentState = ApplicationState.Initializing;

    public ApplicationState CurrentState => _currentState;

    public event EventHandler<ApplicationState>? StateChanged;

    public void ChangeState(ApplicationState newState)
    {
        if (_currentState != newState)
        {
            var oldState = _currentState;
            _currentState = newState;
            StateChanged?.Invoke(this, newState);
        }
    }
}



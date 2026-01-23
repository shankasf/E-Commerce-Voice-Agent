using System;
using System.Windows.Input;

namespace WindowsApp.Helpers;

// Implementation of ICommand interface for MVVM pattern
// Allows binding UI actions to ViewModel methods with optional execution conditions
public class RelayCommand : ICommand
{
    private readonly Action<object?> _execute;
    private readonly Func<object?, bool>? _canExecute;

    // Constructor for commands with parameter support and optional execution guard
    public RelayCommand(Action<object?> execute, Func<object?, bool>? canExecute = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    // Event raised when command executability changes
    // UI elements automatically refresh their enabled state when this fires
    public event EventHandler? CanExecuteChanged
    {
        add => CommandManager.RequerySuggested += value;
        remove => CommandManager.RequerySuggested -= value;
    }

    // Determines whether command can execute in current state
    // Used by WPF to enable/disable bound controls
    public bool CanExecute(object? parameter)
    {
        return _canExecute == null || _canExecute(parameter);
    }

    // Executes command action when invoked from UI
    public void Execute(object? parameter)
    {
        _execute(parameter);
    }

    // Manually triggers CanExecuteChanged to refresh UI state
    public void RaiseCanExecuteChanged()
    {
        CommandManager.InvalidateRequerySuggested();
    }
}

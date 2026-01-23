using System;
using System.Configuration;
using System.Data;
using System.Threading.Tasks;
using System.Windows;
using WindowsApp.Services;
using WindowsApp.Views;

namespace WindowsApp;

/// <summary>
/// Interaction logic for App.xaml
/// Handles application startup with automatic login and token renewal
/// </summary>
public partial class App : Application
{
    private AuthenticationService? _authService;

    // Override OnStartup to implement auto-login logic
    // Checks for stored credentials and validates/refreshes token before showing UI
    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        _authService = new AuthenticationService();

        try
        {
            // Check if user has stored authentication credentials
            var hasCredentials = await _authService.HasStoredCredentialsAsync();

            if (hasCredentials)
            {
                System.Diagnostics.Debug.WriteLine("Found stored credentials, validating...");

                // Validate credentials and refresh token if needed
                var isValid = await _authService.ValidateAndRefreshCredentialsAsync();

                if (isValid)
                {
                    System.Diagnostics.Debug.WriteLine("Credentials valid, auto-login successful");

                    // Show connection input window directly without any popup
                    var connectionInputWindow = new ConnectionInputWindow();
                    connectionInputWindow.Show();
                    return;
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("Token validation/refresh failed, showing login screen");
                }
            }
            else
            {
                System.Diagnostics.Debug.WriteLine("No stored credentials found, showing login screen");
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error during auto-login: {ex.Message}");
        }

        // No credentials or validation failed - show login window
        ShowLoginWindow();
    }

    // Shows the login window
    private void ShowLoginWindow()
    {
        var loginWindow = new LoginWindow();
        loginWindow.Show();
    }

    // Show main application window after successful authentication
    private void ShowMainWindow()
    {
        var mainWindow = new MainWindow();
        mainWindow.Show();
    }
}


using System;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using WindowsMcpAgent.Core.Authentication;
using WindowsMcpAgent.Core.Models;
using WindowsMcpAgent.Core.Storage;

namespace WindowsMcpAgent;

public partial class LoginWindow : Window
{
    private readonly DeviceRegistrationService _registrationService;
    private readonly LocalStorage _localStorage;
    private readonly string _deviceId;
    private readonly string _deviceName;
    private readonly string _osVersion;

    public string? McpUrl { get; private set; }
    public string? JwtToken { get; private set; }
    public string? ClientId { get; private set; }
    public string? UserId { get; private set; }
    public bool RegistrationSuccessful { get; private set; }

    public LoginWindow(string backendApiUrl, string deviceId, string deviceName, string osVersion, string? mcpUrl = null)
    {
        InitializeComponent();
        _registrationService = new DeviceRegistrationService(backendApiUrl);
        _localStorage = new LocalStorage();
        _deviceId = deviceId;
        _deviceName = deviceName;
        _osVersion = osVersion;
        McpUrl = mcpUrl; // Optional for reverse connection architecture

        // Focus on email field
        Loaded += (s, e) => EmailTextBox.Focus();
    }

    private void OnInputChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
    {
        // Enable register button only if both fields have text
        RegisterButton.IsEnabled = 
            !string.IsNullOrWhiteSpace(EmailTextBox.Text) &&
            !string.IsNullOrWhiteSpace(UECodeTextBox.Text);
    }

    private async void RegisterButton_Click(object sender, RoutedEventArgs e)
    {
        var email = EmailTextBox.Text.Trim();
        var ueCode = UECodeTextBox.Text.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(ueCode))
        {
            ShowError("Please enter both email and U & E code.");
            return;
        }

        // Disable UI during registration
        SetRegistrationInProgress(true);
        ShowStatus("Registering device with backend...");

        try
        {
            var response = await _registrationService.RegisterDeviceAsync(
                email,
                ueCode,
                _deviceId,
                _deviceName,
                _osVersion,
                null); // MCP URL is optional for reverse connection architecture

            if (response.Success)
            {
                // Store authentication data (for reverse connection, backend URL will be constructed from config)
                var authData = new AuthData
                {
                    Username = email, // Store email as username for backward compatibility
                    EmployeeCode = ueCode,
                    DeviceId = _deviceId,
                    McpUrl = string.Empty, // Not used in reverse connection architecture
                    JwtToken = response.JwtToken,
                    ClientId = response.ClientId,
                    UserId = response.UserId,
                    RegisteredAt = DateTime.UtcNow
                };

                _localStorage.SaveAuthData(authData);

                // Set return values (McpUrl is already set from constructor)
                JwtToken = response.JwtToken;
                ClientId = response.ClientId;
                UserId = response.UserId;
                RegistrationSuccessful = true;

                ShowStatus("Registration successful! Connecting...");
                await Task.Delay(500); // Brief delay to show success message

                DialogResult = true;
                Close();
            }
            else
            {
                var errorMessage = response.Error ?? response.Message ?? "Registration failed. Please check your credentials and try again.";
                ShowError(errorMessage);
                SetRegistrationInProgress(false);
            }
        }
        catch (Exception ex)
        {
            ShowError($"Registration error: {ex.Message}");
            SetRegistrationInProgress(false);
        }
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }

    private void SetRegistrationInProgress(bool inProgress)
    {
        RegisterButton.IsEnabled = !inProgress;
        EmailTextBox.IsEnabled = !inProgress;
        UECodeTextBox.IsEnabled = !inProgress;
    }

    private void ShowError(string message)
    {
        ErrorTextBlock.Text = message;
        ErrorTextBlock.Visibility = Visibility.Visible;
        StatusTextBlock.Visibility = Visibility.Collapsed;
    }

    private void ShowStatus(string message)
    {
        StatusTextBlock.Text = message;
        StatusTextBlock.Visibility = Visibility.Visible;
        ErrorTextBlock.Visibility = Visibility.Collapsed;
    }
}


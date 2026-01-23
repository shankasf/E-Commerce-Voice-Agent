using System;
using System.ComponentModel;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows;
using WindowsApp.Helpers;
using WindowsApp.Models;
using WindowsApp.Services;
using WindowsApp.Views;

namespace WindowsApp.ViewModels;

// ViewModel for login screen implementing MVVM pattern
// Handles user input, validation, and communication with services
public class LoginViewModel : INotifyPropertyChanged
{
    private readonly ApiService _apiService;
    private readonly DeviceInformationService _deviceInfoService;
    private readonly SecureStorageService _secureStorageService;

    private string _ueCode = string.Empty;
    private string _errorMessage = string.Empty;
    private bool _isLoading;
    private string _deviceName = string.Empty;
    private string _osVersion = string.Empty;

    public LoginViewModel()
    {
        // Initialize services
        _apiService = new ApiService();
        _deviceInfoService = new DeviceInformationService();
        _secureStorageService = new SecureStorageService();

        // Initialize command with execution logic and validation
        LoginCommand = new RelayCommand(
            execute: async _ => await LoginAsync(),
            canExecute: _ => CanLogin());

        // Load device information on initialization
        LoadDeviceInformation();
    }

    // Property for organization code input with validation trigger
    public string UeCode
    {
        get => _ueCode;
        set
        {
            if (_ueCode != value)
            {
                _ueCode = value;
                OnPropertyChanged();
                (LoginCommand as RelayCommand)?.RaiseCanExecuteChanged();
            }
        }
    }

    // Error message displayed to user on validation or API failures
    public string ErrorMessage
    {
        get => _errorMessage;
        set
        {
            if (_errorMessage != value)
            {
                _errorMessage = value;
                OnPropertyChanged();
                OnPropertyChanged(nameof(HasError));
            }
        }
    }

    // Loading state to show progress indicator and disable inputs
    public bool IsLoading
    {
        get => _isLoading;
        set
        {
            if (_isLoading != value)
            {
                _isLoading = value;
                OnPropertyChanged();
                OnPropertyChanged(nameof(IsNotLoading));
                (LoginCommand as RelayCommand)?.RaiseCanExecuteChanged();
            }
        }
    }

    // Inverse of IsLoading for binding to IsEnabled properties
    public bool IsNotLoading => !IsLoading;

    // Indicates if error message should be displayed
    public bool HasError => !string.IsNullOrEmpty(ErrorMessage);

    // Device name displayed in UI for user confirmation
    public string DeviceName
    {
        get => _deviceName;
        set
        {
            if (_deviceName != value)
            {
                _deviceName = value;
                OnPropertyChanged();
            }
        }
    }

    // OS version displayed in UI for transparency
    public string OsVersion
    {
        get => _osVersion;
        set
        {
            if (_osVersion != value)
            {
                _osVersion = value;
                OnPropertyChanged();
            }
        }
    }

    // Command bound to login button
    public RelayCommand LoginCommand { get; }

    // Validates input before allowing login execution
    // Only requires organization code for authentication
    private bool CanLogin()
    {
        return !IsLoading &&
               !string.IsNullOrWhiteSpace(UeCode);
    }

    // Loads device information for display and registration
    private void LoadDeviceInformation()
    {
        try
        {
            DeviceName = _deviceInfoService.GetDeviceName();
            OsVersion = _deviceInfoService.GetOsVersion();
        }
        catch (Exception ex)
        {
            // Log error but don't block UI - use fallback values
            DeviceName = "Unknown Device";
            OsVersion = "Unknown OS";
            System.Diagnostics.Debug.WriteLine($"Error loading device info: {ex.Message}");
        }
    }

    // Main authentication workflow - validates ue_code, calls API, handles response
    // Sends only ue_code and device serial_number for authentication
    private async Task LoginAsync()
    {
        // Clear previous errors
        ErrorMessage = string.Empty;

        // Validate inputs before API call
        if (!ValidateInputs())
        {
            return;
        }

        IsLoading = true;

        try
        {
            // Build authentication request with ue_code and device serial number
            // Serial number is automatically captured from BIOS (plain, not hashed)
            var request = new DeviceAuthenticationRequest
            {
                UeCode = UeCode.Trim(),
                SerialNumber = _deviceInfoService.GetBiosSerialNumber()
            };

            // Call API to authenticate device
            var response = await _apiService.AuthenticateDeviceAsync(request);

            // Handle response based on success flag
            if (response.Success && !string.IsNullOrEmpty(response.JwtToken))
            {
                // Store authentication token for future API calls
                _apiService.SetAuthToken(response.JwtToken);

                // Save token and user data securely
                await SaveAuthenticationData(response);

                // Navigate to connection input window
                var connectionInputWindow = new ConnectionInputWindow();
                connectionInputWindow.Show();

                // Close the login window
                foreach (Window window in Application.Current.Windows)
                {
                    if (window is LoginWindow)
                    {
                        window.Close();
                        break;
                    }
                }
            }
            else
            {
                // Display error from server
                ErrorMessage = response.Error ?? response.Message ?? "Authentication failed. Please try again.";
            }
        }
        catch (HttpRequestException ex)
        {
            // Network or API communication errors
            ErrorMessage = $"Connection error: {ex.Message}";
        }
        catch (Exception ex)
        {
            // Unexpected errors
            ErrorMessage = $"An error occurred: {ex.Message}";
            System.Diagnostics.Debug.WriteLine($"Login error: {ex}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    // Validates organization code input and sets appropriate error messages
    private bool ValidateInputs()
    {
        if (string.IsNullOrWhiteSpace(UeCode))
        {
            ErrorMessage = "Please enter your organization code.";
            return false;
        }

        return true;
    }

    // Saves authentication data securely for persistence across app sessions
    // Uses DPAPI encryption via SecureStorageService
    // Includes ue_code and serial_number for automatic token renewal
    private async Task SaveAuthenticationData(DeviceAuthenticationResponse response)
    {
        try
        {
            // Save all data needed for token renewal
            // Store plain BIOS serial number (not hashed) for token refresh
            await _secureStorageService.SaveAuthenticationAsync(
                response.JwtToken!,
                UeCode.Trim(),
                _deviceInfoService.GetBiosSerialNumber(),
                response.UserId,
                response.DeviceId,
                response.OrganizationId);

            System.Diagnostics.Debug.WriteLine("Auth data saved securely with ue_code and serial_number");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error saving auth data: {ex.Message}");
            // Don't fail login if storage fails - user can re-login later
        }
    }

    // INotifyPropertyChanged implementation for data binding
    public event PropertyChangedEventHandler? PropertyChanged;

    // Helper method to raise property change notifications
    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

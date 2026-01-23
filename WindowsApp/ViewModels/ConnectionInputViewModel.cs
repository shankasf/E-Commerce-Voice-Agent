using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows;
using WindowsApp.Helpers;
using WindowsApp.Models;
using WindowsApp.Services;
using WindowsApp.Views;

namespace WindowsApp.ViewModels
{
    public class ConnectionInputViewModel : INotifyPropertyChanged
    {
        private readonly WebSocketClientService _webSocketClientService;
        private readonly CertificateService _certificateService;
        private readonly ConfigurationService _configService;
        private readonly SecureStorageService _secureStorageService;

        private string _sixDigitCode = string.Empty;
        private string _errorMessage = string.Empty;
        private bool _isLoading;
        private string _connectionStatus = "Disconnected";

        // TaskCompletionSource to wait for authentication result
        private TaskCompletionSource<bool>? _authCompletionSource;

        public ConnectionInputViewModel()
        {
            _webSocketClientService = new WebSocketClientService();
            _certificateService = new CertificateService();
            _configService = ConfigurationService.Instance;
            _secureStorageService = new SecureStorageService();

            // Subscribe to WebSocket events
            _webSocketClientService.Authenticated += OnAuthenticated;
            _webSocketClientService.ErrorReceived += OnErrorReceived;
            _webSocketClientService.Disconnected += OnDisconnected;

            // Initialize command
            ConnectCommand = new RelayCommand(
                execute: async _ => await ConnectAsync(),
                canExecute: _ => CanConnect());
        }

        public string SixDigitCode
        {
            get => _sixDigitCode;
            set
            {
                if (_sixDigitCode != value)
                {
                    _sixDigitCode = value;
                    OnPropertyChanged();
                    (ConnectCommand as RelayCommand)?.RaiseCanExecuteChanged();
                }
            }
        }

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

        public bool IsLoading
        {
            get => _isLoading;
            set
            {
                if (_isLoading != value)
                {
                    _isLoading = value;
                    OnPropertyChanged();
                    (ConnectCommand as RelayCommand)?.RaiseCanExecuteChanged();
                }
            }
        }

        public string ConnectionStatus
        {
            get => _connectionStatus;
            set
            {
                if (_connectionStatus != value)
                {
                    _connectionStatus = value;
                    OnPropertyChanged();
                }
            }
        }

        public bool HasError => !string.IsNullOrEmpty(ErrorMessage);

        public RelayCommand ConnectCommand { get; }

        // Expose WebSocketClientService for ChatWindow to use
        public WebSocketClientService WebSocketClient => _webSocketClientService;

        private bool CanConnect()
        {
            return !IsLoading && !string.IsNullOrWhiteSpace(SixDigitCode) && SixDigitCode.Length == 6;
        }

        private async Task ConnectAsync()
        {
            ErrorMessage = string.Empty;

            if (!ValidateInput())
            {
                return;
            }

            IsLoading = true;
            ConnectionStatus = "Connecting...";

            try
            {
                // Get WebSocket URL from configuration
                var websocketUrl = _configService.GetWebSocketUrl();
                if (string.IsNullOrEmpty(websocketUrl))
                {
                    ErrorMessage = "WebSocket URL not configured in appsettings.json";
                    MessageBox.Show("WebSocket URL not configured", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                System.Diagnostics.Debug.WriteLine($"WebSocket URL: {websocketUrl}");

                // Load client certificate for mTLS (only for wss://)
                System.Security.Cryptography.X509Certificates.X509Certificate2? certificate = null;
                if (websocketUrl.StartsWith("wss://", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        System.Diagnostics.Debug.WriteLine("Loading client certificate for mTLS...");
                        certificate = _certificateService.LoadClientCertificate();
                        System.Diagnostics.Debug.WriteLine($"Certificate loaded: {certificate.Subject}");
                    }
                    catch (Exception certEx)
                    {
                        System.Diagnostics.Debug.WriteLine($"Certificate loading failed: {certEx.Message}");
                        ErrorMessage = $"Certificate error: {certEx.Message}";
                        MessageBox.Show($"Certificate loading failed:\n{certEx.Message}", "Certificate Error", MessageBoxButton.OK, MessageBoxImage.Error);
                        return;
                    }
                }

                // Retrieve stored authentication data (user_id, organization_id, device_id)
                var authData = await _secureStorageService.LoadAuthenticationAsync();
                if (authData == null || !authData.UserId.HasValue || !authData.OrganizationId.HasValue || !authData.DeviceId.HasValue)
                {
                    ErrorMessage = "Authentication data not found. Please login again.";
                    ConnectionStatus = "Disconnected";

                    // Show LoginWindow and close ConnectionInputWindow
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        var loginWindow = new LoginWindow();
                        loginWindow.Show();

                        foreach (Window window in Application.Current.Windows)
                        {
                            if (window is ConnectionInputWindow)
                            {
                                window.Close();
                                break;
                            }
                        }
                    });
                    return;
                }

                System.Diagnostics.Debug.WriteLine($"Auth data loaded - UserId: {authData.UserId}, OrgId: {authData.OrganizationId}, DeviceId: {authData.DeviceId}");

                // Step 1: Connect to WebSocket
                System.Diagnostics.Debug.WriteLine("Connecting to WebSocket...");
                await _webSocketClientService.ConnectAsync(websocketUrl, certificate);
                ConnectionStatus = "Connected, authenticating...";
                System.Diagnostics.Debug.WriteLine("WebSocket connected, sending auth...");

                // Step 2: Send authentication with 6-digit code and user identifiers
                _authCompletionSource = new TaskCompletionSource<bool>();

                await _webSocketClientService.AuthenticateAsync(
                    SixDigitCode,
                    authData.UserId.Value,
                    authData.OrganizationId.Value,
                    authData.DeviceId.Value);

                // Wait for authentication response (with 30 second timeout)
                var authTask = _authCompletionSource.Task;
                var timeoutTask = Task.Delay(TimeSpan.FromSeconds(30));

                var completedTask = await Task.WhenAny(authTask, timeoutTask);

                if (completedTask == timeoutTask)
                {
                    // Timeout
                    ErrorMessage = "Authentication timed out. Please try again.";
                    await _webSocketClientService.DisconnectAsync();
                    ConnectionStatus = "Disconnected";
                    return;
                }

                var authSuccess = await authTask;

                if (authSuccess)
                {
                    // Authentication successful - open ChatWindow
                    ConnectionStatus = "Connected";

                    // Clear the code (security)
                    var code = SixDigitCode;
                    SixDigitCode = string.Empty;

                    // Open ChatWindow on UI thread
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        var chatWindow = new ChatWindow(_webSocketClientService);
                        chatWindow.Show();

                        // Close ConnectionInputWindow
                        foreach (Window window in Application.Current.Windows)
                        {
                            if (window is ConnectionInputWindow)
                            {
                                window.Close();
                                break;
                            }
                        }
                    });
                }
                else
                {
                    // Auth failed - error message already set by OnErrorReceived
                    ConnectionStatus = "Disconnected";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Connection failed: {ex.Message}";
                ConnectionStatus = "Disconnected";
                System.Diagnostics.Debug.WriteLine($"Connection error: {ex}");
                MessageBox.Show($"Connection failed:\n{ex.Message}", "Connection Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                IsLoading = false;
            }
        }

        private void OnAuthenticated(object? sender, ConnectionEstablishedMessage e)
        {
            System.Diagnostics.Debug.WriteLine($"Authenticated! Session: {e.ChatSessionId}");
            _authCompletionSource?.TrySetResult(true);
        }

        private void OnErrorReceived(object? sender, ErrorMessage e)
        {
            System.Diagnostics.Debug.WriteLine($"Error received: [{e.Code}] {e.Message}");

            Application.Current.Dispatcher.Invoke(() =>
            {
                ErrorMessage = GetFriendlyErrorMessage(e.Code, e.Message);
            });

            _authCompletionSource?.TrySetResult(false);
        }

        private void OnDisconnected(object? sender, string reason)
        {
            System.Diagnostics.Debug.WriteLine($"Disconnected: {reason}");

            Application.Current.Dispatcher.Invoke(() =>
            {
                ConnectionStatus = "Disconnected";
                if (string.IsNullOrEmpty(ErrorMessage))
                {
                    ErrorMessage = reason;
                }
            });

            _authCompletionSource?.TrySetResult(false);
        }

        private string GetFriendlyErrorMessage(string code, string message)
        {
            return code switch
            {
                WebSocketErrorCodes.AUTH_REQUIRED => "Authentication required. Please enter the 6-digit code.",
                WebSocketErrorCodes.INVALID_CODE => "Invalid code format. Code must be 6 characters.",
                WebSocketErrorCodes.RATE_LIMITED => "Too many attempts. Please wait a moment and try again.",
                WebSocketErrorCodes.AUTH_FAILED => "Invalid or expired code. Please request a new code.",
                WebSocketErrorCodes.AUTH_TIMEOUT => "Authentication timed out. Please try again.",
                _ => message ?? "An unknown error occurred."
            };
        }

        private bool ValidateInput()
        {
            if (string.IsNullOrWhiteSpace(SixDigitCode))
            {
                ErrorMessage = "Please enter the 6-digit code.";
                return false;
            }

            if (SixDigitCode.Trim().Length != 6)
            {
                ErrorMessage = "Code must be exactly 6 characters.";
                return false;
            }

            return true;
        }

        public event PropertyChangedEventHandler? PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}

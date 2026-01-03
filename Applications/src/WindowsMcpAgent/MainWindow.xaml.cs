using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using Hardcodet.Wpf.TaskbarNotification;
using System.Windows;
using System.Windows.Controls;
using WindowsMcpAgent.Core.Authentication;
using WindowsMcpAgent.Core.Logging;
using WindowsMcpAgent.Core.Mcp;
using WindowsMcpAgent.Core.Models;
using WindowsMcpAgent.Core.Storage;
using WindowsMcpAgent.Core.Tools;
using WindowsMcpAgent.Core.Tools.NetworkTools;
using WindowsMcpAgent.Core.Tools.ServiceTools;
using WindowsMcpAgent.Core.Tools.SystemTools;
using WindowsMcpAgent.Core.Utils;
using Newtonsoft.Json;

namespace WindowsMcpAgent;

public class StatusMessage
{
    public string Time { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ErrorMessage
{
    public string Time { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
}

public class ToolCallLog
{
    public string Time { get; set; } = string.Empty;
    public string ToolName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "success", "error", "pending"
    public string Output { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
    public long ExecutionTimeMs { get; set; }
    public string CallId { get; set; } = string.Empty;
}

public partial class MainWindow : Window
{
    private TaskbarIcon? _taskbarIcon;
    private McpClient? _mcpClient;  // Changed from McpServer to McpClient for reverse connection
    private ToolDispatcher? _toolDispatcher;
    private ToolRegistry? _toolRegistry;
    private ToolAuthorizationEngine? _authorizationEngine;
    private JwtValidator? _jwtValidator;
    private AuditLogger? _auditLogger;
    private LocalStorage? _localStorage;
    private ObservableCollection<StatusMessage> _statusMessages = new();
    private ObservableCollection<ErrorMessage> _errorMessages = new();
    private ObservableCollection<ToolCallLog> _toolCallLogs = new();
    private string? _currentDeviceId;
    private string? _currentBackendUrl;  // Backend WebSocket URL for reverse connection

    public MainWindow()
    {
        InitializeComponent();
        
        // Initialize UI collections
        StatusListBox.ItemsSource = _statusMessages;
        ErrorListBox.ItemsSource = _errorMessages;
        ToolCallLogListBox.ItemsSource = _toolCallLogs;
        
        InitializeApplication();
    }

    private void SetupTaskbarIcon()
    {
        if (_taskbarIcon != null)
        {
            var contextMenu = new ContextMenu();
            
            var showWindowItem = new MenuItem { Header = "Show Window" };
            showWindowItem.Click += (s, e) => ShowWindow();
            contextMenu.Items.Add(showWindowItem);
            
            var exitItem = new MenuItem { Header = "Exit" };
            exitItem.Click += (s, e) => Application.Current.Shutdown();
            contextMenu.Items.Add(exitItem);
            
            _taskbarIcon.ContextMenu = contextMenu;
            _taskbarIcon.TrayMouseDoubleClick += (s, e) => ShowWindow();
        }
    }

    private void ShowWindow()
    {
        this.Show();
        this.WindowState = WindowState.Normal;
        this.Activate();
        RefreshStatus();
    }

    private void InitializeApplication()
    {
        // Create taskbar icon (using default system icon if custom icon not available)
        try
        {
            _taskbarIcon = new TaskbarIcon
            {
                ToolTipText = "Windows MCP Agent - Not Connected"
            };
            // Note: In production, set Icon property to a custom .ico file
            SetupTaskbarIcon();
        }
        catch
        {
            // Fallback if icon creation fails
            _taskbarIcon = new TaskbarIcon
            {
                ToolTipText = "Windows MCP Agent - Not Connected"
            };
            SetupTaskbarIcon();
        }

        // Initialize local storage
        _localStorage = new LocalStorage();

        // Check if device is registered
        if (!_localStorage.IsDeviceRegistered())
        {
            // Show login window for first-time registration
            ShowLoginWindow();
        }
        else
        {
            // Device is registered, proceed with initialization
            // Extract port from stored MCP URL
            var authData = _localStorage.LoadAuthData();
            int? port = null;
            if (authData != null && !string.IsNullOrEmpty(authData.McpUrl))
            {
                try
                {
                    var uri = new Uri(authData.McpUrl);
                    port = uri.Port;
                }
                catch
                {
                    // If URL parsing fails, find a new port
                    port = UrlGenerator.FindAvailablePort();
                }
            }
            else
            {
                port = UrlGenerator.FindAvailablePort();
            }
            
            InitializeCoreComponents(port, authData?.McpUrl);
        }

        // Hide window (tray app)
        this.Hide();
    }

    private void ShowLoginWindow()
    {
        // Get backend API URL from config or environment
        var config = _localStorage?.LoadConfig();
        var backendApiUrl = config?.BackendApiUrl ?? "http://localhost:9000";

        // Get device information
        var deviceId = GetOrCreateDeviceId();
        var deviceName = Environment.MachineName;
        var osVersion = $"{Environment.OSVersion}";

        // For reverse connection, we don't need to generate MCP URL
        // Show login window (mcpUrl is now optional)
        var loginWindow = new LoginWindow(backendApiUrl, deviceId, deviceName, osVersion, null);
        loginWindow.WindowStartupLocation = WindowStartupLocation.CenterScreen;
        
        // Show the window (it was hidden)
        this.Show();
        this.WindowState = WindowState.Normal;
        this.Activate();
        
        var result = loginWindow.ShowDialog();

        if (result == true && loginWindow.RegistrationSuccessful)
        {
            // Registration successful, initialize connection to backend
            this.Hide(); // Hide main window again
            InitializeCoreComponents();
        }
        else
        {
            // User cancelled or registration failed
            _taskbarIcon?.ShowBalloonTip(
                "Registration Required",
                "Device registration is required to use Windows MCP Agent. The application will now close.",
                Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Warning);
            
            // Close application if registration not completed
            Application.Current.Shutdown();
        }
    }

    private void InitializeCoreComponents(int? port = null, string? mcpUrl = null)
    {
        // Load authentication data from storage
        var authData = _localStorage?.LoadAuthData();
        if (authData == null)
        {
            // Should not happen if we checked IsDeviceRegistered, but handle gracefully
            ShowLoginWindow();
            return;
        }

        var deviceId = authData.DeviceId;
        
        // Get backend API URL from config or environment
        var config = _localStorage?.LoadConfig();
        var backendApiUrl = config?.BackendApiUrl ?? "http://localhost:9000";
        
        // Construct backend WebSocket URL for reverse connection
        // Convert http:// to ws:// for WebSocket connection
        var backendWsUrl = backendApiUrl.Replace("http://", "ws://").Replace("https://", "wss://");
        var backendWebSocketUrl = $"{backendWsUrl}/ws/device/{deviceId}";
        
        // Initialize JWT validator (in production, get secret from secure storage)
        var secretKey = Environment.GetEnvironmentVariable("MCP_JWT_SECRET") ?? "default-secret-key-change-in-production";
        _jwtValidator = new JwtValidator(secretKey, deviceId);

        // Initialize audit logger
        _auditLogger = new AuditLogger();

        // Initialize tool registry
        _toolRegistry = new ToolRegistry();
        _authorizationEngine = new ToolAuthorizationEngine(_toolRegistry);

        // Register all tools using service (centralized, maintainable)
        var toolRegistrationService = new WindowsMcpAgent.Core.Services.ToolRegistrationService();
        toolRegistrationService.RegisterAllTools(_toolRegistry);

        // Initialize services
        var notificationService = new WindowsMcpAgent.Core.Services.NotificationService(
            showToastAction: (title, message, type) =>
            {
                // Show toast using TaskbarIcon
                Dispatcher.Invoke(() =>
                {
                    if (_taskbarIcon != null)
                    {
                        var icon = type switch
                        {
                            WindowsMcpAgent.Core.Services.NotificationType.Error => Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Error,
                            WindowsMcpAgent.Core.Services.NotificationType.Warning => Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Warning,
                            WindowsMcpAgent.Core.Services.NotificationType.Success => Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Info,
                            _ => Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Info
                        };
                        _taskbarIcon.ShowBalloonTip(title, message, icon);
                    }
                });
            },
            showErrorAction: (title, message) => ShowError(title, message, ""),
            showCountdownAction: ShowRestartCountdownDialog);
        var idleCheckService = new WindowsMcpAgent.Core.Services.IdleCheckService();
        var schemaValidator = new WindowsMcpAgent.Core.Services.SchemaValidator();
        var stateService = new WindowsMcpAgent.Core.Services.ApplicationStateService();
        stateService.StateChanged += (sender, state) =>
        {
            UpdateApplicationState(state);
        };

        // Initialize tool dispatcher with all services
        _toolDispatcher = new ToolDispatcher(
            _toolRegistry,
            _authorizationEngine,
            _auditLogger,
            schemaValidator,
            notificationService,
            idleCheckService);

        // Store current info for UI
        _currentDeviceId = deviceId;
        _currentBackendUrl = backendWebSocketUrl;

        // Initialize MCP client (connects to backend WebSocket server)
        _mcpClient = new McpClient(_authorizationEngine, _toolRegistry, deviceId, _jwtValidator);
        _mcpClient.ToolCallReceived += OnToolCallReceived;
        _mcpClient.ConnectionStatusChanged += OnConnectionStatusChanged;
        
        _auditLogger.LogConnectionEvent("ApplicationStarted", $"Device ID: {deviceId}, Backend URL: {backendWebSocketUrl}");
        AddStatusMessage("Application started");
        UpdateDeviceInfo(deviceId, backendWebSocketUrl);

        // Connect to backend WebSocket server (reverse connection)
        _ = Task.Run(async () =>
        {
            try
            {
                AddStatusMessage($"Connecting to backend at {backendWebSocketUrl}...");
                await _mcpClient.ConnectAsync(backendWebSocketUrl);
                var successMsg = $"Connected to backend (User: {authData.Username}, Client: {authData.ClientId})";
                _auditLogger?.LogConnectionEvent("ClientConnected", successMsg);
                Dispatcher.Invoke(() =>
                {
                    AddStatusMessage("Connected to backend successfully");
                    UpdateServerStatus("Connected", System.Windows.Media.Brushes.Green);
                });
            }
            catch (Exception ex)
            {
                var errorMsg = $"Connection failed: {ex.Message}";
                _auditLogger?.LogConnectionEvent("ConnectionFailed", errorMsg);
                Dispatcher.Invoke(() =>
                {
                    ShowError("Connection Failed", errorMsg, ex.ToString());
                    UpdateServerStatus("Disconnected", System.Windows.Media.Brushes.Red);
                    _taskbarIcon?.ShowBalloonTip("Connection Error", ex.Message, Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Error);
                });
            }
        });
    }

    // Tool registration is now handled by ToolRegistrationService
    // This ensures centralized, maintainable tool registration following Project_requirements.md

    private async void OnToolCallReceived(object? sender, ToolCallMessage toolCall)
    {
        if (_mcpClient == null || _toolDispatcher == null || _jwtValidator == null)
            return;

        try
        {
            // Log tool call
            AddToolCallLog(toolCall, null, "pending");

            // Update state to executing
            UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState.ExecutingTool);
            AddStatusMessage($"Executing tool: {toolCall.Name}");

            // Validate JWT token from message (in production, extract from headers)
            // For now, parse role from message
            if (!Enum.TryParse<Role>(toolCall.Role, true, out var role))
            {
                await SendErrorResult(toolCall, "Invalid role specified");
                UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState.Blocked);
                UpdateToolCallLogResult(toolCall.Id, "error", null, "Invalid role specified", 0);
                return;
            }

            // Dispatch tool execution
            var result = await _toolDispatcher.DispatchAsync(toolCall, role);
            await _mcpClient.SendToolResultAsync(result);

            // Update tool call log with result
            UpdateToolCallLogResult(toolCall.Id, result.Status, result.Output, result.Error, result.ExecutionTimeMs);

            // Update state based on result
            if (result.Status == "success")
            {
                UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState.WaitingForCommand);
                AddStatusMessage($"Tool {toolCall.Name} executed successfully");
            }
            else
            {
                UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState.Blocked);
                AddStatusMessage($"Tool {toolCall.Name} failed: {result.Error}");
            }
        }
        catch (Exception ex)
        {
            UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState.Error);
            AddStatusMessage($"Error executing {toolCall.Name}: {ex.Message}");
            UpdateToolCallLogResult(toolCall.Id, "error", null, ex.Message, 0);
            await SendErrorResult(toolCall, ex.Message);
        }
    }

    private async Task SendErrorResult(ToolCallMessage toolCall, string error)
    {
        if (_mcpClient == null) return;

        var result = new ToolResultMessage
        {
            Id = toolCall.Id,
            Type = "tool_result",
            Status = "error",
            Error = error
        };

        await _mcpClient.SendToolResultAsync(result);
    }

    private void OnConnectionStatusChanged(object? sender, string status)
    {
        Dispatcher.Invoke(() =>
        {
            if (_taskbarIcon != null)
            {
                _taskbarIcon.ToolTipText = $"Windows MCP Agent - {status}";
            }

            ConnectionText.Text = status;
            StatusText.Text = status;
            
            AddStatusMessage(status);
            
            // Update application state based on connection status
            if (status.Contains("Connected", StringComparison.OrdinalIgnoreCase))
            {
                UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState.Connected);
            }
            else if (status.Contains("Disconnected", StringComparison.OrdinalIgnoreCase))
            {
                UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState.Disconnected);
            }
            else if (status.ToLower().Contains("error") || status.ToLower().Contains("failed"))
            {
                UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState.Error);
                ShowError("Connection Error", status, "");
            }
            
            _auditLogger?.LogConnectionEvent("StatusChanged", status);
        });
    }

    private void UpdateApplicationState(WindowsMcpAgent.Core.Services.ApplicationState state)
    {
        Dispatcher.Invoke(() =>
        {
            // Update UI based on state
            var stateText = state switch
            {
                WindowsMcpAgent.Core.Services.ApplicationState.Connected => "Connected",
                WindowsMcpAgent.Core.Services.ApplicationState.WaitingForCommand => "Waiting for command",
                WindowsMcpAgent.Core.Services.ApplicationState.ExecutingTool => "Executing tool",
                WindowsMcpAgent.Core.Services.ApplicationState.Blocked => "Blocked",
                WindowsMcpAgent.Core.Services.ApplicationState.Disconnected => "Disconnected",
                WindowsMcpAgent.Core.Services.ApplicationState.Error => "Error",
                _ => "Initializing"
            };

            var stateColor = state switch
            {
                WindowsMcpAgent.Core.Services.ApplicationState.Connected => System.Windows.Media.Brushes.Green,
                WindowsMcpAgent.Core.Services.ApplicationState.WaitingForCommand => System.Windows.Media.Brushes.Blue,
                WindowsMcpAgent.Core.Services.ApplicationState.ExecutingTool => System.Windows.Media.Brushes.Orange,
                WindowsMcpAgent.Core.Services.ApplicationState.Blocked => System.Windows.Media.Brushes.Red,
                WindowsMcpAgent.Core.Services.ApplicationState.Disconnected => System.Windows.Media.Brushes.Gray,
                WindowsMcpAgent.Core.Services.ApplicationState.Error => System.Windows.Media.Brushes.Red,
                _ => System.Windows.Media.Brushes.Gray
            };

            UpdateServerStatus(stateText, stateColor);
        });
    }

    private bool ShowRestartCountdownDialog(int delaySeconds)
    {
        bool result = false;
        bool cancelled = false;

        Dispatcher.Invoke(() =>
        {
            var countdownWindow = new Views.RestartCountdownWindow(delaySeconds);
            countdownWindow.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            var dialogResult = countdownWindow.ShowDialog();
            result = dialogResult == true && !countdownWindow.WasCancelled;
            cancelled = countdownWindow.WasCancelled;
            
            if (cancelled)
            {
                // Cancel the restart
                try
                {
                    var cancelProcess = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "shutdown",
                        Arguments = "/a",  // Abort shutdown
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    System.Diagnostics.Process.Start(cancelProcess);
                    AddStatusMessage("System restart cancelled by user");
                }
                catch (Exception ex)
                {
                    AddStatusMessage($"Failed to cancel restart: {ex.Message}");
                }
            }
        });

        return result;
    }

    private void AddStatusMessage(string message)
    {
        Dispatcher.Invoke(() =>
        {
            _statusMessages.Insert(0, new StatusMessage
            {
                Time = DateTime.Now.ToString("HH:mm:ss"),
                Message = message
            });
            
            // Keep only last 50 messages
            while (_statusMessages.Count > 50)
            {
                _statusMessages.RemoveAt(_statusMessages.Count - 1);
            }
        });
    }

    private void ShowError(string title, string message, string details)
    {
        Dispatcher.Invoke(() =>
        {
            ErrorTextBlock.Text = $"{title}: {message}";
            ErrorDetailsTextBlock.Text = details;
            ErrorBorder.Visibility = Visibility.Visible;
            
            // Add to error log
            _errorMessages.Insert(0, new ErrorMessage
            {
                Time = DateTime.Now.ToString("HH:mm:ss"),
                Message = $"{title}: {message}",
                Details = details
            });
            
            // Keep only last 50 errors
            while (_errorMessages.Count > 50)
            {
                _errorMessages.RemoveAt(_errorMessages.Count - 1);
            }
        });
    }

    private void UpdateDeviceInfo(string deviceId, string backendUrl)
    {
        Dispatcher.Invoke(() =>
        {
            DeviceIdText.Text = deviceId;
            McpUrlText.Text = backendUrl;
            // Port is not relevant for reverse connection, show "N/A" or hide
            PortText.Text = "N/A";
        });
    }

    private void UpdateServerStatus(string status, System.Windows.Media.Brush color)
    {
        Dispatcher.Invoke(() =>
        {
            ServerStatusText.Text = status;
            ServerStatusText.Foreground = color;
        });
    }

    private void RefreshStatus()
    {
        if (_currentDeviceId != null && _currentBackendUrl != null)
        {
            UpdateDeviceInfo(_currentDeviceId, _currentBackendUrl);
        }
        
        // Check client connection status
        if (_mcpClient != null)
        {
            UpdateServerStatus("Connected", System.Windows.Media.Brushes.Green);
        }
        else
        {
            UpdateServerStatus("Disconnected", System.Windows.Media.Brushes.Red);
        }
    }

    private void RefreshStatusButton_Click(object sender, RoutedEventArgs e)
    {
        RefreshStatus();
        AddStatusMessage("Status refreshed");
    }

    private void ClearLogsButton_Click(object sender, RoutedEventArgs e)
    {
        _statusMessages.Clear();
        _errorMessages.Clear();
        _toolCallLogs.Clear();
        AddStatusMessage("Logs cleared");
    }

    private void CloseToTrayButton_Click(object sender, RoutedEventArgs e)
    {
        this.Hide();
    }

    private void DismissErrorButton_Click(object sender, RoutedEventArgs e)
    {
        ErrorBorder.Visibility = Visibility.Collapsed;
    }

    private void AddToolCallLog(ToolCallMessage toolCall, ToolResultMessage? result, string status)
    {
        Dispatcher.Invoke(() =>
        {
            var log = new ToolCallLog
            {
                Time = DateTime.Now.ToString("HH:mm:ss.fff"),
                ToolName = toolCall.Name,
                Role = toolCall.Role,
                Arguments = JsonConvert.SerializeObject(toolCall.Arguments, Newtonsoft.Json.Formatting.Indented),
                Status = status,
                CallId = toolCall.Id,
                ExecutionTimeMs = result?.ExecutionTimeMs ?? 0
            };

            if (result != null)
            {
                log.Output = result.Output ?? string.Empty;
                log.Error = result.Error ?? string.Empty;
            }

            _toolCallLogs.Insert(0, log);

            // Keep only last 100 tool call logs
            while (_toolCallLogs.Count > 100)
            {
                _toolCallLogs.RemoveAt(_toolCallLogs.Count - 1);
            }
        });
    }

    private void UpdateToolCallLogResult(string callId, string status, string? output, string? error, long executionTimeMs)
    {
        Dispatcher.Invoke(() =>
        {
            var log = _toolCallLogs.FirstOrDefault(l => l.CallId == callId);
            if (log != null)
            {
                log.Status = status;
                log.Output = output ?? string.Empty;
                log.Error = error ?? string.Empty;
                log.ExecutionTimeMs = executionTimeMs;
            }
        });
    }

    private string GetOrCreateDeviceId()
    {
        // In production, store this securely (e.g., in registry or encrypted file)
        var deviceIdPath = System.IO.Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "WindowsMcpAgent",
            "device.id");

        if (System.IO.File.Exists(deviceIdPath))
        {
            return System.IO.File.ReadAllText(deviceIdPath);
        }

        var deviceId = Guid.NewGuid().ToString();
        var directory = System.IO.Path.GetDirectoryName(deviceIdPath);
        if (directory != null && !System.IO.Directory.Exists(directory))
        {
            System.IO.Directory.CreateDirectory(directory);
        }

        System.IO.File.WriteAllText(deviceIdPath, deviceId);
        return deviceId;
    }

    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        // Hide window instead of closing
        e.Cancel = true;
        this.Hide();
    }
}

// Value converters for tool call log display
public class StatusToBackgroundConverter : System.Windows.Data.IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        if (value is string status)
        {
            return status switch
            {
                "success" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(232, 245, 233)), // Light green
                "error" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(255, 235, 238)), // Light red
                "pending" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(255, 243, 224)), // Light orange
                _ => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.White)
            };
        }
        return new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.White);
    }

    public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class StatusToBorderConverter : System.Windows.Data.IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        if (value is string status)
        {
            return status switch
            {
                "success" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(76, 175, 80)), // Green
                "error" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(198, 40, 40)), // Red
                "pending" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(255, 152, 0)), // Orange
                _ => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(200, 200, 200))
            };
        }
        return new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(200, 200, 200));
    }

    public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class StatusToBadgeBackgroundConverter : System.Windows.Data.IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        if (value is string status)
        {
            return status switch
            {
                "success" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(76, 175, 80)), // Green
                "error" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(198, 40, 40)), // Red
                "pending" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(255, 152, 0)), // Orange
                _ => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(158, 158, 158))
            };
        }
        return new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(158, 158, 158));
    }

    public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class StatusToTextColorConverter : System.Windows.Data.IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        if (value is string status)
        {
            return status switch
            {
                "success" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.White),
                "error" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.White),
                "pending" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.White),
                _ => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.White)
            };
        }
        return new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.White);
    }

    public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class StringToVisibilityConverter : System.Windows.Data.IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        if (value is string str && !string.IsNullOrWhiteSpace(str))
        {
            return Visibility.Visible;
        }
        return Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}


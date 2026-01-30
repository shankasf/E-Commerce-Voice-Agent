using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
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
    // Represents a chat message in the UI
    public class ChatMessageViewModel
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string DisplayName { get; set; } = string.Empty;
    }

    // Represents an execution entry in the right pane
    public class ExecutionEntryViewModel : INotifyPropertyChanged
    {
        private string _status = "pending";
        private string _output = string.Empty;
        private string _error = string.Empty;

        public string CommandId { get; set; } = string.Empty;
        public string Command { get; set; } = string.Empty;

        public string Status
        {
            get => _status;
            set
            {
                if (_status != value)
                {
                    _status = value;
                    OnPropertyChanged();
                }
            }
        }

        public string Output
        {
            get => _output;
            set
            {
                if (_output != value)
                {
                    _output = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(HasOutput));
                }
            }
        }

        public string Error
        {
            get => _error;
            set
            {
                if (_error != value)
                {
                    _error = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(HasError));
                }
            }
        }

        public bool HasOutput => !string.IsNullOrEmpty(Output);
        public bool HasError => !string.IsNullOrEmpty(Error);
        public DateTime Timestamp { get; set; }

        public event PropertyChangedEventHandler? PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    public class ChatViewModel : INotifyPropertyChanged
    {
        private readonly WebSocketClientService _webSocketClient;
        private readonly PowerShellService _powerShellService;

        private string _messageInput = string.Empty;
        private string _connectionStatus = "Connected";
        private bool _isConnected = true;
        private bool _isExecuting;

        public ChatViewModel(WebSocketClientService webSocketClient)
        {
            _webSocketClient = webSocketClient;
            _powerShellService = new PowerShellService();
            ChatMessages = new ObservableCollection<ChatMessageViewModel>();
            ExecutionEntries = new ObservableCollection<ExecutionEntryViewModel>();

            // Subscribe to WebSocket events
            _webSocketClient.ChatHistoryReceived += OnChatHistoryReceived;
            _webSocketClient.ChatMessageReceived += OnChatMessageReceived;
            _webSocketClient.PowerShellRequestReceived += OnPowerShellRequestReceived;
            _webSocketClient.Disconnected += OnDisconnected;
            _webSocketClient.ErrorReceived += OnErrorReceived;

            // Initialize commands
            SendMessageCommand = new RelayCommand(
                execute: async _ => await SendMessageAsync(),
                canExecute: _ => CanSendMessage);

            DisconnectCommand = new RelayCommand(
                execute: async _ => await DisconnectAsync(),
                canExecute: _ => _isConnected);

            // Set initial connection status
            ConnectionStatus = _webSocketClient.IsAuthenticated ? "Connected" : "Connecting...";
            _isConnected = _webSocketClient.IsAuthenticated;

            // Load any pending chat history that arrived before we subscribed
            if (_webSocketClient.PendingChatHistory != null)
            {
                System.Diagnostics.Debug.WriteLine($"Loading pending chat history: {_webSocketClient.PendingChatHistory.Messages.Count} messages");
                foreach (var msg in _webSocketClient.PendingChatHistory.Messages)
                {
                    AddMessage(msg.Role, msg.Content, msg.Timestamp);
                }
            }
        }

        // Chat messages for left pane
        public ObservableCollection<ChatMessageViewModel> ChatMessages { get; }

        // Execution entries for right pane
        public ObservableCollection<ExecutionEntryViewModel> ExecutionEntries { get; }

        public string MessageInput
        {
            get => _messageInput;
            set
            {
                if (_messageInput != value)
                {
                    _messageInput = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(CanSendMessage));
                    OnPropertyChanged(nameof(IsInputEmpty));
                    (SendMessageCommand as RelayCommand)?.RaiseCanExecuteChanged();
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

        public bool CanSendMessage => _isConnected && !string.IsNullOrWhiteSpace(MessageInput);

        public bool IsConnected
        {
            get => _isConnected;
            private set
            {
                if (_isConnected != value)
                {
                    _isConnected = value;
                    OnPropertyChanged();
                }
            }
        }

        public bool IsExecuting
        {
            get => _isExecuting;
            private set
            {
                if (_isExecuting != value)
                {
                    _isExecuting = value;
                    OnPropertyChanged();
                }
            }
        }

        public bool HasNoExecutions => ExecutionEntries.Count == 0;

        public bool IsInputEmpty => string.IsNullOrWhiteSpace(MessageInput);

        public RelayCommand SendMessageCommand { get; }
        public RelayCommand DisconnectCommand { get; }

        // Event to request UI to scroll to bottom
        public event EventHandler? ScrollToBottomRequested;
        public event EventHandler? ExecutionScrollRequested;

        private async Task SendMessageAsync()
        {
            if (string.IsNullOrWhiteSpace(MessageInput))
                return;

            var content = MessageInput.Trim();
            MessageInput = string.Empty;

            try
            {
                // Add message to UI immediately
                AddMessage("user", content, DateTime.Now);

                // Send via WebSocket
                await _webSocketClient.SendChatMessageAsync(content);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to send message: {ex.Message}");
                AddMessage("system", $"Failed to send message: {ex.Message}", DateTime.Now);
            }
        }

        public async Task DisconnectAsync()
        {
            try
            {
                IsConnected = false;
                ConnectionStatus = "Disconnecting...";
                await _webSocketClient.DisconnectAsync();
                ConnectionStatus = "Disconnected";

                // Close the chat window and return to connection input
                Application.Current.Dispatcher.Invoke(() =>
                {
                    var connectionWindow = new ConnectionInputWindow();
                    connectionWindow.Show();

                    foreach (Window window in Application.Current.Windows)
                    {
                        if (window is ChatWindow)
                        {
                            window.Close();
                            break;
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error disconnecting: {ex.Message}");
            }
        }

        private void OnChatHistoryReceived(object? sender, ChatHistoryMessage e)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                foreach (var msg in e.Messages)
                {
                    // Generate display name based on role
                    string displayName = GetDisplayNameForRole(msg.Role, null);
                    AddMessage(msg.Role, msg.Content, msg.Timestamp, displayName);
                }
            });
        }

        private void OnChatMessageReceived(object? sender, AssistantChatMessage e)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                // Extract display name from metadata if available
                string displayName = GetDisplayNameForRole(e.Role, e.Metadata);
                AddMessage(e.Role, e.Content, e.Timestamp, displayName);
            });
        }

        private void OnPowerShellRequestReceived(object? sender, PowerShellRequestMessage e)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                // Add command to execution pane as pending
                AddExecutionEntry(e.CommandId, e.Command, "pending");

                if (e.RequiresConsent)
                {
                    // Show consent dialog for commands that require approval
                    var result = MessageBox.Show(
                        $"The AI assistant wants to execute the following command:\n\n{e.Command}\n\nDescription: {e.Description}\n\nDo you want to allow this?",
                        "Command Execution Request",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Question);

                    if (result == MessageBoxResult.Yes)
                    {
                        // User approved - execute the command (fire and await properly)
                        _ = ExecutePowerShellCommandAsync(e);
                    }
                    else
                    {
                        // User declined
                        UpdateExecutionEntry(e.CommandId, "error", error: "User declined execution");
                        _ = SendDeclinedResultAsync(e.CommandId, "User chose not to run this command");
                    }
                }
                else
                {
                    // No consent required - execute immediately
                    _ = ExecutePowerShellCommandAsync(e);
                }
            });
        }

        private async Task ExecutePowerShellCommandAsync(PowerShellRequestMessage request)
        {
            // Update status to running
            UpdateExecutionEntry(request.CommandId, "running");
            IsExecuting = true;

            System.Diagnostics.Debug.WriteLine($"[DEBUG] Starting PowerShell execution for command_id={request.CommandId}");

            try
            {
                // Execute PowerShell command on a background thread to avoid blocking UI
                System.Diagnostics.Debug.WriteLine($"[DEBUG] Executing command: {request.Command}");
                var result = await Task.Run(() => _powerShellService.ExecuteAsync(request.Command)).ConfigureAwait(false);
                System.Diagnostics.Debug.WriteLine($"[DEBUG] Execution complete. Success={result.Success}, Output length={result.Output?.Length ?? 0}");

                // Update UI on dispatcher thread
                Application.Current.Dispatcher.Invoke(() =>
                {
                    if (result.Success)
                    {
                        UpdateExecutionEntry(request.CommandId, "success", output: result.Output);
                    }
                    else
                    {
                        UpdateExecutionEntry(request.CommandId, "error", error: result.Error);
                    }
                });

                // Send result back to server
                PowerShellResultMessage resultMessage;
                if (result.Success)
                {
                    resultMessage = PowerShellResultMessage.Success(request.CommandId, result.Output ?? string.Empty);
                }
                else
                {
                    resultMessage = PowerShellResultMessage.CreateError(request.CommandId, result.Error ?? "Unknown error");
                }

                // Log the JSON being sent
                var jsonToSend = Newtonsoft.Json.JsonConvert.SerializeObject(resultMessage);
                System.Diagnostics.Debug.WriteLine($"[DEBUG] Sending PowerShell result JSON: {jsonToSend}");

                // Check WebSocket state before sending
                System.Diagnostics.Debug.WriteLine($"[DEBUG] WebSocket IsConnected={_webSocketClient.IsConnected}, IsAuthenticated={_webSocketClient.IsAuthenticated}");

                await _webSocketClient.SendPowerShellResultAsync(resultMessage).ConfigureAwait(false);

                System.Diagnostics.Debug.WriteLine($"[DEBUG] SendPowerShellResultAsync completed successfully");

                // Update UI with confirmation
                Application.Current.Dispatcher.Invoke(() =>
                {
                    var statusText = result.Success ? "SUCCESS" : "ERROR";
                    UpdateExecutionEntry(request.CommandId, result.Success ? "success" : "error",
                        output: result.Output + $"\n\n[Result sent to server: status={statusText}]");
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("Not connected") || ex.Message.Contains("not authenticated"))
            {
                // WebSocket disconnected - log and update UI
                System.Diagnostics.Debug.WriteLine($"[DEBUG ERROR] WebSocket disconnected, cannot send result: {ex.Message}");
                Application.Current.Dispatcher.Invoke(() =>
                {
                    UpdateExecutionEntry(request.CommandId, "error",
                        error: $"Failed to send result to server: Connection lost. {ex.Message}");
                    AddMessage("system", "Connection lost. Unable to send command result to server.", DateTime.Now);
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[DEBUG ERROR] PowerShell execution error: {ex.Message}\nStack: {ex.StackTrace}");

                Application.Current.Dispatcher.Invoke(() =>
                {
                    UpdateExecutionEntry(request.CommandId, "error", error: ex.Message);
                });

                // Try to send error result to server
                try
                {
                    var errorResult = PowerShellResultMessage.CreateError(request.CommandId, ex.Message);
                    var jsonToSend = Newtonsoft.Json.JsonConvert.SerializeObject(errorResult);
                    System.Diagnostics.Debug.WriteLine($"[DEBUG] Sending error result JSON: {jsonToSend}");

                    await _webSocketClient.SendPowerShellResultAsync(errorResult).ConfigureAwait(false);

                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        UpdateExecutionEntry(request.CommandId, "error",
                            error: ex.Message + $"\n\n[Error sent to server]");
                    });
                }
                catch (Exception sendEx)
                {
                    System.Diagnostics.Debug.WriteLine($"[DEBUG ERROR] Failed to send error to server: {sendEx.Message}");
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        UpdateExecutionEntry(request.CommandId, "error",
                            error: ex.Message + $"\n\n[Failed to send to server: {sendEx.Message}]");
                    });
                }
            }
            finally
            {
                // Ensure IsExecuting is updated on UI thread
                Application.Current.Dispatcher.Invoke(() =>
                {
                    // Update IsExecuting based on whether any command is still running
                    IsExecuting = false;
                    foreach (var entry in ExecutionEntries)
                    {
                        if (entry.Status == "running")
                        {
                            IsExecuting = true;
                            break;
                        }
                    }
                });
            }
        }

        private async Task SendDeclinedResultAsync(string commandId, string reason)
        {
            try
            {
                var result = PowerShellResultMessage.Declined(commandId, reason);
                var jsonToSend = Newtonsoft.Json.JsonConvert.SerializeObject(result);
                System.Diagnostics.Debug.WriteLine($"[DEBUG] Sending declined result JSON: {jsonToSend}");
                System.Diagnostics.Debug.WriteLine($"[DEBUG] WebSocket IsConnected={_webSocketClient.IsConnected}, IsAuthenticated={_webSocketClient.IsAuthenticated}");

                await _webSocketClient.SendPowerShellResultAsync(result).ConfigureAwait(false);

                System.Diagnostics.Debug.WriteLine($"[DEBUG] Declined result sent successfully");

                // Update UI with confirmation
                Application.Current.Dispatcher.Invoke(() =>
                {
                    UpdateExecutionEntry(commandId, "error",
                        error: reason + $"\n\n[Declined sent to server]");
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[DEBUG ERROR] Failed to send declined result: {ex.Message}\nStack: {ex.StackTrace}");
                Application.Current.Dispatcher.Invoke(() =>
                {
                    UpdateExecutionEntry(commandId, "error",
                        error: reason + $"\n\n[Failed to send declined to server: {ex.Message}]");
                });
            }
        }

        private void OnDisconnected(object? sender, string reason)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                IsConnected = false;
                ConnectionStatus = "Disconnected";
                AddMessage("system", $"Disconnected: {reason}", DateTime.Now);
                (DisconnectCommand as RelayCommand)?.RaiseCanExecuteChanged();
                (SendMessageCommand as RelayCommand)?.RaiseCanExecuteChanged();
            });
        }

        private void OnErrorReceived(object? sender, ErrorMessage e)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                AddMessage("system", $"Error: {e.Message}", DateTime.Now);
            });
        }

        private void AddMessage(string role, string content, DateTime timestamp, string displayName = "")
        {
            // If no display name provided, generate one based on role
            if (string.IsNullOrEmpty(displayName))
            {
                displayName = GetDisplayNameForRole(role, null);
            }

            ChatMessages.Add(new ChatMessageViewModel
            {
                Role = role,
                Content = content,
                Timestamp = timestamp,
                DisplayName = displayName
            });

            ScrollToBottomRequested?.Invoke(this, EventArgs.Empty);
        }

        private string GetDisplayNameForRole(string role, Dictionary<string, object>? metadata)
        {
            switch (role)
            {
                case "user":
                    return "You";
                case "assistant":
                case "ai_agent":
                    return "🤖 AI Assistant";
                case "human_agent":
                    // Try to get agent name from metadata
                    if (metadata != null && metadata.TryGetValue("agent_name", out var agentName))
                    {
                        return $"🔧 {agentName}";
                    }
                    return "🔧 Technician";
                case "system":
                    return "System";
                default:
                    return "Unknown";
            }
        }

        // Add execution entry to right pane
        private void AddExecutionEntry(string commandId, string command, string status = "pending")
        {
            var entry = new ExecutionEntryViewModel
            {
                CommandId = commandId,
                Command = command,
                Status = status,
                Timestamp = DateTime.Now
            };

            ExecutionEntries.Add(entry);
            OnPropertyChanged(nameof(HasNoExecutions));
            ExecutionScrollRequested?.Invoke(this, EventArgs.Empty);
        }

        // Update existing execution entry
        private void UpdateExecutionEntry(string commandId, string status, string? output = null, string? error = null)
        {
            foreach (var entry in ExecutionEntries)
            {
                if (entry.CommandId == commandId)
                {
                    entry.Status = status;
                    if (output != null) entry.Output = output;
                    if (error != null) entry.Error = error;
                    break;
                }
            }

            // Update IsExecuting based on whether any command is still running
            IsExecuting = false;
            foreach (var entry in ExecutionEntries)
            {
                if (entry.Status == "running")
                {
                    IsExecuting = true;
                    break;
                }
            }

            ExecutionScrollRequested?.Invoke(this, EventArgs.Empty);
        }

        public event PropertyChangedEventHandler? PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}

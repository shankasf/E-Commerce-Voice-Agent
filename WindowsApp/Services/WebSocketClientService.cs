using System;
using System.Net.WebSockets;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Timers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using WindowsApp.Models;

namespace WindowsApp.Services;

// WebSocket client service for connecting to the AI support service
// Handles authentication, heartbeat, and message routing
public class WebSocketClientService : IDisposable
{
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _cancellationTokenSource;
    private System.Timers.Timer? _heartbeatTimer;
    private readonly SemaphoreSlim _sendLock = new(1, 1);

    private const int HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
    private const int AUTH_TIMEOUT_MS = 30000; // 30 seconds

    // Connection state
    public bool IsConnected => _webSocket?.State == WebSocketState.Open;
    public bool IsAuthenticated { get; private set; }
    public string? ChatSessionId { get; private set; }
    public int? DeviceId { get; private set; }
    public int? UserId { get; private set; }

    // Store pending chat history for late subscribers
    public ChatHistoryMessage? PendingChatHistory { get; private set; }

    // Events
    public event EventHandler? Connected;
    public event EventHandler<ConnectionEstablishedMessage>? Authenticated;
    public event EventHandler<string>? Disconnected;
    public event EventHandler<ErrorMessage>? ErrorReceived;
    public event EventHandler<ChatHistoryMessage>? ChatHistoryReceived;
    public event EventHandler<AssistantChatMessage>? ChatMessageReceived;
    public event EventHandler<PowerShellRequestMessage>? PowerShellRequestReceived;
    public event EventHandler? HeartbeatAckReceived;

    // Connect to WebSocket server with mTLS
    public async Task ConnectAsync(string websocketUrl, X509Certificate2? certificate = null)
    {
        try
        {
            // Validate URL
            if (string.IsNullOrEmpty(websocketUrl))
                throw new ArgumentException("WebSocket URL cannot be empty", nameof(websocketUrl));

            // Dispose existing connection
            await DisconnectAsync();

            // Create new WebSocket client
            _webSocket = new ClientWebSocket();
            _cancellationTokenSource = new CancellationTokenSource();

            // Add client certificate for mTLS if provided
            if (certificate != null)
            {
                _webSocket.Options.ClientCertificates.Add(certificate);
                System.Diagnostics.Debug.WriteLine($"Using client certificate: {certificate.Subject}");
            }

            // Configure WebSocket options
            _webSocket.Options.KeepAliveInterval = TimeSpan.FromSeconds(30);

            System.Diagnostics.Debug.WriteLine($"Connecting to WebSocket: {websocketUrl}");

            // Connect
            await _webSocket.ConnectAsync(new Uri(websocketUrl), _cancellationTokenSource.Token);

            System.Diagnostics.Debug.WriteLine("WebSocket connected, starting message receiver...");

            // Raise Connected event
            Connected?.Invoke(this, EventArgs.Empty);

            // Start receiving messages in background
            _ = Task.Run(() => ReceiveMessagesAsync(_cancellationTokenSource.Token));
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"WebSocket connection failed: {ex.Message}");
            throw new InvalidOperationException($"Failed to connect to WebSocket: {ex.Message}", ex);
        }
    }

    // Send authentication message with 6-digit code and user identifiers
    public async Task<bool> AuthenticateAsync(string code, int userId, int organizationId, int deviceId)
    {
        if (!IsConnected)
            throw new InvalidOperationException("WebSocket is not connected");

        try
        {
            var authMessage = new AuthMessage(code.ToUpper().Trim(), userId, organizationId, deviceId);
            await SendMessageAsync(authMessage);
            System.Diagnostics.Debug.WriteLine($"Auth message sent with code: {code}, userId: {userId}, orgId: {organizationId}, deviceId: {deviceId}");
            return true;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to send auth message: {ex.Message}");
            throw;
        }
    }

    // Send a chat message to the server
    public async Task SendChatMessageAsync(string content)
    {
        if (!IsConnected || !IsAuthenticated)
            throw new InvalidOperationException("Not connected or not authenticated");

        var chatMessage = new UserChatMessage(content);
        await SendMessageAsync(chatMessage);
        System.Diagnostics.Debug.WriteLine($"Chat message sent: {content}");
    }

    // Send PowerShell result back to server
    public async Task SendPowerShellResultAsync(PowerShellResultMessage result)
    {
        if (!IsConnected || !IsAuthenticated)
            throw new InvalidOperationException("Not connected or not authenticated");

        await SendMessageAsync(result);
        System.Diagnostics.Debug.WriteLine($"PowerShell result sent: {result.CommandId}, status: {result.Status}");
    }

    // Send any WebSocket message
    private async Task SendMessageAsync(object message)
    {
        System.Diagnostics.Debug.WriteLine($"[WS SEND] Starting SendMessageAsync, WebSocket state: {_webSocket?.State}");

        if (_webSocket == null || _webSocket.State != WebSocketState.Open)
        {
            System.Diagnostics.Debug.WriteLine($"[WS SEND ERROR] WebSocket not open! State: {_webSocket?.State}");
            throw new InvalidOperationException("WebSocket is not connected");
        }

        System.Diagnostics.Debug.WriteLine($"[WS SEND] Waiting for send lock...");
        await _sendLock.WaitAsync();
        System.Diagnostics.Debug.WriteLine($"[WS SEND] Got send lock");

        try
        {
            var json = JsonConvert.SerializeObject(message);
            var bytes = Encoding.UTF8.GetBytes(json);

            System.Diagnostics.Debug.WriteLine($"[WS SEND] Sending {bytes.Length} bytes: {json}");

            await _webSocket.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                endOfMessage: true,
                _cancellationTokenSource!.Token);

            System.Diagnostics.Debug.WriteLine($"[WS SEND] SendAsync completed successfully");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[WS SEND ERROR] Exception during send: {ex.Message}\nStack: {ex.StackTrace}");
            throw;
        }
        finally
        {
            _sendLock.Release();
            System.Diagnostics.Debug.WriteLine($"[WS SEND] Released send lock");
        }
    }

    // Start heartbeat timer - call after successful authentication
    public void StartHeartbeat()
    {
        StopHeartbeat();

        _heartbeatTimer = new System.Timers.Timer(HEARTBEAT_INTERVAL_MS);
        _heartbeatTimer.Elapsed += async (sender, e) => await SendHeartbeatAsync();
        _heartbeatTimer.AutoReset = true;
        _heartbeatTimer.Start();

        System.Diagnostics.Debug.WriteLine("Heartbeat timer started (30 second interval)");
    }

    // Stop heartbeat timer
    public void StopHeartbeat()
    {
        if (_heartbeatTimer != null)
        {
            _heartbeatTimer.Stop();
            _heartbeatTimer.Dispose();
            _heartbeatTimer = null;
            System.Diagnostics.Debug.WriteLine("Heartbeat timer stopped");
        }
    }

    // Send heartbeat message
    private async Task SendHeartbeatAsync()
    {
        try
        {
            if (IsConnected && IsAuthenticated)
            {
                var heartbeat = new HeartbeatMessage();
                await SendMessageAsync(heartbeat);
                System.Diagnostics.Debug.WriteLine("Heartbeat sent");
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to send heartbeat: {ex.Message}");
        }
    }

    // Receive and process messages from server
    private async Task ReceiveMessagesAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];
        var messageBuilder = new StringBuilder();

        try
        {
            while (_webSocket != null && _webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    System.Diagnostics.Debug.WriteLine("Server initiated close");
                    await DisconnectAsync();
                    Disconnected?.Invoke(this, "Server closed the connection");
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    messageBuilder.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                    if (result.EndOfMessage)
                    {
                        var json = messageBuilder.ToString();
                        messageBuilder.Clear();

                        System.Diagnostics.Debug.WriteLine($"Received: {json}");
                        ProcessMessage(json);
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            System.Diagnostics.Debug.WriteLine("Receive operation cancelled");
        }
        catch (WebSocketException ex)
        {
            System.Diagnostics.Debug.WriteLine($"WebSocket error: {ex.Message}");
            Disconnected?.Invoke(this, $"Connection error: {ex.Message}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Unexpected error in receive loop: {ex.Message}");
        }
    }

    // Process incoming message and route to appropriate handler
    private void ProcessMessage(string json)
    {
        try
        {
            var jObject = JObject.Parse(json);
            var messageType = jObject["type"]?.ToString();

            switch (messageType)
            {
                case WebSocketMessageTypes.ConnectionEstablished:
                    HandleConnectionEstablished(jObject);
                    break;

                case WebSocketMessageTypes.Error:
                    HandleError(jObject);
                    break;

                case WebSocketMessageTypes.HeartbeatAck:
                    HandleHeartbeatAck();
                    break;

                case WebSocketMessageTypes.ChatHistory:
                    HandleChatHistory(jObject);
                    break;

                case WebSocketMessageTypes.Chat:
                    HandleChatMessage(jObject);
                    break;

                case WebSocketMessageTypes.PowerShellRequest:
                    HandlePowerShellRequest(jObject);
                    break;

                default:
                    System.Diagnostics.Debug.WriteLine($"Unknown message type: {messageType}");
                    break;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to process message: {ex.Message}");
        }
    }

    private void HandleConnectionEstablished(JObject jObject)
    {
        var message = jObject.ToObject<ConnectionEstablishedMessage>();
        if (message != null)
        {
            IsAuthenticated = true;
            DeviceId = message.DeviceId;
            UserId = message.UserId;
            ChatSessionId = message.ChatSessionId;

            System.Diagnostics.Debug.WriteLine($"Authentication successful. Device: {DeviceId}, User: {UserId}, Session: {ChatSessionId}");

            // Start heartbeat after successful auth
            StartHeartbeat();

            Authenticated?.Invoke(this, message);
        }
    }

    private void HandleError(JObject jObject)
    {
        var message = jObject.ToObject<ErrorMessage>();
        if (message != null)
        {
            System.Diagnostics.Debug.WriteLine($"Error received: [{message.Code}] {message.Message}");
            ErrorReceived?.Invoke(this, message);
        }
    }

    private void HandleHeartbeatAck()
    {
        System.Diagnostics.Debug.WriteLine("Heartbeat acknowledged");
        HeartbeatAckReceived?.Invoke(this, EventArgs.Empty);
    }

    private void HandleChatHistory(JObject jObject)
    {
        var message = jObject.ToObject<ChatHistoryMessage>();
        if (message != null)
        {
            System.Diagnostics.Debug.WriteLine($"Chat history received: {message.Messages.Count} messages");
            // Store for late subscribers
            PendingChatHistory = message;
            ChatHistoryReceived?.Invoke(this, message);
        }
    }

    private void HandleChatMessage(JObject jObject)
    {
        var message = jObject.ToObject<AssistantChatMessage>();
        if (message != null)
        {
            System.Diagnostics.Debug.WriteLine($"Chat message received from {message.Role}: {message.Content}");
            ChatMessageReceived?.Invoke(this, message);
        }
    }

    private void HandlePowerShellRequest(JObject jObject)
    {
        var message = jObject.ToObject<PowerShellRequestMessage>();
        if (message != null)
        {
            System.Diagnostics.Debug.WriteLine($"PowerShell request received: {message.CommandId} - {message.Description}");
            PowerShellRequestReceived?.Invoke(this, message);
        }
    }

    // Gracefully disconnect
    public async Task DisconnectAsync()
    {
        IsAuthenticated = false;
        ChatSessionId = null;
        DeviceId = null;
        UserId = null;

        StopHeartbeat();

        if (_webSocket != null)
        {
            try
            {
                if (_webSocket.State == WebSocketState.Open)
                {
                    await _webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Client disconnecting",
                        CancellationToken.None);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error during disconnect: {ex.Message}");
            }
            finally
            {
                _webSocket.Dispose();
                _webSocket = null;
            }
        }

        if (_cancellationTokenSource != null)
        {
            _cancellationTokenSource.Cancel();
            _cancellationTokenSource.Dispose();
            _cancellationTokenSource = null;
        }

        System.Diagnostics.Debug.WriteLine("WebSocket disconnected and cleaned up");
    }

    public void Dispose()
    {
        DisconnectAsync().Wait();
        _sendLock?.Dispose();
        GC.SuppressFinalize(this);
    }
}

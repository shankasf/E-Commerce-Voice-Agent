using System;
using System.Linq;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using WindowsMcpAgent.Core.Authentication;
using WindowsMcpAgent.Core.Models;
using WindowsMcpAgent.Core.Tools;

namespace WindowsMcpAgent.Core.Mcp;

/// <summary>
/// MCP WebSocket server that listens for incoming connections from backend/LLM
/// </summary>
public class McpServer : IDisposable
{
    private readonly HttpListener _httpListener;
    private readonly ToolAuthorizationEngine _authorizationEngine;
    private readonly ToolRegistry _toolRegistry;
    private readonly string _deviceId;
    private readonly JwtValidator _jwtValidator;
    private readonly int _port;
    private CancellationTokenSource? _cancellationTokenSource;
    private bool _disposed = false;
    private WebSocket? _currentConnection;

    public event EventHandler<ToolCallMessage>? ToolCallReceived;
    public event EventHandler<string>? ConnectionStatusChanged;

    public McpServer(
        ToolAuthorizationEngine authorizationEngine,
        ToolRegistry toolRegistry,
        string deviceId,
        JwtValidator jwtValidator,
        int port)
    {
        _authorizationEngine = authorizationEngine;
        _toolRegistry = toolRegistry;
        _deviceId = deviceId;
        _jwtValidator = jwtValidator;
        _port = port;
        _httpListener = new HttpListener();
    }

    /// <summary>
    /// Starts the WebSocket server and begins listening for connections
    /// </summary>
    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // HttpListener on Windows requires specific URL formats
            // Try different approaches until one works
            string url = string.Empty;
            bool started = false;
            
            // Method 1: Try with localhost first (most reliable, works without reservation)
            try
            {
                _httpListener.Prefixes.Clear();
                url = $"http://localhost:{_port}/mcp/";
                _httpListener.Prefixes.Add(url);
                _httpListener.Start();
                started = true;
                OnConnectionStatusChanged($"Server listening on localhost:{_port} (Note: Only accessible from this machine)");
            }
            catch (HttpListenerException)
            {
                // Try next method
            }
            
            // Method 2: Try with + (all interfaces, requires URL reservation or admin)
            // Note: HttpListener doesn't support binding to specific IP addresses directly
            // We must use + or * for all interfaces, or localhost for local only
            if (!started)
            {
                try
                {
                    _httpListener.Prefixes.Clear();
                    url = $"http://+:{_port}/mcp/";
                    _httpListener.Prefixes.Add(url);
                    _httpListener.Start();
                    started = true;
                    OnConnectionStatusChanged($"Server listening on all interfaces (port {_port})");
                }
                catch (HttpListenerException ex)
                {
                    var errorMsg = $"Failed to start server: {ex.Message} (Error Code: {ex.ErrorCode})\n\n";
                    
                    if (ex.ErrorCode == 5) // Access Denied
                    {
                        errorMsg += "Access denied. HttpListener requires URL reservation for external access.\n\n";
                        errorMsg += "SOLUTION - Run this command as Administrator:\n";
                        errorMsg += $"netsh http add urlacl url=http://+:{_port}/mcp/ user=Everyone\n\n";
                        errorMsg += "Or run the application as Administrator.";
                    }
                    else if (ex.ErrorCode == 50) // Not Supported
                    {
                        errorMsg += "The request is not supported.\n\n";
                        errorMsg += "This usually means:\n";
                        errorMsg += "1. URL format is incorrect\n";
                        errorMsg += "2. Port is already in use\n";
                        errorMsg += "3. HttpListener doesn't support this binding\n\n";
                        errorMsg += "Try using localhost binding (only works for same-machine connections)";
                    }
                    else if (ex.ErrorCode == 183) // Already Exists
                    {
                        errorMsg += "URL already registered. Another application may be using this port.\n";
                        errorMsg += $"Try a different port or remove the reservation:\n";
                        errorMsg += $"netsh http delete urlacl url=http://+:{_port}/mcp/";
                    }
                    else
                    {
                        errorMsg += $"HttpListener error code: {ex.ErrorCode}\n";
                        errorMsg += "See: https://learn.microsoft.com/en-us/windows/win32/winsock/windows-sockets-error-codes-2";
                    }
                    throw new InvalidOperationException(errorMsg, ex);
                }
            }
            
            if (!started)
            {
                throw new InvalidOperationException("Failed to start HttpListener with any available method");
            }

            _cancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

            // Start accepting connections
            _ = Task.Run(() => AcceptConnectionsAsync(_cancellationTokenSource.Token), _cancellationTokenSource.Token);
        }
        catch (Exception ex)
        {
            OnConnectionStatusChanged($"Server start failed: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Accepts incoming WebSocket connections
    /// </summary>
    private async Task AcceptConnectionsAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested && _httpListener.IsListening)
        {
            try
            {
                var context = await _httpListener.GetContextAsync();
                
                // Log incoming request for debugging
                var requestPath = context.Request.Url?.AbsolutePath ?? "";
                System.Diagnostics.Debug.WriteLine($"Incoming request: {requestPath}");
                
                // Only accept WebSocket upgrade requests
                if (!context.Request.IsWebSocketRequest)
                {
                    context.Response.StatusCode = 400;
                    context.Response.Close();
                    continue;
                }

                // Accept WebSocket connection (accept any path under /mcp/)
                var webSocketContext = await context.AcceptWebSocketAsync(null);
                _currentConnection = webSocketContext.WebSocket;

                OnConnectionStatusChanged($"Client connected from {context.Request.RemoteEndPoint}");

                // Handle messages from this connection
                await HandleConnectionAsync(_currentConnection, cancellationToken);
            }
            catch (HttpListenerException) when (cancellationToken.IsCancellationRequested)
            {
                // Expected when stopping
                break;
            }
            catch (Exception ex)
            {
                OnConnectionStatusChanged($"Connection error: {ex.Message}");
                _currentConnection = null;
            }
        }
    }

    /// <summary>
    /// Handles messages from a WebSocket connection
    /// </summary>
    private async Task HandleConnectionAsync(WebSocket webSocket, CancellationToken cancellationToken)
    {
        var buffer = new byte[4096];

        while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            try
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", cancellationToken);
                    OnConnectionStatusChanged("Client disconnected");
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await ProcessMessageAsync(message, webSocket, cancellationToken);
                }
            }
            catch (WebSocketException ex)
            {
                OnConnectionStatusChanged($"WebSocket error: {ex.Message}");
                break;
            }
            catch (Exception ex)
            {
                OnConnectionStatusChanged($"Error handling message: {ex.Message}");
                break;
            }
        }

        _currentConnection = null;
    }

    /// <summary>
    /// Processes incoming messages and dispatches tool calls
    /// </summary>
    private async Task ProcessMessageAsync(string message, WebSocket webSocket, CancellationToken cancellationToken)
    {
        try
        {
            var toolCall = JsonConvert.DeserializeObject<ToolCallMessage>(message);
            if (toolCall != null && toolCall.Type == "tool_call")
            {
                // Extract role from message or validate JWT if provided
                if (!Enum.TryParse<Role>(toolCall.Role, true, out var role))
                {
                    role = Role.AI_AGENT; // Default
                }

                // Fire event for tool call
                ToolCallReceived?.Invoke(this, toolCall);

                // Note: Tool execution and response sending is handled by ToolDispatcher
                // which will call SendToolResultAsync
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error processing message: {ex.Message}");
        }
    }

    /// <summary>
    /// Sends tool result back to the connected client (backend/LLM)
    /// </summary>
    public async Task SendToolResultAsync(ToolResultMessage result, CancellationToken cancellationToken = default)
    {
        if (_currentConnection == null || _currentConnection.State != WebSocketState.Open)
        {
            throw new InvalidOperationException("No active WebSocket connection");
        }

        try
        {
            var json = JsonConvert.SerializeObject(result);
            var bytes = Encoding.UTF8.GetBytes(json);
            await _currentConnection.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                true,
                cancellationToken);
        }
        catch (Exception ex)
        {
            OnConnectionStatusChanged($"Error sending result: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Gets the local IP address for WebSocket URL
    /// </summary>
    private string GetLocalIpAddress()
    {
        try
        {
            var hostName = Dns.GetHostName();
            var addresses = Dns.GetHostAddresses(hostName);
            var localIp = addresses.FirstOrDefault(ip => 
                ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && 
                !IPAddress.IsLoopback(ip))?.ToString();
            
            return localIp ?? "127.0.0.1";
        }
        catch
        {
            return "127.0.0.1";
        }
    }

    /// <summary>
    /// Gets the URL that this server is listening on
    /// </summary>
    public string GetServerUrl()
    {
        var localIp = GetLocalIpAddress();
        return $"ws://{localIp}:{_port}/mcp/";
    }

    protected virtual void OnConnectionStatusChanged(string status)
    {
        ConnectionStatusChanged?.Invoke(this, status);
    }

    public void Stop()
    {
        _cancellationTokenSource?.Cancel();
        _httpListener?.Stop();
        _currentConnection?.Dispose();
        _currentConnection = null;
        OnConnectionStatusChanged("Server stopped");
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            Stop();
            _httpListener?.Close();
            _cancellationTokenSource?.Dispose();
            _disposed = true;
        }
    }
}


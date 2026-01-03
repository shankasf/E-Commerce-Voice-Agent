using System;
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
/// MCP client that handles WebSocket communication
/// </summary>
public class McpClient : IDisposable
{
    private readonly ClientWebSocket _webSocket;
    private readonly ToolAuthorizationEngine _authorizationEngine;
    private readonly ToolRegistry _toolRegistry;
    private readonly string _deviceId;
    private readonly JwtValidator _jwtValidator;
    private CancellationTokenSource? _cancellationTokenSource;
    private bool _disposed = false;

    public event EventHandler<ToolCallMessage>? ToolCallReceived;
    public event EventHandler<string>? ConnectionStatusChanged;

    public McpClient(
        ToolAuthorizationEngine authorizationEngine,
        ToolRegistry toolRegistry,
        string deviceId,
        JwtValidator jwtValidator)
    {
        _webSocket = new ClientWebSocket();
        _authorizationEngine = authorizationEngine;
        _toolRegistry = toolRegistry;
        _deviceId = deviceId;
        _jwtValidator = jwtValidator;
    }

    public async Task ConnectAsync(string wssUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            await _webSocket.ConnectAsync(new Uri(wssUrl), cancellationToken);
            OnConnectionStatusChanged("Connected");
            
            _cancellationTokenSource = new CancellationTokenSource();
            _ = Task.Run(() => ListenForMessagesAsync(_cancellationTokenSource.Token));
        }
        catch (Exception ex)
        {
            OnConnectionStatusChanged($"Connection failed: {ex.Message}");
            throw;
        }
    }

    public async Task SendToolResultAsync(ToolResultMessage result, CancellationToken cancellationToken = default)
    {
        // Serialize with camelCase to match Python backend expectations
        var settings = new JsonSerializerSettings
        {
            ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver()
        };
        var json = JsonConvert.SerializeObject(result, settings);
        System.Diagnostics.Debug.WriteLine($"[McpClient] Sending tool result: {json}");
        System.Diagnostics.Debug.WriteLine($"[McpClient] WebSocket State: {_webSocket.State}");

        if (_webSocket.State != WebSocketState.Open)
        {
            var error = $"WebSocket is not open. State: {_webSocket.State}";
            System.Diagnostics.Debug.WriteLine($"[McpClient] ERROR: {error}");
            throw new InvalidOperationException(error);
        }

        var bytes = Encoding.UTF8.GetBytes(json);
        await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, cancellationToken);
        System.Diagnostics.Debug.WriteLine($"[McpClient] Tool result sent successfully");
    }

    private async Task ListenForMessagesAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[4096];
        
        while (!cancellationToken.IsCancellationRequested && _webSocket.State == WebSocketState.Open)
        {
            try
            {
                var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
                
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", cancellationToken);
                    OnConnectionStatusChanged("Disconnected");
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    ProcessMessage(message);
                }
            }
            catch (Exception ex)
            {
                OnConnectionStatusChanged($"Error receiving message: {ex.Message}");
                break;
            }
        }
    }

    private void ProcessMessage(string message)
    {
        try
        {
            var toolCall = JsonConvert.DeserializeObject<ToolCallMessage>(message);
            if (toolCall != null && toolCall.Type == "tool_call")
            {
                ToolCallReceived?.Invoke(this, toolCall);
            }
        }
        catch (Exception ex)
        {
            // Log error
            System.Diagnostics.Debug.WriteLine($"Error processing message: {ex.Message}");
        }
    }

    protected virtual void OnConnectionStatusChanged(string status)
    {
        ConnectionStatusChanged?.Invoke(this, status);
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _cancellationTokenSource?.Cancel();
            _webSocket?.Dispose();
            _cancellationTokenSource?.Dispose();
            _disposed = true;
        }
    }
}


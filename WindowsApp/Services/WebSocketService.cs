using System;
using System.Net.WebSockets;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace WindowsApp.Services;

// Service for managing WebSocket connection with mTLS authentication
public class WebSocketService : IDisposable
{
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _cancellationTokenSource;
    private readonly SemaphoreSlim _sendLock = new SemaphoreSlim(1, 1);

    // Event raised when connection is successfully established
    public event EventHandler? Connected;

    // Event raised when connection is closed
    public event EventHandler<string>? Disconnected;

    // Event raised when a message is received from server
    public event EventHandler<string>? MessageReceived;

    // Event raised when an error occurs
    public event EventHandler<string>? Error;

    // Indicates whether WebSocket is currently connected
    public bool IsConnected => _webSocket?.State == WebSocketState.Open;

    // Establishes WebSocket connection with mTLS using provided certificate
    public async Task ConnectAsync(string websocketUrl, X509Certificate2 certificate)
    {
        try
        {
            // Validate inputs
            if (string.IsNullOrEmpty(websocketUrl))
                throw new ArgumentException("WebSocket URL cannot be empty", nameof(websocketUrl));

            if (certificate == null)
                throw new ArgumentNullException(nameof(certificate));

            // Ensure URL is using secure WebSocket protocol
            if (!websocketUrl.StartsWith("wss://", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("WebSocket URL must use secure protocol (wss://)", nameof(websocketUrl));
            }

            // Dispose existing connection if any
            await DisconnectAsync();

            // Create new WebSocket client
            _webSocket = new ClientWebSocket();
            _cancellationTokenSource = new CancellationTokenSource();

            // Configure client certificate for mTLS
            _webSocket.Options.ClientCertificates.Add(certificate);

            // Optional: Configure additional WebSocket options
            _webSocket.Options.KeepAliveInterval = TimeSpan.FromSeconds(30);

            System.Diagnostics.Debug.WriteLine($"Connecting to WebSocket: {websocketUrl}");
            System.Diagnostics.Debug.WriteLine($"Using certificate: {certificate.Subject}");

            // Establish connection
            await _webSocket.ConnectAsync(new Uri(websocketUrl), _cancellationTokenSource.Token);

            System.Diagnostics.Debug.WriteLine("WebSocket connected successfully");

            // Raise Connected event
            Connected?.Invoke(this, EventArgs.Empty);

            // Start receiving messages in background
            _ = Task.Run(() => ReceiveMessagesAsync(_cancellationTokenSource.Token));
        }
        catch (WebSocketException ex)
        {
            var errorMessage = $"WebSocket connection failed: {ex.Message}";
            System.Diagnostics.Debug.WriteLine(errorMessage);
            Error?.Invoke(this, errorMessage);
            throw new InvalidOperationException(errorMessage, ex);
        }
        catch (Exception ex)
        {
            var errorMessage = $"Failed to establish WebSocket connection: {ex.Message}";
            System.Diagnostics.Debug.WriteLine(errorMessage);
            Error?.Invoke(this, errorMessage);
            throw new InvalidOperationException(errorMessage, ex);
        }
    }

    // Sends a text message to the server
    public async Task SendMessageAsync(string message)
    {
        if (!IsConnected)
            throw new InvalidOperationException("WebSocket is not connected");

        if (string.IsNullOrEmpty(message))
            throw new ArgumentException("Message cannot be empty", nameof(message));

        await _sendLock.WaitAsync();
        try
        {
            var bytes = Encoding.UTF8.GetBytes(message);
            await _webSocket!.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                endOfMessage: true,
                _cancellationTokenSource!.Token);

            System.Diagnostics.Debug.WriteLine($"Sent message: {message}");
        }
        finally
        {
            _sendLock.Release();
        }
    }

    // Continuously receives messages from the server
    private async Task ReceiveMessagesAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];

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
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    System.Diagnostics.Debug.WriteLine($"Received message: {message}");
                    MessageReceived?.Invoke(this, message);
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
            Error?.Invoke(this, $"Connection error: {ex.Message}");
            Disconnected?.Invoke(this, $"Connection lost: {ex.Message}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Unexpected error in receive loop: {ex.Message}");
            Error?.Invoke(this, $"Unexpected error: {ex.Message}");
        }
    }

    // Gracefully closes the WebSocket connection
    public async Task DisconnectAsync()
    {
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
    }

    // Cleanup resources
    public void Dispose()
    {
        DisconnectAsync().Wait();
        _sendLock?.Dispose();
        GC.SuppressFinalize(this);
    }
}

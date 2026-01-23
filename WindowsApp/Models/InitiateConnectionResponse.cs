using Newtonsoft.Json;

namespace WindowsApp.Models;

public class InitiateConnectionResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }

    [JsonProperty("websocket_url")]
    public string? WebSocketUrl { get; set; }
}

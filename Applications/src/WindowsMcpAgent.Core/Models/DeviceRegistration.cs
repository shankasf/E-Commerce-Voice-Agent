using Newtonsoft.Json;

namespace WindowsMcpAgent.Core.Models;

/// <summary>
/// Device registration request sent to backend
/// </summary>
public class DeviceRegistrationRequest
{
    [JsonProperty("email")]
    public string Email { get; set; } = string.Empty;

    [JsonProperty("ue_code")]
    public string UECode { get; set; } = string.Empty;

    [JsonProperty("device_id")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonProperty("device_name")]
    public string DeviceName { get; set; } = string.Empty;

    [JsonProperty("os_version")]
    public string OsVersion { get; set; } = string.Empty;

    [JsonProperty("mcp_url")]
    public string McpUrl { get; set; } = string.Empty;
}

/// <summary>
/// Response from backend after device registration
/// </summary>
public class DeviceRegistrationResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("jwt_token")]
    public string? JwtToken { get; set; }

    [JsonProperty("client_id")]
    public string? ClientId { get; set; }

    [JsonProperty("user_id")]
    public string? UserId { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }
}


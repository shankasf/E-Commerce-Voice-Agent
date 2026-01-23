using Newtonsoft.Json;

namespace WindowsApp.Models;

// Response model for device authentication endpoint
// Contains JWT token on successful authentication
public class DeviceAuthenticationResponse
{
    // Indicates whether authentication was successful
    [JsonProperty("success")]
    public bool Success { get; set; }

    // JWT authentication token for subsequent API requests
    // Only present when authentication succeeds
    [JsonProperty("jwt_token")]
    public string? JwtToken { get; set; }

    // Database identifier for the device (optional)
    [JsonProperty("device_id")]
    public int? DeviceId { get; set; }

    // Database identifier for the user/contact (optional)
    [JsonProperty("user_id")]
    public int? UserId { get; set; }

    // Database identifier for the organization (optional)
    [JsonProperty("organization_id")]
    public int? OrganizationId { get; set; }

    // Success or informational message from server
    [JsonProperty("message")]
    public string? Message { get; set; }

    // Error message if authentication failed
    // Present when success is false or HTTP 400 returned
    [JsonProperty("error")]
    public string? Error { get; set; }
}

using Newtonsoft.Json;

namespace WindowsApp.Models;

public class InitiateConnectionRequest
{
    [JsonProperty("six_digit_code")]
    public string Code { get; set; } = string.Empty;

    [JsonProperty("user_id")]
    public int UserId { get; set; }

    [JsonProperty("organization_id")]
    public int OrganizationId { get; set; }

    [JsonProperty("device_id")]
    public int DeviceId { get; set; }
}

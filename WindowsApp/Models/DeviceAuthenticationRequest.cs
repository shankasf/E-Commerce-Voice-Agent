using Newtonsoft.Json;

namespace WindowsApp.Models;

// Request model for device authentication endpoint
// Sends only ue_code and serial_number for authentication
// Backend validates if device is already registered
public class DeviceAuthenticationRequest
{
    // Unique enterprise/organization code assigned by the system
    // User inputs this value in login screen
    [JsonProperty("ue_code")]
    public string UeCode { get; set; } = string.Empty;

    // Unique device serial number (hashed motherboard serial)
    // Automatically captured from device hardware
    [JsonProperty("serial_number")]
    public string SerialNumber { get; set; } = string.Empty;
}

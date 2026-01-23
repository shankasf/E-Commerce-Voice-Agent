namespace WindowsApp.Models;

// Response model for device registration endpoint
// Contains authentication token and user/device identifiers on success
public class DeviceRegistrationResponse
{
    // Indicates whether registration was successful
    public bool Success { get; set; }

    // JWT authentication token for subsequent API requests
    public string? JwtToken { get; set; }

    // Database identifier for the registered device
    public int? DeviceId { get; set; }

    // Database identifier for the user/contact
    public int? UserId { get; set; }

    // Database identifier for the organization
    public int? OrganizationId { get; set; }

    // Success or informational message from server
    public string? Message { get; set; }

    // Error message if registration failed
    public string? Error { get; set; }
}

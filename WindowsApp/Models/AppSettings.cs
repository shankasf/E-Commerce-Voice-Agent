namespace WindowsApp.Models;

// Configuration model to map appsettings.json structure
// Using record type for immutability and cleaner syntax
public record AppSettings
{
    public ApiSettings ApiSettings { get; init; } = new();
    public CertificateSettings CertificateSettings { get; init; } = new();
    public WebSocketSettings WebSocketSettings { get; init; } = new();
}

// API-specific configuration settings
public record ApiSettings
{
    public string BaseUrl { get; init; } = string.Empty;
}

// Certificate configuration for mTLS authentication
public record CertificateSettings
{
    public string ClientCertPath { get; init; } = string.Empty;
    public string CertificatePassword { get; init; } = string.Empty;
}

// WebSocket connection settings
public record WebSocketSettings
{
    public string Url { get; init; } = string.Empty;
}

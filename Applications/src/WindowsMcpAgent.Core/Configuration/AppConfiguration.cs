namespace WindowsMcpAgent.Core.Configuration;

/// <summary>
/// Application configuration settings
/// </summary>
public class AppConfiguration
{
    public McpSettings McpSettings { get; set; } = new();
    public LoggingSettings Logging { get; set; } = new();
}

public class McpSettings
{
    public string WssUrl { get; set; } = "wss://localhost:5001/mcp";
    public string JwtSecret { get; set; } = "default-secret-key-change-in-production";
    public int ReconnectDelaySeconds { get; set; } = 5;
    public int ConnectionTimeoutSeconds { get; set; } = 30;
}

public class LoggingSettings
{
    public string LogLevel { get; set; } = "Information";
    public bool EnableAuditLogging { get; set; } = true;
}










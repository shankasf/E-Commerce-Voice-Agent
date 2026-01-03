using System;
using System.IO;

namespace WindowsMcpAgent.Core.Logging;

/// <summary>
/// Logs all tool executions and authorization decisions for audit purposes
/// </summary>
public class AuditLogger
{
    private readonly string _logDirectory;
    private readonly object _lockObject = new();

    public AuditLogger()
    {
        _logDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "WindowsMcpAgent",
            "Logs");

        if (!Directory.Exists(_logDirectory))
        {
            Directory.CreateDirectory(_logDirectory);
        }
    }

    public void LogToolExecution(string toolName, string role, bool authorized, bool success, string? error = null)
    {
        var logEntry = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff} UTC | " +
                      $"Tool: {toolName} | Role: {role} | " +
                      $"Authorized: {authorized} | Success: {success} | " +
                      $"Error: {error ?? "None"}\n";

        var logFile = Path.Combine(_logDirectory, $"audit_{DateTime.UtcNow:yyyyMMdd}.log");

        lock (_lockObject)
        {
            File.AppendAllText(logFile, logEntry);
        }
    }

    public void LogConnectionEvent(string eventType, string details)
    {
        var logEntry = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff} UTC | " +
                      $"Event: {eventType} | Details: {details}\n";

        var logFile = Path.Combine(_logDirectory, $"connection_{DateTime.UtcNow:yyyyMMdd}.log");

        lock (_lockObject)
        {
            File.AppendAllText(logFile, logEntry);
        }
    }

    public void LogAuthorizationDecision(string toolName, string role, bool allowed, string reason)
    {
        var logEntry = $"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff} UTC | " +
                      $"Tool: {toolName} | Role: {role} | " +
                      $"Allowed: {allowed} | Reason: {reason}\n";

        var logFile = Path.Combine(_logDirectory, $"authorization_{DateTime.UtcNow:yyyyMMdd}.log");

        lock (_lockObject)
        {
            File.AppendAllText(logFile, logEntry);
        }
    }
}










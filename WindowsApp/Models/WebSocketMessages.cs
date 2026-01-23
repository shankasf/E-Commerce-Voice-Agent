using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace WindowsApp.Models;

// Base class for all WebSocket messages
public abstract class WebSocketMessage
{
    [JsonProperty("type")]
    public string Type { get; set; } = string.Empty;
}

// ==================== OUTGOING MESSAGES (Client -> Server) ====================

// Authentication request - sent immediately after connecting
public class AuthMessage : WebSocketMessage
{
    [JsonProperty("code")]
    public string Code { get; set; } = string.Empty;

    [JsonProperty("user_id")]
    public int UserId { get; set; }

    [JsonProperty("organization_id")]
    public int OrganizationId { get; set; }

    [JsonProperty("device_id")]
    public int DeviceId { get; set; }

    public AuthMessage()
    {
        Type = "auth";
    }

    public AuthMessage(string code, int userId, int organizationId, int deviceId) : this()
    {
        Code = code;
        UserId = userId;
        OrganizationId = organizationId;
        DeviceId = deviceId;
    }
}

// Heartbeat message - sent every 30 seconds to keep connection alive
public class HeartbeatMessage : WebSocketMessage
{
    public HeartbeatMessage()
    {
        Type = "heartbeat";
    }
}

// Chat message from user
public class UserChatMessage : WebSocketMessage
{
    [JsonProperty("role")]
    public string Role { get; set; } = "user";

    [JsonProperty("content")]
    public string Content { get; set; } = string.Empty;

    public UserChatMessage()
    {
        Type = "chat";
    }

    public UserChatMessage(string content) : this()
    {
        Content = content;
    }
}

// ==================== INCOMING MESSAGES (Server -> Client) ====================

// Connection established - received after successful auth
public class ConnectionEstablishedMessage : WebSocketMessage
{
    [JsonProperty("device_id")]
    public int DeviceId { get; set; }

    [JsonProperty("user_id")]
    public int UserId { get; set; }

    [JsonProperty("chat_session_id")]
    public string ChatSessionId { get; set; } = string.Empty;
}

// Error message from server
public class ErrorMessage : WebSocketMessage
{
    [JsonProperty("code")]
    public string Code { get; set; } = string.Empty;

    [JsonProperty("message")]
    public string Message { get; set; } = string.Empty;
}

// Heartbeat acknowledgment from server
public class HeartbeatAckMessage : WebSocketMessage
{
}

// Chat history - received after successful auth
public class ChatHistoryMessage : WebSocketMessage
{
    [JsonProperty("messages")]
    public List<ChatMessageItem> Messages { get; set; } = new();
}

// Individual chat message item (used in history and real-time)
public class ChatMessageItem
{
    [JsonProperty("role")]
    public string Role { get; set; } = string.Empty; // "user" or "assistant"

    [JsonProperty("content")]
    public string Content { get; set; } = string.Empty;

    [JsonProperty("timestamp")]
    public DateTime Timestamp { get; set; }
}

// Chat message from AI assistant
public class AssistantChatMessage : WebSocketMessage
{
    [JsonProperty("role")]
    public string Role { get; set; } = string.Empty;

    [JsonProperty("content")]
    public string Content { get; set; } = string.Empty;

    [JsonProperty("timestamp")]
    public DateTime Timestamp { get; set; }
}

// PowerShell request - AI wants to execute a PowerShell command on device
public class PowerShellRequestMessage : WebSocketMessage
{
    [JsonProperty("command_id")]
    public string CommandId { get; set; } = string.Empty;

    [JsonProperty("command")]
    public string Command { get; set; } = string.Empty;

    [JsonProperty("description")]
    public string Description { get; set; } = string.Empty;

    [JsonProperty("requires_consent")]
    public bool RequiresConsent { get; set; }
}

// PowerShell result - sent back to server after execution
public class PowerShellResultMessage : WebSocketMessage
{
    [JsonProperty("type", Order = -2)]
    public new string Type { get; set; } = "powershell_result";

    [JsonProperty("command_id", Order = -1)]
    public string CommandId { get; set; } = string.Empty;

    [JsonProperty("status")]
    public string Status { get; set; } = string.Empty; // success, declined, error

    [JsonProperty("output")]
    public string? Output { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }

    [JsonProperty("reason")]
    public string? Reason { get; set; }

    public PowerShellResultMessage()
    {
        Type = "powershell_result";
    }

    // Success result
    public static PowerShellResultMessage Success(string commandId, string output)
    {
        return new PowerShellResultMessage
        {
            Type = "powershell_result",
            CommandId = commandId,
            Status = "success",
            Output = output
        };
    }

    // Declined result
    public static PowerShellResultMessage Declined(string commandId, string reason)
    {
        return new PowerShellResultMessage
        {
            Type = "powershell_result",
            CommandId = commandId,
            Status = "declined",
            Reason = reason
        };
    }

    // Error result
    public static PowerShellResultMessage CreateError(string commandId, string error)
    {
        return new PowerShellResultMessage
        {
            Type = "powershell_result",
            CommandId = commandId,
            Status = "error",
            Error = error
        };
    }
}

// ==================== ERROR CODES ====================

public static class WebSocketErrorCodes
{
    public const string AUTH_REQUIRED = "AUTH_REQUIRED";      // First message wasn't auth type
    public const string INVALID_CODE = "INVALID_CODE";        // Code not 6 characters
    public const string RATE_LIMITED = "RATE_LIMITED";        // Too many failed attempts
    public const string AUTH_FAILED = "AUTH_FAILED";          // Code invalid, expired, or used
    public const string AUTH_TIMEOUT = "AUTH_TIMEOUT";        // No auth within 30 seconds
}

// ==================== MESSAGE TYPE CONSTANTS ====================

public static class WebSocketMessageTypes
{
    // Outgoing
    public const string Auth = "auth";
    public const string Heartbeat = "heartbeat";
    public const string Chat = "chat";
    public const string PowerShellResult = "powershell_result";

    // Incoming
    public const string ConnectionEstablished = "connection_established";
    public const string Error = "error";
    public const string HeartbeatAck = "heartbeat_ack";
    public const string ChatHistory = "chat_history";
    public const string PowerShellRequest = "powershell_request";
}

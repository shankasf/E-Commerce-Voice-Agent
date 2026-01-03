using System;
using System.IO;
using Newtonsoft.Json;

namespace WindowsMcpAgent.Core.Storage;

/// <summary>
/// Manages local storage of authentication and configuration data
/// </summary>
public class LocalStorage
{
    private readonly string _storageDirectory;
    private readonly string _authFilePath;
    private readonly string _configFilePath;

    public LocalStorage()
    {
        _storageDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "WindowsMcpAgent");

        if (!Directory.Exists(_storageDirectory))
        {
            Directory.CreateDirectory(_storageDirectory);
        }

        _authFilePath = Path.Combine(_storageDirectory, "auth.json");
        _configFilePath = Path.Combine(_storageDirectory, "config.json");
    }

    /// <summary>
    /// Checks if device is already registered
    /// </summary>
    public bool IsDeviceRegistered()
    {
        return File.Exists(_authFilePath);
    }

    /// <summary>
    /// Saves authentication data
    /// </summary>
    public void SaveAuthData(AuthData authData)
    {
        var json = JsonConvert.SerializeObject(authData, Formatting.Indented);
        File.WriteAllText(_authFilePath, json);
    }

    /// <summary>
    /// Loads authentication data
    /// </summary>
    public AuthData? LoadAuthData()
    {
        if (!File.Exists(_authFilePath))
        {
            return null;
        }

        try
        {
            var json = File.ReadAllText(_authFilePath);
            return JsonConvert.DeserializeObject<AuthData>(json);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Clears authentication data (for re-registration)
    /// </summary>
    public void ClearAuthData()
    {
        if (File.Exists(_authFilePath))
        {
            File.Delete(_authFilePath);
        }
    }

    /// <summary>
    /// Saves configuration data
    /// </summary>
    public void SaveConfig(ConfigData config)
    {
        var json = JsonConvert.SerializeObject(config, Formatting.Indented);
        File.WriteAllText(_configFilePath, json);
    }

    /// <summary>
    /// Loads configuration data, returns default if not found
    /// </summary>
    public ConfigData LoadConfig()
    {
        if (!File.Exists(_configFilePath))
        {
            var defaultConfig = ConfigData.CreateDefault();
            SaveConfig(defaultConfig);
            return defaultConfig;
        }

        try
        {
            var json = File.ReadAllText(_configFilePath);
            var config = JsonConvert.DeserializeObject<ConfigData>(json);
            return config ?? ConfigData.CreateDefault();
        }
        catch
        {
            return ConfigData.CreateDefault();
        }
    }
}

/// <summary>
/// Stored authentication data
/// </summary>
public class AuthData
{
    public string Username { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public string McpUrl { get; set; } = string.Empty;
    public string? JwtToken { get; set; }
    public string? ClientId { get; set; }
    public string? UserId { get; set; }
    public DateTime RegisteredAt { get; set; }
}

/// <summary>
/// Stored configuration data
/// </summary>
public class ConfigData
{
    public string BackendApiUrl { get; set; } = "http://localhost:9000";
    
    /// <summary>
    /// Creates default configuration if none exists
    /// </summary>
    public static ConfigData CreateDefault()
    {
        return new ConfigData
        {
            BackendApiUrl = Environment.GetEnvironmentVariable("MCP_BACKEND_API_URL") ?? 
                           "http://localhost:9000"
        };
    }
}


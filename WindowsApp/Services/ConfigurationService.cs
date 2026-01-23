using System;
using Microsoft.Extensions.Configuration;
using WindowsApp.Models;

namespace WindowsApp.Services;

// Service to load and manage application configuration from appsettings.json
// Implements singleton pattern for application-wide configuration access
public class ConfigurationService
{
    private static ConfigurationService? _instance;
    private static readonly object _lock = new();
    private readonly IConfiguration _configuration;

    // Lazy initialization of configuration on first access
    private AppSettings? _appSettings;

    private ConfigurationService()
    {
        // Build configuration from appsettings.json file
        // SetBasePath ensures we load from application directory
        _configuration = new ConfigurationBuilder()
            .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .Build();
    }

    // Thread-safe singleton instance retrieval using double-check locking
    public static ConfigurationService Instance
    {
        get
        {
            if (_instance == null)
            {
                lock (_lock)
                {
                    _instance ??= new ConfigurationService();
                }
            }
            return _instance;
        }
    }

    // Property to access loaded application settings
    // Binds JSON structure to strongly-typed AppSettings model
    public AppSettings AppSettings
    {
        get
        {
            if (_appSettings == null)
            {
                _appSettings = new AppSettings();
                _configuration.Bind(_appSettings);
            }
            return _appSettings;
        }
    }

    // Helper method to get API base URL directly
    public string GetApiBaseUrl() => AppSettings.ApiSettings.BaseUrl;

    // Helper method to get certificate path
    public string GetCertificatePath() => AppSettings.CertificateSettings.ClientCertPath;

    // Helper method to get certificate password
    public string GetCertificatePassword() => AppSettings.CertificateSettings.CertificatePassword;

    // Helper method to get WebSocket URL
    public string GetWebSocketUrl() => AppSettings.WebSocketSettings.Url;
}

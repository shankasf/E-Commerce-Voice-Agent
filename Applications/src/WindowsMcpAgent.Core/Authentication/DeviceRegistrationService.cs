using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using WindowsMcpAgent.Core.Models;

namespace WindowsMcpAgent.Core.Authentication;

/// <summary>
/// Service for registering device with backend and obtaining unique MCP URL
/// </summary>
public class DeviceRegistrationService
{
    private readonly string _backendApiUrl;
    private readonly HttpClient _httpClient;

    public DeviceRegistrationService(string backendApiUrl)
    {
        _backendApiUrl = backendApiUrl.TrimEnd('/');
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(30)
        };
    }

    /// <summary>
    /// Registers device with backend using email and U & E code
    /// MCP URL is optional for reverse connection architecture
    /// </summary>
    public async Task<DeviceRegistrationResponse> RegisterDeviceAsync(
        string email,
        string ueCode,
        string deviceId,
        string deviceName,
        string osVersion,
        string? mcpUrl = null)
    {
        try
        {
            var request = new DeviceRegistrationRequest
            {
                Email = email,
                UECode = ueCode,
                DeviceId = deviceId,
                DeviceName = deviceName,
                OsVersion = osVersion,
                McpUrl = mcpUrl ?? string.Empty  // Optional for reverse connection
            };

            var json = JsonConvert.SerializeObject(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_backendApiUrl}/api/device/register", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var registrationResponse = JsonConvert.DeserializeObject<DeviceRegistrationResponse>(responseContent);
                if (registrationResponse != null)
                {
                    return registrationResponse;
                }
            }

            // Try to parse error response
            try
            {
                var errorResponse = JsonConvert.DeserializeObject<DeviceRegistrationResponse>(responseContent);
                if (errorResponse != null)
                {
                    return errorResponse;
                }
            }
            catch
            {
                // Ignore parse errors
            }

            return new DeviceRegistrationResponse
            {
                Success = false,
                Error = $"Registration failed: {response.StatusCode} - {responseContent}"
            };
        }
        catch (Exception ex)
        {
            return new DeviceRegistrationResponse
            {
                Success = false,
                Error = $"Registration error: {ex.Message}"
            };
        }
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}


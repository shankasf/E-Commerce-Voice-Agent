using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using WindowsApp.Models;

namespace WindowsApp.Services;

// Service to handle all API communication with backend
// Manages HTTP requests and response deserialization
public class ApiService
{
    private readonly HttpClient _httpClient;
    private readonly ConfigurationService _configService;

    public ApiService()
    {
        _configService = ConfigurationService.Instance;

        // Initialize HttpClient with base configuration
        // Using a single instance for connection pooling and performance
        _httpClient = new HttpClient
        {
            // Set reasonable timeout for network operations
            Timeout = TimeSpan.FromSeconds(30)
        };

        // Set default request headers for all API calls
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    // Registers device with backend and retrieves authentication token
    // Throws HttpRequestException on network errors or non-success status codes
    public async Task<DeviceRegistrationResponse> RegisterDeviceAsync(DeviceRegistrationRequest request)
    {
        try
        {
            // Get base URL from configuration loaded at application startup
            var baseUrl = _configService.GetApiBaseUrl();
            var endpoint = $"{baseUrl}/api/client-application/device/register";

            // Serialize request object to JSON for POST body
            var jsonContent = JsonConvert.SerializeObject(request);
            var httpContent = new StringContent(
                jsonContent,
                Encoding.UTF8,
                "application/json");

            // Send POST request to registration endpoint
            var response = await _httpClient.PostAsync(endpoint, httpContent);

            // Read response body regardless of status code for error details
            var responseContent = await response.Content.ReadAsStringAsync();

            // Ensure success status code (200-299) or throw exception
            // Exception message includes status code and response body for debugging
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"API request failed with status {response.StatusCode}: {responseContent}");
            }

            // Deserialize JSON response to strongly-typed model
            var result = JsonConvert.DeserializeObject<DeviceRegistrationResponse>(responseContent);

            // Return result or throw if deserialization failed
            return result ?? throw new InvalidOperationException("Failed to deserialize response");
        }
        catch (TaskCanceledException)
        {
            // Handle timeout specifically for better error messaging
            throw new HttpRequestException("Request timed out. Please check your network connection.");
        }
        catch (HttpRequestException)
        {
            // Re-throw HTTP exceptions without wrapping
            throw;
        }
        catch (Exception ex)
        {
            // Wrap unexpected exceptions with context
            throw new InvalidOperationException($"An error occurred during device registration: {ex.Message}", ex);
        }
    }

    // Authenticates device with backend using ue_code and serial_number
    // Returns JWT token if device is already registered
    // Throws HttpRequestException on network errors or non-success status codes
    public async Task<DeviceAuthenticationResponse> AuthenticateDeviceAsync(DeviceAuthenticationRequest request)
    {
        try
        {
            // Get base URL from configuration loaded at application startup
            var baseUrl = _configService.GetApiBaseUrl();
            var endpoint = $"{baseUrl}/api/client-application/device/auth";

            // Serialize request object to JSON for POST body
            var jsonContent = JsonConvert.SerializeObject(request);
            var httpContent = new StringContent(
                jsonContent,
                Encoding.UTF8,
                "application/json");

            // Send POST request to authentication endpoint
            var response = await _httpClient.PostAsync(endpoint, httpContent);

            // Read response body regardless of status code for error details
            var responseContent = await response.Content.ReadAsStringAsync();

            // Deserialize JSON response to strongly-typed model
            var result = JsonConvert.DeserializeObject<DeviceAuthenticationResponse>(responseContent);

            // Return result even if status code is not success
            // ViewModel will check Success flag and Error message
            return result ?? throw new InvalidOperationException("Failed to deserialize response");
        }
        catch (TaskCanceledException)
        {
            // Handle timeout specifically for better error messaging
            throw new HttpRequestException("Request timed out. Please check your network connection.");
        }
        catch (HttpRequestException)
        {
            // Re-throw HTTP exceptions without wrapping
            throw;
        }
        catch (Exception ex)
        {
            // Wrap unexpected exceptions with context
            throw new InvalidOperationException($"An error occurred during device authentication: {ex.Message}", ex);
        }
    }

    // Refreshes JWT token using stored ue_code and serial_number
    // Called when token is expired or about to expire
    // Returns same response format as authentication endpoint
    public async Task<DeviceAuthenticationResponse> RefreshTokenAsync(DeviceAuthenticationRequest request)
    {
        try
        {
            // Get base URL from configuration loaded at application startup
            var baseUrl = _configService.GetApiBaseUrl();
            var endpoint = $"{baseUrl}/api/client-application/device/refresh-token";

            // Serialize request object to JSON for POST body
            var jsonContent = JsonConvert.SerializeObject(request);
            var httpContent = new StringContent(
                jsonContent,
                Encoding.UTF8,
                "application/json");

            // Send POST request to refresh-token endpoint
            var response = await _httpClient.PostAsync(endpoint, httpContent);

            // Read response body regardless of status code for error details
            var responseContent = await response.Content.ReadAsStringAsync();

            // Deserialize JSON response to strongly-typed model
            var result = JsonConvert.DeserializeObject<DeviceAuthenticationResponse>(responseContent);

            // Return result even if status code is not success
            // Caller will check Success flag and Error message
            return result ?? throw new InvalidOperationException("Failed to deserialize response");
        }
        catch (TaskCanceledException)
        {
            // Handle timeout specifically for better error messaging
            throw new HttpRequestException("Request timed out. Please check your network connection.");
        }
        catch (HttpRequestException)
        {
            // Re-throw HTTP exceptions without wrapping
            throw;
        }
        catch (Exception ex)
        {
            // Wrap unexpected exceptions with context
            throw new InvalidOperationException($"An error occurred during token refresh: {ex.Message}", ex);
        }
    }

    // Initiates connection to AI by validating 6-digit code and getting WebSocket URL
    // Requires authenticated session (JWT token must be set via SetAuthToken)
    public async Task<InitiateConnectionResponse> InitiateConnectionAsync(InitiateConnectionRequest request)
    {
        try
        {
            // Get base URL from configuration loaded at application startup
            var baseUrl = _configService.GetApiBaseUrl();
            var endpoint = $"{baseUrl}/api/client-application/device-connections/verify-code-return-url";

            // Serialize request object to JSON for POST body
            var jsonContent = JsonConvert.SerializeObject(request);
            var httpContent = new StringContent(
                jsonContent,
                Encoding.UTF8,
                "application/json");

            // Send POST request to initiate-connection endpoint
            var response = await _httpClient.PostAsync(endpoint, httpContent);

            // Read response body regardless of status code for error details
            var responseContent = await response.Content.ReadAsStringAsync();

            // Deserialize JSON response to strongly-typed model
            var result = JsonConvert.DeserializeObject<InitiateConnectionResponse>(responseContent);

            // Return result even if status code is not success
            // ViewModel will check Success flag and Error message
            return result ?? throw new InvalidOperationException("Failed to deserialize response");
        }
        catch (TaskCanceledException)
        {
            // Handle timeout specifically for better error messaging
            throw new HttpRequestException("Request timed out. Please check your network connection.");
        }
        catch (HttpRequestException)
        {
            // Re-throw HTTP exceptions without wrapping
            throw;
        }
        catch (Exception ex)
        {
            // Wrap unexpected exceptions with context
            throw new InvalidOperationException($"An error occurred during connection initiation: {ex.Message}", ex);
        }
    }

    // Sets authorization header for subsequent authenticated API calls
    public void SetAuthToken(string token)
    {
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }

    // Cleanup method to dispose HttpClient when service is no longer needed
    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}

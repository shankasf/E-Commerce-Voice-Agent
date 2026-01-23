using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using WindowsApp.Models;

namespace WindowsApp.Services;

// Service to manage authentication lifecycle including token validation and renewal
// Handles automatic token refresh and ensures API calls always use valid tokens
public class AuthenticationService
{
    private readonly ApiService _apiService;
    private readonly SecureStorageService _secureStorageService;
    private readonly JwtTokenService _jwtTokenService;
    private readonly DeviceInformationService _deviceInfoService;

    public AuthenticationService()
    {
        _apiService = new ApiService();
        _secureStorageService = new SecureStorageService();
        _jwtTokenService = new JwtTokenService();
        _deviceInfoService = new DeviceInformationService();
    }

    // Gets a valid JWT token, automatically refreshing if expired
    // Throws exception if no credentials exist or refresh fails
    public async Task<string> GetValidTokenAsync()
    {
        // Load stored credentials
        var credentials = await _secureStorageService.LoadAuthenticationAsync();

        if (credentials == null || string.IsNullOrEmpty(credentials.JwtToken))
        {
            // No stored credentials - user needs to login
            throw new UnauthorizedException("No authentication credentials found. Please login.");
        }

        // Check if we have ue_code and serial_number for token refresh
        if (string.IsNullOrEmpty(credentials.UeCode) || string.IsNullOrEmpty(credentials.SerialNumber))
        {
            // Old format credentials without renewal data - user needs to re-login
            await _secureStorageService.ClearAuthenticationAsync();
            throw new UnauthorizedException("Stored credentials are incomplete. Please login again.");
        }

        // Check if token is expired or about to expire
        if (_jwtTokenService.IsTokenExpired(credentials.JwtToken))
        {
            System.Diagnostics.Debug.WriteLine("Token expired or about to expire, refreshing...");

            // Attempt to refresh token
            var refreshed = await RefreshTokenAsync(credentials.UeCode, credentials.SerialNumber);

            if (!refreshed)
            {
                // Refresh failed - clear credentials and require re-login
                await _secureStorageService.ClearAuthenticationAsync();
                throw new UnauthorizedException("Token expired and refresh failed. Please login again.");
            }

            // Reload credentials with new token
            credentials = await _secureStorageService.LoadAuthenticationAsync();

            if (credentials == null || string.IsNullOrEmpty(credentials.JwtToken))
            {
                throw new UnauthorizedException("Failed to load refreshed credentials.");
            }
        }

        return credentials.JwtToken;
    }

    // Refreshes JWT token using stored ue_code and serial_number
    // Returns true if refresh succeeded, false otherwise
    public async Task<bool> RefreshTokenAsync(string ueCode, string serialNumber)
    {
        try
        {
            // Build refresh request with same parameters as authentication
            var request = new DeviceAuthenticationRequest
            {
                UeCode = ueCode,
                SerialNumber = serialNumber
            };

            // Call refresh-token endpoint
            var response = await _apiService.RefreshTokenAsync(request);

            // Check if refresh was successful
            if (response.Success && !string.IsNullOrEmpty(response.JwtToken))
            {
                // Save new token and updated data
                await _secureStorageService.SaveAuthenticationAsync(
                    response.JwtToken,
                    ueCode,
                    serialNumber,
                    response.UserId,
                    response.DeviceId,
                    response.OrganizationId);

                // Update authorization header with new token
                _apiService.SetAuthToken(response.JwtToken);

                System.Diagnostics.Debug.WriteLine("Token refreshed successfully");
                return true;
            }

            System.Diagnostics.Debug.WriteLine($"Token refresh failed: {response.Error ?? response.Message}");
            return false;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error refreshing token: {ex.Message}");
            return false;
        }
    }

    // Checks if user has stored authentication credentials
    // Does not validate token expiry
    public async Task<bool> HasStoredCredentialsAsync()
    {
        var credentials = await _secureStorageService.LoadAuthenticationAsync();
        return credentials != null &&
               !string.IsNullOrEmpty(credentials.JwtToken) &&
               !string.IsNullOrEmpty(credentials.UeCode) &&
               !string.IsNullOrEmpty(credentials.SerialNumber);
    }

    // Validates stored credentials and refreshes token if needed
    // Returns true if credentials are valid or successfully refreshed
    public async Task<bool> ValidateAndRefreshCredentialsAsync()
    {
        try
        {
            var credentials = await _secureStorageService.LoadAuthenticationAsync();

            if (credentials == null ||
                string.IsNullOrEmpty(credentials.JwtToken) ||
                string.IsNullOrEmpty(credentials.UeCode) ||
                string.IsNullOrEmpty(credentials.SerialNumber))
            {
                return false;
            }

            // Check if token is expired
            if (_jwtTokenService.IsTokenExpired(credentials.JwtToken))
            {
                // Attempt to refresh
                return await RefreshTokenAsync(credentials.UeCode, credentials.SerialNumber);
            }

            // Token is still valid
            _apiService.SetAuthToken(credentials.JwtToken);
            return true;
        }
        catch
        {
            return false;
        }
    }

    // Makes an authenticated API call with automatic token refresh on 401 errors
    // Retries once after refreshing token if original request returns 401
    public async Task<HttpResponseMessage> MakeAuthenticatedRequestAsync(
        Func<string, Task<HttpResponseMessage>> apiCall)
    {
        try
        {
            // Get valid token (will auto-refresh if needed)
            var token = await GetValidTokenAsync();

            // Make API call with token
            var response = await apiCall(token);

            // Check if we got 401 Unauthorized despite having valid token
            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                System.Diagnostics.Debug.WriteLine("Received 401, attempting token refresh and retry...");

                // Load credentials for refresh
                var credentials = await _secureStorageService.LoadAuthenticationAsync();

                if (credentials != null &&
                    !string.IsNullOrEmpty(credentials.UeCode) &&
                    !string.IsNullOrEmpty(credentials.SerialNumber))
                {
                    // Refresh token
                    var refreshed = await RefreshTokenAsync(credentials.UeCode, credentials.SerialNumber);

                    if (refreshed)
                    {
                        // Get new token and retry request
                        token = await GetValidTokenAsync();
                        response = await apiCall(token);
                    }
                }
            }

            return response;
        }
        catch (UnauthorizedException)
        {
            // Re-throw authentication exceptions
            throw;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Authenticated request failed: {ex.Message}", ex);
        }
    }

    // Clears all stored authentication data (for logout)
    public async Task LogoutAsync()
    {
        await _secureStorageService.ClearAuthenticationAsync();
        System.Diagnostics.Debug.WriteLine("User logged out, credentials cleared");
    }
}

// Custom exception for authentication failures
public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message) : base(message)
    {
    }
}

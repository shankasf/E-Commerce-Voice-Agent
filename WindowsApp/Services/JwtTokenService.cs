using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;

namespace WindowsApp.Services;

// Service to decode and validate JWT tokens
// Handles token expiry checking without requiring signature verification
public class JwtTokenService
{
    private readonly JwtSecurityTokenHandler _tokenHandler;

    public JwtTokenService()
    {
        // Initialize JWT handler for decoding tokens
        _tokenHandler = new JwtSecurityTokenHandler();
    }

    // Checks if token is expired or about to expire within buffer time
    // Uses 10-minute buffer to proactively refresh before actual expiry
    public bool IsTokenExpired(string jwtToken, int bufferMinutes = 10)
    {
        try
        {
            // Get expiry time from token
            var expiryTime = GetTokenExpiry(jwtToken);

            if (!expiryTime.HasValue)
            {
                // Cannot determine expiry - consider token expired
                return true;
            }

            // Check if token expires within buffer time
            // Buffer prevents race conditions where token expires during API call
            return expiryTime.Value <= DateTime.UtcNow.AddMinutes(bufferMinutes);
        }
        catch
        {
            // Error parsing token - consider it expired
            return true;
        }
    }

    // Extracts expiry timestamp from JWT token without signature verification
    // Returns null if token is invalid or doesn't contain expiry claim
    public DateTime? GetTokenExpiry(string jwtToken)
    {
        try
        {
            // Validate token format
            if (string.IsNullOrWhiteSpace(jwtToken))
            {
                return null;
            }

            // Check if token can be read (basic format validation)
            if (!_tokenHandler.CanReadToken(jwtToken))
            {
                System.Diagnostics.Debug.WriteLine("Invalid JWT token format");
                return null;
            }

            // Read token without validating signature
            // We only need to extract claims, not verify authenticity
            var token = _tokenHandler.ReadJwtToken(jwtToken);

            // Extract 'exp' claim which contains Unix timestamp
            var expClaim = token.Claims.FirstOrDefault(c => c.Type == "exp");

            if (expClaim == null)
            {
                System.Diagnostics.Debug.WriteLine("JWT token missing 'exp' claim");
                return null;
            }

            // Convert Unix timestamp (seconds since epoch) to DateTime
            if (long.TryParse(expClaim.Value, out var unixTimestamp))
            {
                // Unix epoch starts at 1970-01-01 00:00:00 UTC
                var epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                return epoch.AddSeconds(unixTimestamp);
            }

            return null;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error extracting token expiry: {ex.Message}");
            return null;
        }
    }

    // Extracts device_id claim from JWT token payload
    // Returns null if claim doesn't exist or parsing fails
    public int? GetDeviceId(string jwtToken)
    {
        try
        {
            if (!_tokenHandler.CanReadToken(jwtToken))
            {
                return null;
            }

            var token = _tokenHandler.ReadJwtToken(jwtToken);
            var deviceIdClaim = token.Claims.FirstOrDefault(c => c.Type == "device_id");

            if (deviceIdClaim != null && int.TryParse(deviceIdClaim.Value, out var deviceId))
            {
                return deviceId;
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    // Extracts user_id claim from JWT token payload
    // Returns null if claim doesn't exist or parsing fails
    public int? GetUserId(string jwtToken)
    {
        try
        {
            if (!_tokenHandler.CanReadToken(jwtToken))
            {
                return null;
            }

            var token = _tokenHandler.ReadJwtToken(jwtToken);
            var userIdClaim = token.Claims.FirstOrDefault(c => c.Type == "user_id");

            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    // Extracts organization_id claim from JWT token payload
    // Returns null if claim doesn't exist or parsing fails
    public int? GetOrganizationId(string jwtToken)
    {
        try
        {
            if (!_tokenHandler.CanReadToken(jwtToken))
            {
                return null;
            }

            var token = _tokenHandler.ReadJwtToken(jwtToken);
            var orgIdClaim = token.Claims.FirstOrDefault(c => c.Type == "organization_id");

            if (orgIdClaim != null && int.TryParse(orgIdClaim.Value, out var orgId))
            {
                return orgId;
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    // Validates token format and checks if it can be parsed
    // Does not verify signature - only checks structural validity
    public bool IsValidTokenFormat(string jwtToken)
    {
        try
        {
            return !string.IsNullOrWhiteSpace(jwtToken) &&
                   _tokenHandler.CanReadToken(jwtToken);
        }
        catch
        {
            return false;
        }
    }
}

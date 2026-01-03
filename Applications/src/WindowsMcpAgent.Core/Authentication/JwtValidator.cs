using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using WindowsMcpAgent.Core.Models;

namespace WindowsMcpAgent.Core.Authentication;

/// <summary>
/// Validates JWT tokens and extracts role information
/// </summary>
public class JwtValidator
{
    private readonly string _secretKey;
    private readonly string _deviceId;

    public JwtValidator(string secretKey, string deviceId)
    {
        _secretKey = secretKey;
        _deviceId = deviceId;
    }

    /// <summary>
    /// Validates JWT token and extracts role
    /// </summary>
    public (bool IsValid, Role? Role) ValidateToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jsonToken = handler.ReadJwtToken(token);

            // Validate device ID claim
            var deviceIdClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == "device_id");
            if (deviceIdClaim == null || deviceIdClaim.Value != _deviceId)
            {
                return (false, null);
            }

            // Extract role claim
            var roleClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == "role");
            if (roleClaim == null)
            {
                return (false, null);
            }

            // Parse role
            if (!Enum.TryParse<Role>(roleClaim.Value, true, out var role))
            {
                return (false, null);
            }

            // Validate expiration
            if (jsonToken.ValidTo < DateTime.UtcNow)
            {
                return (false, null);
            }

            return (true, role);
        }
        catch
        {
            return (false, null);
        }
    }
}










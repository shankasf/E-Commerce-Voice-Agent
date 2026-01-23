using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace WindowsApp.Services;

// Service to securely store sensitive data like JWT tokens
// Uses Windows Data Protection API (DPAPI) for encryption
public class SecureStorageService
{
    private static readonly string StorageDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "WindowsApp");

    private static readonly string AuthFileName = "auth.dat";

    // Saves JWT token, ue_code, serial_number, and user data encrypted to local storage
    // Uses DPAPI to encrypt data with user's Windows credentials
    // Stores all data needed for automatic token renewal
    public async Task SaveAuthenticationAsync(
        string jwtToken,
        string ueCode,
        string serialNumber,
        int? userId = null,
        int? deviceId = null,
        int? organizationId = null)
    {
        try
        {
            // Ensure storage directory exists
            if (!Directory.Exists(StorageDirectory))
            {
                Directory.CreateDirectory(StorageDirectory);
            }

            // Create data string with all authentication info including ue_code and serial_number
            // Format: jwt_token|ue_code|serial_number|userId|deviceId|organizationId
            var authData = $"{jwtToken}|{ueCode}|{serialNumber}|{userId}|{deviceId}|{organizationId}";

            // Convert to bytes for encryption
            var dataBytes = Encoding.UTF8.GetBytes(authData);

            // Encrypt using DPAPI - only current user can decrypt
            // CurrentUser scope means data is tied to this Windows user account
            var encryptedData = ProtectedData.Protect(
                dataBytes,
                null, // No additional entropy for simplicity
                DataProtectionScope.CurrentUser);

            // Write encrypted data to file
            var filePath = Path.Combine(StorageDirectory, AuthFileName);
            await File.WriteAllBytesAsync(filePath, encryptedData);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error saving auth data: {ex.Message}");
            throw new InvalidOperationException("Failed to save authentication data securely.", ex);
        }
    }

    // Loads and decrypts stored authentication data
    // Returns null if no data exists or decryption fails
    // Now includes ue_code and serial_number for automatic token renewal
    public async Task<AuthenticationData?> LoadAuthenticationAsync()
    {
        try
        {
            var filePath = Path.Combine(StorageDirectory, AuthFileName);

            // Check if auth file exists
            if (!File.Exists(filePath))
            {
                return null;
            }

            // Read encrypted data from file
            var encryptedData = await File.ReadAllBytesAsync(filePath);

            // Decrypt using DPAPI
            var decryptedData = ProtectedData.Unprotect(
                encryptedData,
                null,
                DataProtectionScope.CurrentUser);

            // Convert back to string
            var authData = Encoding.UTF8.GetString(decryptedData);

            // Parse stored data
            // Format: jwt_token|ue_code|serial_number|userId|deviceId|organizationId
            var parts = authData.Split('|');

            // Support both old format (4 parts) and new format (6 parts)
            if (parts.Length == 4)
            {
                // Old format - missing ue_code and serial_number
                // Return partial data, user will need to re-login
                return new AuthenticationData
                {
                    JwtToken = parts[0],
                    UeCode = string.Empty,
                    SerialNumber = string.Empty,
                    UserId = int.TryParse(parts[1], out var userId) ? userId : null,
                    DeviceId = int.TryParse(parts[2], out var deviceId) ? deviceId : null,
                    OrganizationId = int.TryParse(parts[3], out var orgId) ? orgId : null
                };
            }
            else if (parts.Length == 6)
            {
                // New format with ue_code and serial_number
                return new AuthenticationData
                {
                    JwtToken = parts[0],
                    UeCode = parts[1],
                    SerialNumber = parts[2],
                    UserId = int.TryParse(parts[3], out var userId) ? userId : null,
                    DeviceId = int.TryParse(parts[4], out var deviceId) ? deviceId : null,
                    OrganizationId = int.TryParse(parts[5], out var orgId) ? orgId : null
                };
            }

            return null;
        }
        catch (CryptographicException)
        {
            // Data was encrypted by different user or corrupted
            // Delete invalid file and return null
            await ClearAuthenticationAsync();
            return null;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error loading auth data: {ex.Message}");
            return null;
        }
    }

    // Clears stored authentication data (for logout)
    public async Task ClearAuthenticationAsync()
    {
        try
        {
            var filePath = Path.Combine(StorageDirectory, AuthFileName);

            if (File.Exists(filePath))
            {
                // Securely delete file
                await Task.Run(() => File.Delete(filePath));
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error clearing auth data: {ex.Message}");
        }
    }

    // Checks if user has valid stored authentication
    public async Task<bool> HasStoredAuthenticationAsync()
    {
        var authData = await LoadAuthenticationAsync();
        return authData != null && !string.IsNullOrEmpty(authData.JwtToken);
    }
}

// Model to hold decrypted authentication data
// Includes all data needed for automatic token renewal
public class AuthenticationData
{
    public string JwtToken { get; set; } = string.Empty;
    public string UeCode { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public int? DeviceId { get; set; }
    public int? OrganizationId { get; set; }
}

using System;
using System.IO;
using System.Security.Cryptography.X509Certificates;

namespace WindowsApp.Services;

// Service responsible for loading and managing client certificates for mTLS authentication
public class CertificateService
{
    private readonly ConfigurationService _configService;

    public CertificateService()
    {
        _configService = ConfigurationService.Instance;
    }

    // Loads the client certificate from the configured path with the configured password
    // Certificate is used for mutual TLS authentication with the WebSocket server
    public X509Certificate2 LoadClientCertificate()
    {
        try
        {
            // Get certificate path and password from configuration
            var certPath = _configService.GetCertificatePath();
            var certPassword = _configService.GetCertificatePassword();

            // Validate configuration
            if (string.IsNullOrEmpty(certPath))
            {
                throw new InvalidOperationException("Certificate path is not configured in appsettings.json");
            }

            if (string.IsNullOrEmpty(certPassword))
            {
                throw new InvalidOperationException("Certificate password is not configured in appsettings.json");
            }

            // Convert relative path to absolute path based on application directory
            var absolutePath = Path.IsPathRooted(certPath)
                ? certPath
                : Path.Combine(AppDomain.CurrentDomain.BaseDirectory, certPath);

            // Check if certificate file exists
            if (!File.Exists(absolutePath))
            {
                throw new FileNotFoundException($"Client certificate not found at path: {absolutePath}");
            }

            // Load certificate with private key
            var certificate = new X509Certificate2(absolutePath, certPassword,
                X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.PersistKeySet);

            // Validate certificate has private key (required for mTLS)
            if (!certificate.HasPrivateKey)
            {
                throw new InvalidOperationException("Certificate does not contain a private key. mTLS requires a certificate with private key.");
            }

            System.Diagnostics.Debug.WriteLine($"Certificate loaded successfully: {certificate.Subject}");
            System.Diagnostics.Debug.WriteLine($"Certificate valid from {certificate.NotBefore} to {certificate.NotAfter}");

            return certificate;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to load certificate: {ex.Message}");
            throw new InvalidOperationException($"Failed to load client certificate: {ex.Message}", ex);
        }
    }

    // Validates that the certificate is still valid and not expired
    public bool IsCertificateValid(X509Certificate2 certificate)
    {
        if (certificate == null)
            return false;

        var now = DateTime.Now;
        return now >= certificate.NotBefore && now <= certificate.NotAfter;
    }
}

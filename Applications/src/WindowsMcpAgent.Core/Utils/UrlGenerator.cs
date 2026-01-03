using System;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;

namespace WindowsMcpAgent.Core.Utils;

/// <summary>
/// Generates unique MCP WebSocket URLs for client devices
/// </summary>
public static class UrlGenerator
{
    /// <summary>
    /// Generates a unique MCP WebSocket URL for this device
    /// </summary>
    public static string GenerateMcpUrl(int port, string deviceId)
    {
        // Get local IP address
        var localIp = GetLocalIpAddress();
        
        // Generate unique path using device ID
        var uniquePath = $"mcp/{deviceId}";
        
        return $"ws://{localIp}:{port}/{uniquePath}";
    }

    /// <summary>
    /// Gets the local IP address of this machine
    /// </summary>
    private static string GetLocalIpAddress()
    {
        try
        {
            // Try to get the first IPv4 address that's not loopback
            var hostName = Dns.GetHostName();
            var addresses = Dns.GetHostAddresses(hostName);
            
            var ipv4Address = addresses
                .FirstOrDefault(ip => 
                    ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork &&
                    !IPAddress.IsLoopback(ip));

            if (ipv4Address != null)
            {
                return ipv4Address.ToString();
            }

            // Fallback to localhost
            return "localhost";
        }
        catch
        {
            return "localhost";
        }
    }

    /// <summary>
    /// Finds an available port for the WebSocket server
    /// </summary>
    public static int FindAvailablePort(int startPort = 5000, int endPort = 6000)
    {
        var ipProperties = IPGlobalProperties.GetIPGlobalProperties();
        var usedPorts = ipProperties.GetActiveTcpListeners()
            .Select(l => l.Port)
            .ToHashSet();

        for (int port = startPort; port <= endPort; port++)
        {
            if (!usedPorts.Contains(port))
            {
                return port;
            }
        }

        throw new Exception("No available port found in the specified range");
    }
}


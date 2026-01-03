using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Shows IP addresses for all network interfaces (AI_AGENT - SAFE)
/// </summary>
public class CheckIpAddressTool : ITool
{
    public string Name => "check_ip_address";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            await Task.Delay(100);
            
            var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                .Where(ni => ni.OperationalStatus == OperationalStatus.Up)
                .Select(ni =>
                {
                    var ipProperties = ni.GetIPProperties();
                    var ipv4Addresses = ipProperties.UnicastAddresses
                        .Where(addr => addr.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                        .Select(addr => addr.Address.ToString())
                        .ToList();
                    
                    var ipv6Addresses = ipProperties.UnicastAddresses
                        .Where(addr => addr.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
                        .Select(addr => addr.Address.ToString())
                        .ToList();
                    
                    var gatewayAddresses = ipProperties.GatewayAddresses
                        .Select(gw => gw.Address.ToString())
                        .ToList();
                    
                    var dnsServers = ipProperties.DnsAddresses
                        .Select(dns => dns.ToString())
                        .ToList();
                    
                    return new
                    {
                        Name = ni.Name,
                        Type = ni.NetworkInterfaceType.ToString(),
                        IPv4Addresses = ipv4Addresses,
                        IPv6Addresses = ipv6Addresses,
                        GatewayAddresses = gatewayAddresses,
                        DnsServers = dnsServers,
                        MacAddress = BitConverter.ToString(ni.GetPhysicalAddress().GetAddressBytes()).Replace("-", ":")
                    };
                })
                .ToList();

            var outputLines = new List<string>();
            
            foreach (var iface in interfaces)
            {
                outputLines.Add($"=== {iface.Name} ({iface.Type}) ===");
                
                if (iface.IPv4Addresses.Any())
                {
                    outputLines.Add($"  IPv4: {string.Join(", ", iface.IPv4Addresses)}");
                }
                else
                {
                    outputLines.Add("  IPv4: None");
                }
                
                if (iface.IPv6Addresses.Any())
                {
                    outputLines.Add($"  IPv6: {string.Join(", ", iface.IPv6Addresses)}");
                }
                
                if (iface.GatewayAddresses.Any())
                {
                    outputLines.Add($"  Gateway: {string.Join(", ", iface.GatewayAddresses)}");
                }
                
                if (iface.DnsServers.Any())
                {
                    outputLines.Add($"  DNS: {string.Join(", ", iface.DnsServers)}");
                }
                
                outputLines.Add($"  MAC: {iface.MacAddress}");
                outputLines.Add("");
            }
            
            var output = outputLines.Any() 
                ? string.Join("\n", outputLines)
                : "No active network interfaces found";

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = output,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new ToolResult
            {
                Success = false,
                Error = ex.Message,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }
}



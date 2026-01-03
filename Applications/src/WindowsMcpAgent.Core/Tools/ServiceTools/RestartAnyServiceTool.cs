using System;
using System.Collections.Generic;
using System.ServiceProcess;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.ServiceTools;

/// <summary>
/// Restarts any service (for HUMAN_AGENT role)
/// Still requires service to be whitelisted for safety
/// </summary>
public class RestartAnyServiceTool : ITool
{
    public string Name => "restart_any_service";

    // Extended whitelist for HUMAN_AGENT
    private static readonly HashSet<string> WhitelistedServices = new(StringComparer.OrdinalIgnoreCase)
    {
        "Spooler",
        "Themes",
        "AudioSrv",
        "BITS",
        "WSearch",
        "WinRM",
        "RemoteRegistry",
        "W32Time",
        "Dhcp",
        "Dnscache"
    };

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            if (!arguments.TryGetValue("service_name", out var serviceNameObj) || serviceNameObj == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "service_name argument is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var serviceName = serviceNameObj.ToString() ?? string.Empty;

            if (!WhitelistedServices.Contains(serviceName))
            {
                return new ToolResult
                {
                    Success = false,
                    Error = $"Service '{serviceName}' is not in the whitelist of allowed services",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            using var service = new ServiceController(serviceName);
            
            if (service.Status == ServiceControllerStatus.Running)
            {
                service.Stop();
                service.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(30));
            }

            service.Start();
            service.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(30));

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = $"Service '{serviceName}' restarted successfully",
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


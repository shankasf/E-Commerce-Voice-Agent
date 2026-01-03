using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

public class CheckNetworkStatusTool : ITool
{
    public string Name => "check_network_status";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            await Task.Delay(100);
            
            var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                .Where(ni => ni.OperationalStatus == OperationalStatus.Up)
                .Select(ni => new
                {
                    Name = ni.Name,
                    Type = ni.NetworkInterfaceType.ToString(),
                    Status = ni.OperationalStatus.ToString(),
                    Speed = ni.Speed > 0 ? $"{ni.Speed / 1000000.0:F0} Mbps" : "Unknown"
                })
                .ToList();

            var output = interfaces.Any() 
                ? string.Join("\n", interfaces.Select(i => $"{i.Name} ({i.Type}): {i.Status}, Speed: {i.Speed}"))
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


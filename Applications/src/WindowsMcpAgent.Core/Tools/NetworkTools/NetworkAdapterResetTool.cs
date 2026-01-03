using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.NetworkTools;

/// <summary>
/// Resets a network adapter (HUMAN_AGENT role)
/// </summary>
public class NetworkAdapterResetTool : ITool
{
    public string Name => "network_adapter_reset";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            if (!arguments.TryGetValue("adapter_name", out var adapterNameObj) || adapterNameObj == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "adapter_name argument is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var adapterName = adapterNameObj.ToString() ?? string.Empty;

            // Disable adapter
            var disableProcess = new ProcessStartInfo
            {
                FileName = "netsh",
                Arguments = $"interface set interface \"{adapterName}\" admin=disable",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
                Verb = "runas" // Requires admin
            };

            using (var process = Process.Start(disableProcess))
            {
                if (process != null)
                {
                    await process.WaitForExitAsync();
                }
            }

            await Task.Delay(2000);

            // Enable adapter
            var enableProcess = new ProcessStartInfo
            {
                FileName = "netsh",
                Arguments = $"interface set interface \"{adapterName}\" admin=enable",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
                Verb = "runas" // Requires admin
            };

            using (var process = Process.Start(enableProcess))
            {
                if (process != null)
                {
                    await process.WaitForExitAsync();
                }
            }

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = $"Network adapter '{adapterName}' reset successfully",
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










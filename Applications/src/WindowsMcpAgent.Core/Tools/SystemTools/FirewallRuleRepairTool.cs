using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Repairs firewall rules (ADMIN role)
/// </summary>
public class FirewallRuleRepairTool : ITool
{
    public string Name => "firewall_rule_repair";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // Reset firewall to default settings
            var processInfo = new ProcessStartInfo
            {
                FileName = "netsh",
                Arguments = "advfirewall reset",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
                Verb = "runas" // Requires admin
            };

            using var process = Process.Start(processInfo);
            if (process == null)
            {
                throw new Exception("Failed to start netsh process");
            }

            await process.WaitForExitAsync();

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();

            stopwatch.Stop();

            if (process.ExitCode == 0)
            {
                return new ToolResult
                {
                    Success = true,
                    Output = "Firewall rules reset to default successfully",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
            else
            {
                return new ToolResult
                {
                    Success = false,
                    Error = error ?? "Failed to reset firewall rules",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
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










using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.NetworkTools;

public class ResetNetworkStackTool : ITool
{
    public string Name => "reset_network_stack";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // Reset Winsock and TCP/IP stack
            var commands = new[]
            {
                ("netsh", "winsock reset"),
                ("netsh", "int ip reset")
            };

            var results = new List<string>();

            foreach (var (command, args) in commands)
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = command,
                    Arguments = args,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                    Verb = "runas" // Requires admin elevation
                };

                try
                {
                    using var process = Process.Start(processInfo);
                    if (process != null)
                    {
                        await process.WaitForExitAsync();
                        var output = await process.StandardOutput.ReadToEndAsync();
                        results.Add($"{command} {args}: {(process.ExitCode == 0 ? "Success" : "Failed")}");
                    }
                }
                catch (Exception ex)
                {
                    results.Add($"{command} {args}: Error - {ex.Message}");
                }
            }

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = string.Join("\n", results),
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










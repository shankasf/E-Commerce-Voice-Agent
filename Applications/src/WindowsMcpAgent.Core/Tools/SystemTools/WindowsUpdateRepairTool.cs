using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Repairs Windows Update components (HUMAN_AGENT role)
/// </summary>
public class WindowsUpdateRepairTool : ITool
{
    public string Name => "windows_update_repair";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var commands = new[]
            {
                ("net", "stop wuauserv"),
                ("net", "stop cryptSvc"),
                ("net", "stop bits"),
                ("net", "stop msiserver"),
                ("ren", @"C:\Windows\SoftwareDistribution SoftwareDistribution.old"),
                ("ren", @"C:\Windows\System32\catroot2 catroot2.old"),
                ("net", "start wuauserv"),
                ("net", "start cryptSvc"),
                ("net", "start bits"),
                ("net", "start msiserver")
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
                    Verb = "runas" // Requires admin
                };

                try
                {
                    using var process = Process.Start(processInfo);
                    if (process != null)
                    {
                        await process.WaitForExitAsync();
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
                Output = "Windows Update repair commands executed:\n" + string.Join("\n", results),
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




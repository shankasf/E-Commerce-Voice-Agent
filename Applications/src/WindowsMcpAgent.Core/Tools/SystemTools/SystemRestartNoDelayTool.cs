using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// System restart with no delay (ADMIN role only)
/// Per Project_requirements.md Section 7.3
/// </summary>
public class SystemRestartNoDelayTool : ITool
{
    public string Name => "system_restart_no_delay";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // Admin-level restart with no delay
            var processInfo = new ProcessStartInfo
            {
                FileName = "shutdown",
                Arguments = "/r /t 0 /c \"Administrative system restart\" /d p:0:0 /f",
                UseShellExecute = false,
                CreateNoWindow = true,
                Verb = "runas"  // Requires admin elevation
            };

            Process.Start(processInfo);

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = "Administrative system restart initiated. The system will restart immediately.",
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new ToolResult
            {
                Success = false,
                Error = $"Failed to initiate administrative restart: {ex.Message}",
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }
}



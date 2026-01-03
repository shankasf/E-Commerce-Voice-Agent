using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Immediate system restart without delay (HUMAN_AGENT role)
/// Per Project_requirements.md Section 7.2
/// </summary>
public class ImmediateRestartTool : ITool
{
    public string Name => "immediate_restart";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // Immediate restart - no delay, no countdown
            var processInfo = new ProcessStartInfo
            {
                FileName = "shutdown",
                Arguments = "/r /t 0 /c \"System restart initiated by IT support\" /d p:0:0",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            Process.Start(processInfo);

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = "System restart initiated immediately. The system will restart now.",
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new ToolResult
            {
                Success = false,
                Error = $"Failed to initiate immediate restart: {ex.Message}",
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }
}


using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Restarts the system with idle check, countdown, and cancel option (AI_AGENT role)
/// Per Project_requirements.md Section 7.1 (Special Case: restart_system)
/// 
/// Features:
/// - Idle check (enforced by ToolDispatcher)
/// - Countdown with cancel option (handled by NotificationService)
/// - User notice (enforced by ToolDispatcher)
/// </summary>
public class RestartSystemTool : ITool
{
    public string Name => "restart_system";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // Get delay in seconds (default 60 seconds per requirements)
            int delaySeconds = 60;
            if (arguments.TryGetValue("delay_seconds", out var delayObj) && delayObj != null)
            {
                if (int.TryParse(delayObj.ToString(), out var parsedDelay) && parsedDelay > 0)
                {
                    delaySeconds = parsedDelay;
                }
            }

            // Note: Idle check is performed by ToolDispatcher before this tool is executed
            // Note: Countdown dialog with cancel option is handled by NotificationService
            
            var message = $"System will restart in {delaySeconds} seconds. Please save your work.";
            
            // Use shutdown command with delay and reason
            // /r = restart, /t = delay in seconds, /c = comment, /d = reason code
            var processInfo = new ProcessStartInfo
            {
                FileName = "shutdown",
                Arguments = $"/r /t {delaySeconds} /c \"{message}\" /d p:0:0",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var process = Process.Start(processInfo);
            if (process == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "Failed to start shutdown process",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = $"System restart scheduled in {delaySeconds} seconds. The system will restart automatically. You can cancel using the countdown dialog.",
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new ToolResult
            {
                Success = false,
                Error = $"Failed to schedule system restart: {ex.Message}",
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }
}


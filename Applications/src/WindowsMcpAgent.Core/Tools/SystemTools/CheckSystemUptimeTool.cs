using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

public class CheckSystemUptimeTool : ITool
{
    public string Name => "check_system_uptime";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            await Task.Delay(100);
            
            var uptime = TimeSpan.FromMilliseconds(Environment.TickCount64);
            var days = uptime.Days;
            var hours = uptime.Hours;
            var minutes = uptime.Minutes;

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = $"System Uptime: {days} days, {hours} hours, {minutes} minutes",
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










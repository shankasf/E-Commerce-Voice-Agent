using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

public class CheckMemoryUsageTool : ITool
{
    public string Name => "check_memory_usage";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            await Task.Delay(100); // Small delay for consistency
            
            var process = Process.GetCurrentProcess();
            var workingSet = process.WorkingSet64 / (1024.0 * 1024.0); // MB
            var privateMemory = process.PrivateMemorySize64 / (1024.0 * 1024.0); // MB

            var totalMemory = GC.GetTotalMemory(false) / (1024.0 * 1024.0); // MB

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = $"Memory Usage - Working Set: {workingSet:F2} MB, Private: {privateMemory:F2} MB, GC: {totalMemory:F2} MB",
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










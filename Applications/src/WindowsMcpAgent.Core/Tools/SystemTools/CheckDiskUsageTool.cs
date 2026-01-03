using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

public class CheckDiskUsageTool : ITool
{
    public string Name => "check_disk_usage";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            await Task.Delay(100);
            
            var drives = DriveInfo.GetDrives()
                .Where(d => d.IsReady)
                .Select(d => new
                {
                    Name = d.Name,
                    TotalGB = d.TotalSize / (1024.0 * 1024.0 * 1024.0),
                    FreeGB = d.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0),
                    UsedGB = (d.TotalSize - d.AvailableFreeSpace) / (1024.0 * 1024.0 * 1024.0),
                    PercentFree = (d.AvailableFreeSpace * 100.0) / d.TotalSize
                })
                .ToList();

            var output = string.Join("\n", drives.Select(d => 
                $"{d.Name}: {d.UsedGB:F2} GB used, {d.FreeGB:F2} GB free ({d.PercentFree:F1}% free) of {d.TotalGB:F2} GB total"));

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










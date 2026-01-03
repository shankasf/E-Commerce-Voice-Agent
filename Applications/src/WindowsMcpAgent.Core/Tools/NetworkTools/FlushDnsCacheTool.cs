using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.NetworkTools;

public class FlushDnsCacheTool : ITool
{
    public string Name => "flush_dns_cache";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "ipconfig",
                Arguments = "/flushdns",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            using var process = Process.Start(processInfo);
            if (process == null)
            {
                throw new Exception("Failed to start ipconfig process");
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
                    Output = "DNS cache flushed successfully",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
            else
            {
                return new ToolResult
                {
                    Success = false,
                    Error = error ?? "Failed to flush DNS cache",
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










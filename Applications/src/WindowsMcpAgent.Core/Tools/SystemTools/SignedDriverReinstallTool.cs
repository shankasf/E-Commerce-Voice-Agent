using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Reinstalls signed drivers (ADMIN role only)
/// Per Project_requirements.md Section 7.3
/// </summary>
public class SignedDriverReinstallTool : ITool
{
    public string Name => "signed_driver_reinstall";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // Get driver name if provided
            string? driverName = null;
            if (arguments.TryGetValue("driver_name", out var driverNameObj) && driverNameObj != null)
            {
                driverName = driverNameObj.ToString();
            }

            if (string.IsNullOrWhiteSpace(driverName))
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "driver_name argument is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            // Use pnputil to reinstall signed driver
            // This requires admin elevation
            var processInfo = new ProcessStartInfo
            {
                FileName = "pnputil",
                Arguments = $"/add-driver {driverName} /install",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
                Verb = "runas"  // Requires admin elevation
            };

            using var process = Process.Start(processInfo);
            if (process == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "Failed to start driver reinstallation process",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            
            await process.WaitForExitAsync();

            stopwatch.Stop();

            if (process.ExitCode == 0)
            {
                return new ToolResult
                {
                    Success = true,
                    Output = $"Driver '{driverName}' reinstalled successfully. {output}",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
            else
            {
                return new ToolResult
                {
                    Success = false,
                    Error = $"Driver reinstallation failed: {error}",
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
                Error = $"Failed to reinstall driver: {ex.Message}",
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }
}



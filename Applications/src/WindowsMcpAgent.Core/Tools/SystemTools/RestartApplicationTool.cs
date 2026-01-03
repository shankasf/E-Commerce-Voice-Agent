using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Management;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Restarts an application by process name (HUMAN_AGENT role)
/// </summary>
public class RestartApplicationTool : ITool
{
    public string Name => "restart_application";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            if (!arguments.TryGetValue("process_name", out var processNameObj) || processNameObj == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "process_name argument is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var processName = processNameObj.ToString() ?? string.Empty;
            var processes = Process.GetProcessesByName(processName);

            if (processes.Length == 0)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = $"No process found with name '{processName}'",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            // Get the executable path using a more reliable method
            // MainModule can hang or throw exceptions for certain processes
            string? executablePath = null;
            
            // Try to get executable path from each process until we find one that works
            // Use a timeout to prevent hanging
            foreach (var process in processes)
            {
                try
                {
                    // Method 1: Try MainModule (fastest, but can fail)
                    // Wrap in a timeout to prevent hanging
                    var pathTask = Task.Run(() =>
                    {
                        try
                        {
                            if (process.MainModule != null)
                            {
                                return process.MainModule.FileName;
                            }
                        }
                        catch (System.ComponentModel.Win32Exception)
                        {
                            // Access denied or process already exited
                        }
                        catch (InvalidOperationException)
                        {
                            // Process has exited
                        }
                        catch (Exception)
                        {
                            // Any other exception
                        }
                        return (string?)null;
                    });
                    
                    // Wait with 2 second timeout per process
                    var completedTask = await Task.WhenAny(pathTask, Task.Delay(2000));
                    if (completedTask == pathTask && pathTask.IsCompletedSuccessfully)
                    {
                        var path = await pathTask;
                        if (!string.IsNullOrEmpty(path))
                        {
                            executablePath = path;
                            break; // Found a valid path, exit loop
                        }
                    }
                }
                catch (Exception)
                {
                    // Continue to next process
                    continue;
                }
            }

            // Method 2: Fallback to WMI if MainModule failed
            if (string.IsNullOrEmpty(executablePath))
            {
                try
                {
                    var wmiTask = GetExecutablePathFromWmiAsync(processName);
                    var wmiResult = await Task.WhenAny(wmiTask, Task.Delay(5000)); // 5 second timeout for WMI
                    if (wmiTask.IsCompletedSuccessfully)
                    {
                        executablePath = await wmiTask;
                    }
                }
                catch (Exception)
                {
                    // WMI query failed, continue to check if executablePath is still null
                }
            }

            if (string.IsNullOrEmpty(executablePath))
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "Could not determine executable path. Process may be a system process or access is denied.",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            // Kill all instances with timeout handling
            var killTasks = new List<Task>();
            foreach (var process in processes)
            {
                var proc = process; // Capture for closure
                killTasks.Add(Task.Run(async () =>
                {
                    try
                    {
                        if (!proc.HasExited)
                        {
                            proc.Kill();
                            // Wait for exit asynchronously with timeout
                            await Task.Run(() => proc.WaitForExit(5000));
                        }
                    }
                    catch (Exception)
                    {
                        // Ignore individual process kill failures, continue with others
                    }
                    finally
                    {
                        proc.Dispose();
                    }
                }));
            }

            // Wait for all kill operations to complete (with overall timeout)
            await Task.WhenAny(
                Task.WhenAll(killTasks),
                Task.Delay(10000) // Max 10 seconds for all kills
            );

            // Wait a bit before restarting to ensure processes are fully terminated
            await Task.Delay(1000);

            // Restart the application
            var startInfo = new ProcessStartInfo
            {
                FileName = executablePath,
                UseShellExecute = true
            };

            Process.Start(startInfo);

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = $"Application '{processName}' restarted successfully",
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

    private async Task<string?> GetExecutablePathFromWmiAsync(string processName)
    {
        return await Task.Run(() =>
        {
            try
            {
                using var searcher = new ManagementObjectSearcher(
                    $"SELECT ExecutablePath FROM Win32_Process WHERE Name = '{processName}.exe'");
                
                foreach (ManagementObject obj in searcher.Get())
                {
                    var path = obj["ExecutablePath"]?.ToString();
                    if (!string.IsNullOrEmpty(path))
                    {
                        return path;
                    }
                }
            }
            catch (Exception)
            {
                // WMI query failed, return null
            }
            
            return null;
        });
    }
}


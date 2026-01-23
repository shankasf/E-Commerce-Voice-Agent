using System;
using System.Diagnostics;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace WindowsApp.Services;

// Service to execute PowerShell commands
public class PowerShellService
{
    private const int DEFAULT_TIMEOUT_MS = 60000; // 60 seconds default timeout

    public class ExecutionResult
    {
        public bool Success { get; set; }
        public string Output { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
        public int ExitCode { get; set; }
        public int ExecutionTimeMs { get; set; }
    }

    // Execute a PowerShell command and return the result
    public async Task<ExecutionResult> ExecuteAsync(string command, int timeoutMs = DEFAULT_TIMEOUT_MS)
    {
        var result = new ExecutionResult();
        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var cts = new CancellationTokenSource(timeoutMs);

            var processStartInfo = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"{EscapeCommand(command)}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            using var process = new Process { StartInfo = processStartInfo };

            var outputBuilder = new StringBuilder();
            var errorBuilder = new StringBuilder();

            process.OutputDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                    outputBuilder.AppendLine(e.Data);
            };

            process.ErrorDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                    errorBuilder.AppendLine(e.Data);
            };

            System.Diagnostics.Debug.WriteLine($"Executing PowerShell: {command}");

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            // Wait for process to exit with timeout
            await process.WaitForExitAsync(cts.Token);

            stopwatch.Stop();

            result.Output = outputBuilder.ToString().TrimEnd();
            result.Error = errorBuilder.ToString().TrimEnd();
            result.ExitCode = process.ExitCode;
            result.Success = process.ExitCode == 0;
            result.ExecutionTimeMs = (int)stopwatch.ElapsedMilliseconds;

            System.Diagnostics.Debug.WriteLine($"PowerShell completed. ExitCode: {result.ExitCode}, Time: {result.ExecutionTimeMs}ms");

            if (!string.IsNullOrEmpty(result.Output))
                System.Diagnostics.Debug.WriteLine($"Output: {result.Output}");

            if (!string.IsNullOrEmpty(result.Error))
                System.Diagnostics.Debug.WriteLine($"Error: {result.Error}");
        }
        catch (OperationCanceledException)
        {
            stopwatch.Stop();
            result.Success = false;
            result.Error = $"Command timed out after {timeoutMs}ms";
            result.ExecutionTimeMs = (int)stopwatch.ElapsedMilliseconds;
            System.Diagnostics.Debug.WriteLine($"PowerShell timed out: {command}");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            result.Success = false;
            result.Error = ex.Message;
            result.ExecutionTimeMs = (int)stopwatch.ElapsedMilliseconds;
            System.Diagnostics.Debug.WriteLine($"PowerShell error: {ex.Message}");
        }

        return result;
    }

    // Escape special characters in PowerShell command
    private static string EscapeCommand(string command)
    {
        // Escape double quotes for command line
        return command.Replace("\"", "\\\"");
    }
}

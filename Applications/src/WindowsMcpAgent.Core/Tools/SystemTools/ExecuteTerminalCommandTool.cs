using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Executes a terminal/shell command and returns the output.
/// Restricted to HUMAN_AGENT and ADMIN roles only for security.
/// </summary>
public class ExecuteTerminalCommandTool : ITool
{
    public string Name => "execute_terminal_command";

    // Dangerous commands that should be blocked
    private static readonly HashSet<string> DangerousCommands = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "format", "fdisk", "del /f", "rmdir /s", "rm -rf", "mkfs", "dd if=", "shutdown", "reboot",
        "reg delete", "reg add", "netsh firewall", "netsh wlan delete", "format c:"
    };

    // Allowed shell types
    private static readonly HashSet<string> AllowedShells = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "cmd", "powershell", "pwsh"
    };

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            if (!arguments.TryGetValue("command", out var commandObj) || commandObj == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "Command parameter is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var command = commandObj.ToString() ?? string.Empty;
            var shell = arguments.TryGetValue("shell", out var shellObj) 
                ? shellObj?.ToString() ?? "powershell" 
                : "powershell";
            var timeoutSeconds = arguments.TryGetValue("timeout_seconds", out var timeoutObj) 
                && int.TryParse(timeoutObj?.ToString(), out var timeout)
                ? timeout 
                : 60;

            // Validate and sanitize inputs
            var validationResult = ValidateCommand(command, shell);
            if (!validationResult.IsValid)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = validationResult.ErrorMessage,
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            // Execute command
            var result = await ExecuteCommandAsync(command, shell, timeoutSeconds);
            stopwatch.Stop();

            return new ToolResult
            {
                Success = result.Success,
                Output = result.Output,
                Error = result.Error,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new ToolResult
            {
                Success = false,
                Error = $"Failed to execute command: {ex.Message}",
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private (bool IsValid, string ErrorMessage) ValidateCommand(string command, string shell)
    {
        if (string.IsNullOrWhiteSpace(command))
        {
            return (false, "Command cannot be empty");
        }

        // Check for dangerous commands
        var commandLower = command.ToLowerInvariant();
        foreach (var dangerous in DangerousCommands)
        {
            if (commandLower.Contains(dangerous.ToLowerInvariant()))
            {
                return (false, $"Command contains dangerous operation: {dangerous}. This command is blocked for security reasons.");
            }
        }

        // Check for command injection attempts
        if (command.Contains("&&") || command.Contains("||") || command.Contains(";") || 
            command.Contains("`") || command.Contains("$(") || command.Contains("${"))
        {
            return (false, "Command contains potentially dangerous operators. Use simple commands only.");
        }

        // Validate shell
        if (!AllowedShells.Contains(shell))
        {
            return (false, $"Shell '{shell}' is not allowed. Allowed shells: {string.Join(", ", AllowedShells)}");
        }

        // Check command length
        if (command.Length > 2000)
        {
            return (false, "Command is too long. Maximum length is 2000 characters.");
        }

        return (true, string.Empty);
    }

    private async Task<(bool Success, string Output, string? Error)> ExecuteCommandAsync(
        string command, 
        string shell, 
        int timeoutSeconds)
    {
        try
        {
            var processInfo = new ProcessStartInfo();
            
            if (shell.Equals("cmd", StringComparison.OrdinalIgnoreCase))
            {
                processInfo.FileName = "cmd.exe";
                processInfo.Arguments = $"/c {command}";
            }
            else if (shell.Equals("powershell", StringComparison.OrdinalIgnoreCase) || 
                     shell.Equals("pwsh", StringComparison.OrdinalIgnoreCase))
            {
                processInfo.FileName = shell.Equals("pwsh", StringComparison.OrdinalIgnoreCase) ? "pwsh.exe" : "powershell.exe";
                processInfo.Arguments = $"-NoProfile -NonInteractive -Command {command}";
            }
            else
            {
                return (false, string.Empty, $"Unsupported shell: {shell}");
            }

            processInfo.UseShellExecute = false;
            processInfo.RedirectStandardOutput = true;
            processInfo.RedirectStandardError = true;
            processInfo.CreateNoWindow = true;
            processInfo.StandardOutputEncoding = Encoding.UTF8;
            processInfo.StandardErrorEncoding = Encoding.UTF8;

            using var process = new Process { StartInfo = processInfo };
            
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

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            // Wait for process with timeout
            var completed = await Task.Run(() => process.WaitForExit(timeoutSeconds * 1000));
            
            if (!completed)
            {
                try
                {
                    process.Kill();
                }
                catch
                {
                    // Ignore kill errors
                }
                return (false, string.Empty, $"Command execution timed out after {timeoutSeconds} seconds");
            }

            // Wait a bit more to ensure all output is captured
            await Task.Delay(100);

            var output = outputBuilder.ToString().Trim();
            var error = errorBuilder.ToString().Trim();
            
            // On Windows, many commands output to stderr even on success, so we combine both
            if (process.ExitCode == 0)
            {
                var combinedOutput = string.IsNullOrEmpty(output) ? error : output;
                if (!string.IsNullOrEmpty(error) && !string.IsNullOrEmpty(output))
                {
                    combinedOutput = output + "\n" + error;
                }
                return (true, combinedOutput, null);
            }
            else
            {
                var errorMsg = string.IsNullOrEmpty(error) ? $"Command exited with code {process.ExitCode}" : error;
                return (false, output, errorMsg);
            }
        }
        catch (Exception ex)
        {
            return (false, string.Empty, $"Failed to execute command: {ex.Message}");
        }
    }
}

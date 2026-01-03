using System;
using System.Collections.Generic;
using Microsoft.Win32;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Fixes registry issues (ADMIN role only, whitelisted keys)
/// </summary>
public class RegistryFixTool : ITool
{
    public string Name => "registry_fix";

    // Whitelist of safe registry keys that can be modified
    private static readonly HashSet<string> WhitelistedKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        @"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
        @"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
    };

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            if (!arguments.TryGetValue("registry_key", out var keyObj) || keyObj == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "registry_key argument is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            if (!arguments.TryGetValue("value_name", out var valueNameObj) || valueNameObj == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "value_name argument is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            if (!arguments.TryGetValue("value", out var valueObj))
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "value argument is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var registryKey = keyObj.ToString() ?? string.Empty;
            var valueName = valueNameObj.ToString() ?? string.Empty;

            // Check if key is whitelisted
            bool isWhitelisted = false;
            foreach (var whitelistedKey in WhitelistedKeys)
            {
                if (registryKey.StartsWith(whitelistedKey, StringComparison.OrdinalIgnoreCase))
                {
                    isWhitelisted = true;
                    break;
                }
            }

            if (!isWhitelisted)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = $"Registry key '{registryKey}' is not in the whitelist",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            await Task.Delay(100);

            // Parse registry key
            var keyParts = registryKey.Split('\\');
            if (keyParts.Length < 2)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "Invalid registry key format",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            RegistryKey? baseKey = null;
            var hiveName = keyParts[0];
            
            switch (hiveName.ToUpper())
            {
                case "HKEY_CURRENT_USER":
                    baseKey = Registry.CurrentUser;
                    break;
                case "HKEY_LOCAL_MACHINE":
                    baseKey = Registry.LocalMachine;
                    break;
                default:
                    return new ToolResult
                    {
                        Success = false,
                        Error = $"Unsupported registry hive: {hiveName}",
                        ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                    };
            }

            var subKeyPath = string.Join("\\", keyParts, 1, keyParts.Length - 1);
            using var key = baseKey.OpenSubKey(subKeyPath, true);
            
            if (key == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = $"Registry key not found: {registryKey}",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            // Set the value
            key.SetValue(valueName, valueObj);

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = $"Registry value '{valueName}' in '{registryKey}' set successfully",
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










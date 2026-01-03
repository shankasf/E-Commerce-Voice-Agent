using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

public class CheckEventLogsSummaryTool : ITool
{
    public string Name => "check_event_logs_summary";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            await Task.Delay(100);
            
            var logNames = new[] { "Application", "System" };
            var summary = new List<string>();

            foreach (var logName in logNames)
            {
                try
                {
                    using var eventLog = new EventLog(logName);
                    var entries = eventLog.Entries.Cast<EventLogEntry>()
                        .Where(e => e.TimeGenerated > DateTime.Now.AddHours(-24))
                        .GroupBy(e => e.EntryType)
                        .ToDictionary(g => g.Key, g => g.Count());

                    var errorCount = entries.GetValueOrDefault(EventLogEntryType.Error, 0);
                    var warningCount = entries.GetValueOrDefault(EventLogEntryType.Warning, 0);
                    var infoCount = entries.GetValueOrDefault(EventLogEntryType.Information, 0);

                    summary.Add($"{logName}: Errors: {errorCount}, Warnings: {warningCount}, Info: {infoCount}");
                }
                catch (Exception ex)
                {
                    summary.Add($"{logName}: Unable to read - {ex.Message}");
                }
            }

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = string.Join("\n", summary),
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










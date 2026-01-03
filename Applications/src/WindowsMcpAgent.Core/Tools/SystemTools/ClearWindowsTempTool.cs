using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

public class ClearWindowsTempTool : ITool
{
    public string Name => "clear_windows_temp";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var tempPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Temp");
            long deletedSize = 0;
            int deletedFiles = 0;

            if (Directory.Exists(tempPath))
            {
                var files = Directory.GetFiles(tempPath, "*", SearchOption.TopDirectoryOnly);
                
                foreach (var file in files)
                {
                    try
                    {
                        var fileInfo = new FileInfo(file);
                        deletedSize += fileInfo.Length;
                        File.Delete(file);
                        deletedFiles++;
                    }
                    catch
                    {
                        // Skip files that can't be deleted (in use, permissions, etc.)
                    }
                }
            }

            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Output = $"Cleared {deletedFiles} files ({deletedSize / (1024.0 * 1024.0):F2} MB) from Windows Temp",
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










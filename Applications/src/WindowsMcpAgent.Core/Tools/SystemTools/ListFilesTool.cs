using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Tool for listing files in a specific directory with optional filtering and recursion.
/// Useful for exploring directory contents and finding files with specific patterns.
/// </summary>
public class ListFilesTool : ITool
{
    public string Name => "list_files";

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            // Extract and validate arguments
            if (!arguments.TryGetValue("directory", out var directoryObj) || directoryObj == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "Directory parameter is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var directory = directoryObj.ToString() ?? string.Empty;

            // Resolve user-friendly folder names to full paths
            directory = ResolveDirectoryPath(directory);

            // Validate directory exists
            if (!Directory.Exists(directory))
            {
                return new ToolResult
                {
                    Success = false,
                    Error = $"Directory does not exist: {directory}",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var recursive = arguments.TryGetValue("recursive", out var recursiveObj)
                && bool.TryParse(recursiveObj?.ToString(), out var rec)
                ? rec
                : false;

            var pattern = arguments.TryGetValue("pattern", out var patternObj)
                ? patternObj?.ToString() ?? "*"
                : "*";

            var maxDepth = arguments.TryGetValue("max_depth", out var maxDepthObj)
                && int.TryParse(maxDepthObj?.ToString(), out var maxDep)
                ? Math.Min(maxDep, 5)
                : 3;

            // Perform file listing
            var results = await Task.Run(() => ListFiles(directory, pattern, recursive, maxDepth));

            stopwatch.Stop();

            // Format results as JSON
            var resultData = new
            {
                status = "success",
                results = results,
                count = results.Count,
                directory = directory,
                recursive = recursive,
                list_time_seconds = stopwatch.ElapsedMilliseconds / 1000.0
            };

            var output = JsonSerializer.Serialize(resultData, new JsonSerializerOptions
            {
                WriteIndented = true
            });

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

    private List<object> ListFiles(string directory, string pattern, bool recursive, int maxDepth)
    {
        var results = new List<object>();

        if (recursive)
        {
            ListFilesRecursive(directory, pattern, maxDepth, 0, results);
        }
        else
        {
            ListFilesSingle(directory, pattern, results);
        }

        return results;
    }

    private void ListFilesSingle(string directory, string pattern, List<object> results)
    {
        try
        {
            var files = Directory.GetFiles(directory, pattern, SearchOption.TopDirectoryOnly);
            foreach (var file in files)
            {
                var fileInfo = GetFileInfo(file);
                if (fileInfo != null)
                {
                    results.Add(fileInfo);
                }
            }
        }
        catch (UnauthorizedAccessException)
        {
            // Skip files we can't access
        }
    }

    private void ListFilesRecursive(string directory, string pattern, int maxDepth, int currentDepth, List<object> results)
    {
        if (currentDepth > maxDepth)
            return;

        try
        {
            // List files in current directory
            var files = Directory.GetFiles(directory, pattern, SearchOption.TopDirectoryOnly);
            foreach (var file in files)
            {
                var fileInfo = GetFileInfo(file);
                if (fileInfo != null)
                {
                    results.Add(fileInfo);
                }
            }

            // Recurse into subdirectories
            if (currentDepth < maxDepth)
            {
                var subdirs = Directory.GetDirectories(directory);
                foreach (var subdir in subdirs)
                {
                    ListFilesRecursive(subdir, pattern, maxDepth, currentDepth + 1, results);
                }
            }
        }
        catch (UnauthorizedAccessException)
        {
            // Skip directories we can't access
        }
        catch (Exception)
        {
            // Skip any problematic directories
        }
    }

    private object? GetFileInfo(string filePath)
    {
        try
        {
            var fileInfo = new FileInfo(filePath);
            var extension = fileInfo.Extension;

            return new
            {
                path = fileInfo.FullName,
                name = fileInfo.Name,
                directory = fileInfo.DirectoryName ?? string.Empty,
                size = fileInfo.Length,
                size_human = FormatSize(fileInfo.Length),
                extension = extension,
                mime_type = GetMimeType(extension),
                created = fileInfo.CreationTime,
                modified = fileInfo.LastWriteTime,
                accessed = fileInfo.LastAccessTime,
                created_str = fileInfo.CreationTime.ToString("yyyy-MM-dd HH:mm:ss"),
                modified_str = fileInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            };
        }
        catch
        {
            return null;
        }
    }

    private string FormatSize(long bytes)
    {
        string[] sizes = { "B", "KB", "MB", "GB", "TB" };
        double len = bytes;
        int order = 0;
        while (len >= 1024 && order < sizes.Length - 1)
        {
            order++;
            len = len / 1024;
        }
        return $"{len:F2} {sizes[order]}";
    }

    private string GetMimeType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".txt" => "text/plain",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".zip" => "application/zip",
            ".json" => "application/json",
            ".xml" => "application/xml",
            ".html" => "text/html",
            ".css" => "text/css",
            ".js" => "application/javascript",
            _ => "unknown"
        };
    }

    private string ResolveDirectoryPath(string directory)
    {
        // If it's already a full path and exists, return as-is
        if (Path.IsPathRooted(directory) && Directory.Exists(directory))
        {
            return directory;
        }

        // Get user profile path
        var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

        // Fast path: Try common special folders first (case-insensitive)
        var specialFolders = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Documents"] = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            ["Desktop"] = Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
            ["Downloads"] = Path.Combine(userProfile, "Downloads"),
            ["Pictures"] = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures),
            ["Music"] = Environment.GetFolderPath(Environment.SpecialFolder.MyMusic),
            ["Videos"] = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos),
            ["OneDrive"] = Path.Combine(userProfile, "OneDrive")
        };

        if (specialFolders.TryGetValue(directory, out var specialPath) && Directory.Exists(specialPath))
        {
            return specialPath;
        }

        // Strategy 1: Check if it's a direct subdirectory of user profile
        var userProfilePath = Path.Combine(userProfile, directory);
        if (Directory.Exists(userProfilePath))
        {
            return userProfilePath;
        }

        // Strategy 2: Check subdirectories of Documents (depth 1 only)
        var documentsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        if (Directory.Exists(documentsPath))
        {
            try
            {
                var docSubdir = Path.Combine(documentsPath, directory);
                if (Directory.Exists(docSubdir))
                {
                    return docSubdir;
                }
            }
            catch
            {
                // Skip if can't access
            }
        }

        // If still not found, return original (will fail validation with helpful error)
        return directory;
    }

}

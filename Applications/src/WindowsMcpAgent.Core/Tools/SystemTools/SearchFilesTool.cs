using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace WindowsMcpAgent.Core.Tools.SystemTools;

/// <summary>
/// Tool for searching files across user directories using optimized BFS algorithm.
/// Supports patterns, extensions, and category shortcuts (excel, pdf, documents, etc.)
/// </summary>
public class SearchFilesTool : ITool
{
    public string Name => "search_files";

    // Skip directories for performance and security
    private static readonly HashSet<string> SkipDirectories = new(StringComparer.OrdinalIgnoreCase)
    {
        "$Recycle.Bin", "System Volume Information", "Windows", "Program Files",
        "Program Files (x86)", "ProgramData", "AppData\\Local\\Temp",
        "node_modules", ".git", "__pycache__", "venv", ".vs", "bin", "obj"
    };

    // Category to extension mappings
    private static readonly Dictionary<string, string[]> ExtensionCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        ["excel"] = new[] { ".xls", ".xlsx", ".xlsm", ".xlsb" },
        ["word"] = new[] { ".doc", ".docx", ".docm" },
        ["powerpoint"] = new[] { ".ppt", ".pptx", ".pptm" },
        ["pdf"] = new[] { ".pdf" },
        ["documents"] = new[] { ".doc", ".docx", ".pdf", ".txt", ".rtf", ".odt" },
        ["spreadsheets"] = new[] { ".xls", ".xlsx", ".csv", ".ods" },
        ["presentations"] = new[] { ".ppt", ".pptx", ".odp" },
        ["images"] = new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp" },
        ["videos"] = new[] { ".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv" },
        ["audio"] = new[] { ".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a" },
        ["archives"] = new[] { ".zip", ".rar", ".7z", ".tar", ".gz" },
        ["code"] = new[] { ".py", ".js", ".java", ".cpp", ".cs", ".html", ".css", ".ts", ".go", ".rs" },
        ["web"] = new[] { ".html", ".css", ".xml", ".json", ".yaml", ".yml" }
    };

    public async Task<ToolResult> ExecuteAsync(Dictionary<string, object> arguments)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            // Extract and validate arguments
            if (!arguments.TryGetValue("pattern", out var patternObj) || patternObj == null)
            {
                return new ToolResult
                {
                    Success = false,
                    Error = "Pattern parameter is required",
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }

            var pattern = patternObj.ToString() ?? string.Empty;
            var category = arguments.TryGetValue("category", out var categoryObj)
                ? categoryObj?.ToString() ?? string.Empty
                : string.Empty;

            var maxResults = arguments.TryGetValue("max_results", out var maxResultsObj)
                && int.TryParse(maxResultsObj?.ToString(), out var maxRes)
                ? Math.Min(maxRes, 1000)
                : 100;

            var maxDepth = arguments.TryGetValue("max_depth", out var maxDepthObj)
                && int.TryParse(maxDepthObj?.ToString(), out var maxDep)
                ? Math.Min(maxDep, 10)
                : 5;

            // Get search paths (default to user directories)
            var searchPaths = new List<string>();
            if (arguments.TryGetValue("search_paths", out var pathsObj) && pathsObj != null)
            {
                if (pathsObj is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
                {
                    searchPaths = jsonElement.EnumerateArray()
                        .Select(e => e.GetString() ?? string.Empty)
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .ToList();
                }
                else if (pathsObj is string pathStr)
                {
                    searchPaths.Add(pathStr);
                }
            }

            // Resolve friendly folder names to full paths
            searchPaths = searchPaths.Select(p => ResolveDirectoryPath(p)).ToList();

            if (searchPaths.Count == 0)
            {
                // Default to common user directories
                var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                searchPaths = new List<string>
                {
                    Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                    Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                    Path.Combine(userProfile, "Downloads"),
                    Environment.GetFolderPath(Environment.SpecialFolder.MyPictures),
                    Environment.GetFolderPath(Environment.SpecialFolder.MyMusic),
                    Environment.GetFolderPath(Environment.SpecialFolder.MyVideos)
                };
            }

            // Expand category if specified
            var patterns = new List<string>();
            if (!string.IsNullOrWhiteSpace(category) && ExtensionCategories.TryGetValue(category, out var extensions))
            {
                patterns.AddRange(extensions.Select(ext => $"*{ext}"));
            }
            else
            {
                patterns.Add(NormalizePattern(pattern));
            }

            // Perform BFS search
            var results = await Task.Run(() => SearchFilesBfs(searchPaths, patterns, maxResults, maxDepth));

            stopwatch.Stop();

            // Format results as JSON
            var resultData = new
            {
                status = "success",
                results = results,
                count = results.Count,
                max_results = maxResults,
                truncated = results.Count >= maxResults,
                search_time_seconds = stopwatch.ElapsedMilliseconds / 1000.0,
                search_paths = searchPaths,
                patterns = patterns
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

    private string NormalizePattern(string pattern)
    {
        pattern = pattern.Trim();

        // Handle extension-only patterns (e.g., "xlsx" -> "*.xlsx")
        if (!pattern.StartsWith("*") && !pattern.StartsWith("."))
        {
            if (pattern.Contains('.') && pattern.Split('.').Last().Length <= 5)
            {
                if (!pattern.StartsWith("."))
                    pattern = $"*.{pattern}";
                else
                    pattern = $"*{pattern}";
            }
            else
            {
                pattern = $"*{pattern}*";
            }
        }

        return pattern;
    }

    private List<object> SearchFilesBfs(List<string> rootPaths, List<string> patterns, int maxResults, int maxDepth)
    {
        var results = new List<object>();
        var visitedDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var queue = new Queue<(string path, int depth)>();

        // Initialize queue with root paths
        foreach (var root in rootPaths)
        {
            if (Directory.Exists(root))
            {
                queue.Enqueue((Path.GetFullPath(root), 0));
            }
        }

        while (queue.Count > 0 && results.Count < maxResults)
        {
            var (dirPath, depth) = queue.Dequeue();

            // Skip if already visited
            var realPath = GetRealPath(dirPath);
            if (visitedDirs.Contains(realPath))
                continue;
            visitedDirs.Add(realPath);

            // Check depth limit
            if (depth > maxDepth)
                continue;

            // Skip system directories
            if (ShouldSkipDirectory(dirPath))
                continue;

            try
            {
                // Search for matching files in current directory
                foreach (var pattern in patterns)
                {
                    if (results.Count >= maxResults)
                        break;

                    try
                    {
                        var files = Directory.GetFiles(dirPath, pattern, SearchOption.TopDirectoryOnly);
                        foreach (var file in files)
                        {
                            if (results.Count >= maxResults)
                                break;

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

                // Add subdirectories to queue
                if (depth < maxDepth)
                {
                    try
                    {
                        var subdirs = Directory.GetDirectories(dirPath);
                        foreach (var subdir in subdirs)
                        {
                            queue.Enqueue((subdir, depth + 1));
                        }
                    }
                    catch (UnauthorizedAccessException)
                    {
                        // Skip directories we can't access
                    }
                }
            }
            catch (Exception)
            {
                // Skip any problematic directories
                continue;
            }
        }

        return results;
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

    private bool ShouldSkipDirectory(string dirPath)
    {
        var dirName = Path.GetFileName(dirPath);
        if (SkipDirectories.Contains(dirName))
            return true;

        // Check if any parent contains skip directories
        foreach (var skipDir in SkipDirectories)
        {
            if (dirPath.Contains($"\\{skipDir}\\", StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private string GetRealPath(string path)
    {
        try
        {
            return Path.GetFullPath(path);
        }
        catch
        {
            return path;
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

        // If still not found, return original (may be valid path for search tool)
        return directory;
    }
}

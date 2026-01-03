"""
File Search and List Tools - Optimized file discovery with proper algorithms
"""

import os
import glob
import fnmatch
import time
from pathlib import Path
from typing import List, Dict, Optional, Set
from collections import deque
import mimetypes


class FileSearchOptimizer:
    """
    Optimized file search using BFS for directory traversal and pattern matching.

    Features:
    - Breadth-First Search (BFS) for balanced directory exploration
    - Early termination for max_results
    - Skip system/protected directories automatically
    - Multiple pattern matching (OR logic)
    - File size and date filters
    - Configurable depth limit
    """

    # System directories to skip (Windows-specific)
    SKIP_DIRECTORIES = {
        '$Recycle.Bin', 'System Volume Information', 'Windows', 'Program Files',
        'Program Files (x86)', 'ProgramData', 'AppData\\Local\\Temp',
        'Windows.old', '$Windows.~BT', 'Recovery', 'Boot',
        # Add common problematic paths
        'node_modules', '.git', '.svn', '__pycache__', 'venv', '.venv'
    }

    # Common file extensions by category
    EXTENSION_CATEGORIES = {
        'documents': ['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'],
        'spreadsheets': ['.xls', '.xlsx', '.csv', '.ods'],
        'presentations': ['.ppt', '.pptx', '.odp'],
        'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'],
        'videos': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
        'audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
        'archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
        'code': ['.py', '.js', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'],
        'web': ['.html', '.htm', '.css', '.xml', '.json', '.yaml', '.yml'],
    }

    def __init__(self):
        # Initialize mimetypes for better file type detection
        mimetypes.init()

    def normalize_pattern(self, pattern: str) -> str:
        """
        Normalize search pattern for consistent matching.

        Args:
            pattern: User-provided search pattern

        Returns:
            Normalized pattern for glob/fnmatch
        """
        pattern = pattern.strip()

        # Handle extension-only patterns (e.g., "xlsx" -> "*.xlsx")
        if not pattern.startswith('*') and not pattern.startswith('.'):
            if '.' in pattern and len(pattern.split('.')[-1]) <= 5:
                # Looks like extension without asterisk
                if not pattern.startswith('.'):
                    pattern = f"*.{pattern}"
                else:
                    pattern = f"*{pattern}"
            else:
                # Treat as filename fragment
                pattern = f"*{pattern}*"

        return pattern

    def expand_category(self, category: str) -> List[str]:
        """
        Expand category name to file extensions.

        Args:
            category: Category name (e.g., 'excel', 'spreadsheets')

        Returns:
            List of file patterns
        """
        category_lower = category.lower()

        # Direct category match
        if category_lower in self.EXTENSION_CATEGORIES:
            return [f"*{ext}" for ext in self.EXTENSION_CATEGORIES[category_lower]]

        # Specific application shortcuts
        shortcuts = {
            'excel': ['.xls', '.xlsx', '.xlsm', '.xlsb'],
            'word': ['.doc', '.docx', '.docm'],
            'powerpoint': ['.ppt', '.pptx', '.pptm'],
            'pdf': ['.pdf'],
            'text': ['.txt', '.md', '.log'],
            'python': ['.py', '.pyw', '.pyc'],
            'javascript': ['.js', '.jsx', '.ts', '.tsx'],
            'java': ['.java', '.class', '.jar'],
            'c++': ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
        }

        if category_lower in shortcuts:
            return [f"*{ext}" for ext in shortcuts[category_lower]]

        return [f"*{category}*"]

    def should_skip_directory(self, dir_path: str) -> bool:
        """
        Check if directory should be skipped for performance and safety.

        Args:
            dir_path: Directory path to check

        Returns:
            True if directory should be skipped
        """
        dir_name = os.path.basename(dir_path)

        # Check against skip list
        for skip_dir in self.SKIP_DIRECTORIES:
            if dir_name.lower() == skip_dir.lower() or skip_dir.lower() in dir_path.lower():
                return True

        # Skip hidden directories (Windows)
        if dir_name.startswith('.') and dir_name not in ['.', '..']:
            return True

        # Skip if no read permission
        try:
            os.listdir(dir_path)
            return False
        except (PermissionError, OSError):
            return True

    def match_file(
        self,
        file_path: str,
        patterns: List[str],
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        modified_after: Optional[float] = None,
        modified_before: Optional[float] = None
    ) -> bool:
        """
        Check if file matches all criteria.

        Args:
            file_path: Path to file
            patterns: List of patterns to match (OR logic)
            min_size: Minimum file size in bytes
            max_size: Maximum file size in bytes
            modified_after: Modified after this timestamp
            modified_before: Modified before this timestamp

        Returns:
            True if file matches all criteria
        """
        filename = os.path.basename(file_path)

        # Pattern matching (OR logic - any pattern matches)
        if patterns:
            pattern_match = False
            for pattern in patterns:
                if fnmatch.fnmatch(filename.lower(), pattern.lower()):
                    pattern_match = True
                    break
            if not pattern_match:
                return False

        # Size filters
        try:
            file_size = os.path.getsize(file_path)
            if min_size is not None and file_size < min_size:
                return False
            if max_size is not None and file_size > max_size:
                return False
        except OSError:
            return False

        # Date filters
        try:
            file_mtime = os.path.getmtime(file_path)
            if modified_after is not None and file_mtime < modified_after:
                return False
            if modified_before is not None and file_mtime > modified_before:
                return False
        except OSError:
            return False

        return True

    def search_files_bfs(
        self,
        root_paths: List[str],
        patterns: List[str],
        max_results: int = 1000,
        max_depth: Optional[int] = None,
        include_hidden: bool = False,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        modified_after: Optional[float] = None,
        modified_before: Optional[float] = None
    ) -> List[Dict]:
        """
        Search for files using Breadth-First Search.

        Algorithm:
        - BFS ensures balanced exploration across directory tree
        - Early termination when max_results reached
        - Skips system directories automatically
        - O(n) time where n = number of accessible files
        - O(d) space where d = max directory depth

        Args:
            root_paths: List of root directories to search
            patterns: List of file patterns to match
            max_results: Maximum number of results to return
            max_depth: Maximum directory depth to traverse
            include_hidden: Include hidden files
            min_size: Minimum file size filter
            max_size: Maximum file size filter
            modified_after: Modified after timestamp filter
            modified_before: Modified before timestamp filter

        Returns:
            List of file information dictionaries
        """
        results = []
        visited_dirs: Set[str] = set()

        # Queue: (directory_path, current_depth)
        queue = deque()

        # Initialize queue with root paths
        for root in root_paths:
            if os.path.isdir(root):
                queue.append((os.path.abspath(root), 0))

        # BFS traversal
        while queue and len(results) < max_results:
            dir_path, depth = queue.popleft()

            # Avoid revisiting directories (handle symlinks)
            dir_real = os.path.realpath(dir_path)
            if dir_real in visited_dirs:
                continue
            visited_dirs.add(dir_real)

            # Check depth limit
            if max_depth is not None and depth > max_depth:
                continue

            # Skip protected/system directories
            if self.should_skip_directory(dir_path):
                continue

            try:
                entries = os.listdir(dir_path)
            except (PermissionError, OSError) as e:
                # Skip directories we can't read
                continue

            # Process files and subdirectories
            for entry in entries:
                if len(results) >= max_results:
                    break

                entry_path = os.path.join(dir_path, entry)

                try:
                    # Handle symlinks carefully
                    if os.path.islink(entry_path):
                        if not include_hidden:
                            continue
                        # Resolve symlink but avoid infinite loops
                        try:
                            entry_path = os.path.realpath(entry_path)
                        except OSError:
                            continue

                    if os.path.isfile(entry_path):
                        # Skip hidden files if requested
                        if not include_hidden:
                            # Windows hidden file check
                            try:
                                import ctypes
                                attrs = ctypes.windll.kernel32.GetFileAttributesW(entry_path)
                                if attrs != -1 and attrs & 2:  # FILE_ATTRIBUTE_HIDDEN
                                    continue
                            except:
                                # Fallback: check filename
                                if entry.startswith('.'):
                                    continue

                        # Match file against criteria
                        if self.match_file(
                            entry_path,
                            patterns,
                            min_size,
                            max_size,
                            modified_after,
                            modified_before
                        ):
                            # Gather file information
                            file_info = self.get_file_info(entry_path)
                            if file_info:
                                results.append(file_info)

                    elif os.path.isdir(entry_path):
                        # Add subdirectory to queue
                        queue.append((entry_path, depth + 1))

                except (PermissionError, OSError):
                    # Skip files/dirs we can't access
                    continue

        return results

    def get_file_info(self, file_path: str) -> Optional[Dict]:
        """
        Gather comprehensive file information.

        Args:
            file_path: Path to file

        Returns:
            Dictionary with file metadata
        """
        try:
            stat_info = os.stat(file_path)

            # Get file extension and type
            _, ext = os.path.splitext(file_path)
            mime_type, _ = mimetypes.guess_type(file_path)

            return {
                'path': file_path,
                'name': os.path.basename(file_path),
                'directory': os.path.dirname(file_path),
                'size': stat_info.st_size,
                'size_human': self.format_size(stat_info.st_size),
                'extension': ext,
                'mime_type': mime_type or 'unknown',
                'created': stat_info.st_ctime,
                'modified': stat_info.st_mtime,
                'accessed': stat_info.st_atime,
                'created_str': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stat_info.st_ctime)),
                'modified_str': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stat_info.st_mtime)),
            }
        except (OSError, PermissionError):
            return None

    def format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} PB"

    def list_directory(
        self,
        directory: str,
        recursive: bool = False,
        pattern: Optional[str] = None,
        max_depth: int = 3
    ) -> List[Dict]:
        """
        List files in a directory.

        Args:
            directory: Directory to list
            recursive: Recursively list subdirectories
            pattern: Optional file pattern to filter
            max_depth: Maximum recursion depth

        Returns:
            List of file information
        """
        patterns = [self.normalize_pattern(pattern)] if pattern else []

        if recursive:
            return self.search_files_bfs(
                root_paths=[directory],
                patterns=patterns,
                max_depth=max_depth,
                max_results=5000
            )
        else:
            # Non-recursive: just list immediate directory
            results = []
            try:
                entries = os.listdir(directory)
                for entry in entries:
                    entry_path = os.path.join(directory, entry)
                    if os.path.isfile(entry_path):
                        if not patterns or self.match_file(entry_path, patterns):
                            file_info = self.get_file_info(entry_path)
                            if file_info:
                                results.append(file_info)
            except (PermissionError, OSError):
                pass

            return results


# Singleton instance
_file_search_optimizer = FileSearchOptimizer()


def search_files(
    pattern: str,
    search_paths: Optional[List[str]] = None,
    max_results: int = 100,
    max_depth: int = 5,
    category: Optional[str] = None
) -> Dict:
    """
    Search for files matching pattern across specified paths.

    Args:
        pattern: File pattern to search (e.g., "*.xlsx", "report", ".pdf")
        search_paths: List of directories to search (defaults to user directories)
        max_results: Maximum number of results (default: 100, max: 1000)
        max_depth: Maximum directory depth to search (default: 5)
        category: Optional category shortcut (e.g., "excel", "documents")

    Returns:
        Dictionary with search results and metadata
    """
    start_time = time.time()

    # Validate max_results
    max_results = min(max_results, 1000)
    max_depth = min(max_depth, 10)

    # Determine search paths
    if not search_paths:
        # Default to common user directories
        user_home = str(Path.home())
        search_paths = [
            os.path.join(user_home, 'Documents'),
            os.path.join(user_home, 'Desktop'),
            os.path.join(user_home, 'Downloads'),
            os.path.join(user_home, 'Pictures'),
            os.path.join(user_home, 'Videos'),
        ]
        # Filter to existing directories
        search_paths = [p for p in search_paths if os.path.isdir(p)]

    # Determine patterns
    patterns = []
    if category:
        patterns = _file_search_optimizer.expand_category(category)
    else:
        patterns = [_file_search_optimizer.normalize_pattern(pattern)]

    # Execute search
    results = _file_search_optimizer.search_files_bfs(
        root_paths=search_paths,
        patterns=patterns,
        max_results=max_results,
        max_depth=max_depth
    )

    elapsed_time = time.time() - start_time

    return {
        'status': 'success',
        'results': results,
        'count': len(results),
        'max_results': max_results,
        'truncated': len(results) >= max_results,
        'search_time_seconds': round(elapsed_time, 2),
        'search_paths': search_paths,
        'patterns': patterns
    }


def list_files(
    directory: str,
    recursive: bool = False,
    pattern: Optional[str] = None,
    max_depth: int = 3
) -> Dict:
    """
    List files in a specific directory.

    Args:
        directory: Directory path to list
        recursive: Whether to list recursively
        pattern: Optional pattern to filter files
        max_depth: Maximum depth for recursive listing

    Returns:
        Dictionary with file listing and metadata
    """
    start_time = time.time()

    # Validate directory
    if not os.path.exists(directory):
        return {
            'status': 'error',
            'error': f"Directory does not exist: {directory}",
            'results': [],
            'count': 0
        }

    if not os.path.isdir(directory):
        return {
            'status': 'error',
            'error': f"Path is not a directory: {directory}",
            'results': [],
            'count': 0
        }

    # Execute listing
    results = _file_search_optimizer.list_directory(
        directory=directory,
        recursive=recursive,
        pattern=pattern,
        max_depth=min(max_depth, 5)
    )

    elapsed_time = time.time() - start_time

    return {
        'status': 'success',
        'results': results,
        'count': len(results),
        'directory': directory,
        'recursive': recursive,
        'list_time_seconds': round(elapsed_time, 2)
    }

"""
Clear temporary files from /tmp.
"""
from typing import Dict, Any
import os
import shutil

from ..base import BaseTool
from ...models import ToolResult


class ClearTmpFilesTool(BaseTool):
    """Clear temporary files from /tmp directory."""

    def __init__(self):
        super().__init__()
        self._name = "clear_tmp_files"
        self._description = "Clear temporary files from /tmp directory (preserves system files)"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "older_than_days": {
                    "type": "integer",
                    "description": "Only delete files older than N days (0 = all)",
                    "default": 7,
                    "minimum": 0,
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "Show what would be deleted without deleting",
                    "default": False,
                },
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute temporary files cleanup.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with cleanup information
        """
        try:
            older_than_days = arguments.get("older_than_days", 7)
            dry_run = arguments.get("dry_run", False)

            # Ensure we only operate on /tmp (security measure)
            tmp_dir = "/tmp"
            # Validate that tmp_dir is actually /tmp to prevent path traversal
            if not os.path.abspath(tmp_dir) == "/tmp":
                return self._failure("Invalid temporary directory path")
            if not os.path.exists(tmp_dir):
                return self._failure(f"Directory {tmp_dir} does not exist")

            # Protected patterns
            protected_patterns = [
                ".X11-unix",
                ".ICE-unix",
                ".font-unix",
                "systemd-",
                "pulse-",
                "dbus-",
            ]

            deleted_count = 0
            deleted_size = 0
            errors = []
            skipped = []

            current_time = __import__("time").time()
            max_age = older_than_days * 24 * 3600

            for item in os.listdir(tmp_dir):
                # Skip protected items
                if any(item.startswith(pattern) for pattern in protected_patterns):
                    skipped.append(f"{item} (protected)")
                    continue

                item_path = os.path.join(tmp_dir, item)

                try:
                    # Check age
                    stat_info = os.stat(item_path)
                    age = current_time - stat_info.st_mtime

                    if older_than_days > 0 and age < max_age:
                        skipped.append(f"{item} (too recent)")
                        continue

                    # Get size
                    if os.path.isfile(item_path):
                        size = stat_info.st_size
                    elif os.path.isdir(item_path):
                        size = sum(
                            os.path.getsize(os.path.join(dirpath, filename))
                            for dirpath, _, filenames in os.walk(item_path)
                            for filename in filenames
                        )
                    else:
                        size = 0

                    # Delete or simulate
                    if not dry_run:
                        if os.path.isfile(item_path) or os.path.islink(item_path):
                            os.unlink(item_path)
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)

                    deleted_count += 1
                    deleted_size += size

                except PermissionError:
                    errors.append(f"{item} (permission denied)")
                except Exception as e:
                    errors.append(f"{item} ({str(e)})")

            # Build output
            deleted_size_mb = deleted_size / (1024 ** 2)

            output_lines = [
                "Temporary Files Cleanup" + (" (DRY RUN)" if dry_run else ""),
                f"Location: {tmp_dir}",
                f"Age filter: {'All files' if older_than_days == 0 else f'>{older_than_days} days'}",
                "",
                f"{'Would delete' if dry_run else 'Deleted'}: {deleted_count} items",
                f"Space {'would be' if dry_run else ''} freed: {deleted_size_mb:.2f} MB",
            ]

            if skipped:
                output_lines.append(f"\nSkipped: {len(skipped)} items")
                if len(skipped) <= 10:
                    for item in skipped:
                        output_lines.append(f"  - {item}")

            if errors:
                output_lines.append(f"\nErrors: {len(errors)}")
                for error in errors[:10]:
                    output_lines.append(f"  - {error}")

            return self._success(
                "\n".join(output_lines),
                deleted_count=deleted_count,
                deleted_size_mb=deleted_size_mb,
                errors_count=len(errors),
                skipped_count=len(skipped),
                dry_run=dry_run,
            )

        except Exception as e:
            return self._failure(f"Failed to clear temporary files: {str(e)}")

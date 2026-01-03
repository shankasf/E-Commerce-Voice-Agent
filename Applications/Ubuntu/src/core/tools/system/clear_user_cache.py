"""
Clear user cache from ~/.cache.
"""
from typing import Dict, Any
import os
import shutil
import pathlib

from ..base import BaseTool
from ...models import ToolResult


class ClearUserCacheTool(BaseTool):
    """Clear user cache directory (~/.cache)."""

    def __init__(self):
        super().__init__()
        self._name = "clear_user_cache"
        self._description = "Clear user cache directory (~/.cache)"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "dry_run": {
                    "type": "boolean",
                    "description": "Show what would be deleted without deleting",
                    "default": False,
                },
                "exclude": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of subdirectories to exclude (e.g., ['mozilla', 'google-chrome'])",
                    "default": [],
                },
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute user cache cleanup.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with cleanup information
        """
        try:
            dry_run = arguments.get("dry_run", False)
            exclude = arguments.get("exclude", [])

            # Get cache directory
            cache_dir = pathlib.Path.home() / ".cache"
            if not cache_dir.exists():
                return self._success(
                    "Cache directory does not exist or is already clean",
                    deleted_count=0,
                    deleted_size_mb=0,
                )

            deleted_count = 0
            deleted_size = 0
            errors = []
            skipped = []

            for item in cache_dir.iterdir():
                # Check exclusion list
                if item.name in exclude:
                    skipped.append(f"{item.name} (excluded)")
                    continue

                try:
                    # Get size
                    if item.is_file():
                        size = item.stat().st_size
                    elif item.is_dir():
                        size = sum(
                            f.stat().st_size
                            for f in item.rglob('*')
                            if f.is_file()
                        )
                    else:
                        size = 0

                    # Delete or simulate
                    if not dry_run:
                        if item.is_file() or item.is_symlink():
                            item.unlink()
                        elif item.is_dir():
                            shutil.rmtree(item)

                    deleted_count += 1
                    deleted_size += size

                except PermissionError:
                    errors.append(f"{item.name} (permission denied)")
                except Exception as e:
                    errors.append(f"{item.name} ({str(e)})")

            # Build output
            deleted_size_mb = deleted_size / (1024 ** 2)

            output_lines = [
                "User Cache Cleanup" + (" (DRY RUN)" if dry_run else ""),
                f"Location: {cache_dir}",
                "",
                f"{'Would delete' if dry_run else 'Deleted'}: {deleted_count} items",
                f"Space {'would be' if dry_run else ''} freed: {deleted_size_mb:.2f} MB",
            ]

            if exclude:
                output_lines.append(f"\nExcluded directories: {', '.join(exclude)}")

            if skipped:
                output_lines.append(f"\nSkipped: {len(skipped)} items")

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
            return self._failure(f"Failed to clear user cache: {str(e)}")

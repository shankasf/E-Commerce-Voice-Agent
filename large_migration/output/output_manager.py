"""
Output Manager for Migration Multi-Agent System

Handles saving and organizing all migration artifacts:
- Generated SQL files
- Diff files
- Mapping documents
- Validation reports
- Test definitions
"""

import os
import json
from datetime import datetime
from typing import Optional, Dict, Any

# Output directory path
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))


def get_output_path(filename: str, subfolder: Optional[str] = None) -> str:
    """
    Get the full path for an output file.

    Args:
        filename: Name of the file
        subfolder: Optional subfolder within output directory

    Returns:
        Full path to the output file
    """
    if subfolder:
        folder = os.path.join(OUTPUT_DIR, subfolder)
        os.makedirs(folder, exist_ok=True)
        return os.path.join(folder, filename)
    return os.path.join(OUTPUT_DIR, filename)


def save_sql_file(model_name: str, layer: str, sql_content: str, is_modified: bool = True) -> str:
    """
    Save a SQL file to the output directory.

    Args:
        model_name: Name of the dbt model
        layer: Model layer (prep/final)
        sql_content: SQL content to save
        is_modified: Whether this is modified (True) or original (False) SQL

    Returns:
        Path to the saved file
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    suffix = "modified" if is_modified else "original"
    filename = f"{model_name}_{layer}_{suffix}_{timestamp}.sql"

    filepath = get_output_path(filename, "sql")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"-- Generated: {datetime.now().isoformat()}\n")
        f.write(f"-- Model: {model_name}\n")
        f.write(f"-- Layer: {layer}\n")
        f.write(f"-- Type: {suffix}\n")
        f.write("-- " + "=" * 60 + "\n\n")
        f.write(sql_content)

    return filepath


def save_diff_file(model_name: str, layer: str, diff_content: str) -> str:
    """
    Save a diff file to the output directory.

    Args:
        model_name: Name of the dbt model
        layer: Model layer (prep/final)
        diff_content: Unified diff content

    Returns:
        Path to the saved file
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{model_name}_{layer}_diff_{timestamp}.diff"

    filepath = get_output_path(filename, "diffs")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(diff_content)

    return filepath


def save_mapping_document(field_name: str, mapping_data: Dict[str, Any]) -> str:
    """
    Save a mapping document as JSON.

    Args:
        field_name: Name of the field being mapped
        mapping_data: Dictionary containing mapping information

    Returns:
        Path to the saved file
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"mapping_{field_name}_{timestamp}.json"

    filepath = get_output_path(filename, "mappings")

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(mapping_data, f, indent=2, default=str)

    return filepath


def save_validation_report(field_name: str, report_content: str) -> str:
    """
    Save a validation report.

    Args:
        field_name: Name of the field being validated
        report_content: Validation report content

    Returns:
        Path to the saved file
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"validation_{field_name}_{timestamp}.txt"

    filepath = get_output_path(filename, "reports")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"Validation Report\n")
        f.write(f"Generated: {datetime.now().isoformat()}\n")
        f.write(f"Field: {field_name}\n")
        f.write("=" * 60 + "\n\n")
        f.write(report_content)

    return filepath


def save_dbt_test_yaml(field_name: str, yaml_content: str) -> str:
    """
    Save dbt test YAML configuration.

    Args:
        field_name: Name of the field being tested
        yaml_content: YAML content for dbt tests

    Returns:
        Path to the saved file
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"test_{field_name}_{timestamp}.yml"

    filepath = get_output_path(filename, "tests")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(yaml_content)

    return filepath


def save_conversation_log(session_id: str, messages: list) -> str:
    """
    Save conversation log to a file.

    Args:
        session_id: Session identifier
        messages: List of conversation messages

    Returns:
        Path to the saved file
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"conversation_{session_id[:8]}_{timestamp}.json"

    filepath = get_output_path(filename, "logs")

    log_data = {
        "session_id": session_id,
        "timestamp": datetime.now().isoformat(),
        "messages": messages
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, indent=2)

    return filepath


def save_migration_summary(field_name: str, summary_data: Dict[str, Any]) -> str:
    """
    Save a complete migration summary.

    Args:
        field_name: Name of the field being migrated
        summary_data: Dictionary containing all migration details

    Returns:
        Path to the saved file
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"migration_summary_{field_name}_{timestamp}.json"

    filepath = get_output_path(filename, "summaries")

    summary_data["generated_at"] = datetime.now().isoformat()

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(summary_data, f, indent=2, default=str)

    return filepath


def list_output_files(subfolder: Optional[str] = None) -> list:
    """
    List all files in the output directory or a subfolder.

    Args:
        subfolder: Optional subfolder to list

    Returns:
        List of file paths
    """
    folder = os.path.join(OUTPUT_DIR, subfolder) if subfolder else OUTPUT_DIR
    if not os.path.exists(folder):
        return []

    files = []
    for f in os.listdir(folder):
        filepath = os.path.join(folder, f)
        if os.path.isfile(filepath):
            files.append({
                "name": f,
                "path": filepath,
                "size": os.path.getsize(filepath),
                "modified": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
            })

    return sorted(files, key=lambda x: x["modified"], reverse=True)


def cleanup_old_files(days: int = 30, subfolder: Optional[str] = None) -> int:
    """
    Remove files older than specified days.

    Args:
        days: Number of days to keep files
        subfolder: Optional subfolder to clean

    Returns:
        Number of files removed
    """
    import time

    folder = os.path.join(OUTPUT_DIR, subfolder) if subfolder else OUTPUT_DIR
    if not os.path.exists(folder):
        return 0

    cutoff_time = time.time() - (days * 24 * 60 * 60)
    removed = 0

    for f in os.listdir(folder):
        filepath = os.path.join(folder, f)
        if os.path.isfile(filepath) and os.path.getmtime(filepath) < cutoff_time:
            os.remove(filepath)
            removed += 1

    return removed

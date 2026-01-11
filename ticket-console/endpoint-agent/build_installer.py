#!/usr/bin/env python3
"""
Build Script for One-Click Installer

Creates a standalone executable using PyInstaller.
Run: python build_installer.py
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def check_pyinstaller():
    """Check if PyInstaller is installed."""
    try:
        import PyInstaller
        return True
    except ImportError:
        return False

def install_pyinstaller():
    """Install PyInstaller."""
    print("Installing PyInstaller...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    print("✅ PyInstaller installed")

def build_executable():
    """Build the executable."""
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Determine path separator for --add-data
    sep = ";" if sys.platform == "win32" else ":"
    
    # PyInstaller command (use python -m PyInstaller to avoid PATH issues)
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",  # Single executable
        "--console",  # Show console window for debugging (change to --windowed for production)
        "--name", "RemoteSupportAgent",  # Executable name
        "--add-data", f"diagnostics.py{sep}.",  # Include diagnostics
        "--add-data", f"executor.py{sep}.",
        "--add-data", f"auth.py{sep}.",
        "--add-data", f"config.py{sep}.",
        "--add-data", f"sanitizer.py{sep}.",
        "--add-data", f"agent.py{sep}.",  # Include agent.py
        "--hidden-import", "websockets",
        "--hidden-import", "websockets.client",
        "--hidden-import", "websockets.exceptions",
        "--hidden-import", "asyncio",
        "--hidden-import", "json",
        "--hidden-import", "logging",
        "--hidden-import", "subprocess",
        "--hidden-import", "platform",
        "--hidden-import", "socket",
        "--hidden-import", "uuid",
        "--hidden-import", "datetime",
        "--hidden-import", "pathlib",
        "--hidden-import", "tkinter",
        "--hidden-import", "tkinter.ttk",
        "--hidden-import", "tkinter.scrolledtext",
        "--hidden-import", "tkinter.messagebox",
        "--hidden-import", "threading",
        "--hidden-import", "sys",
        "--hidden-import", "hashlib",
        "--hidden-import", "base64",
        "--hidden-import", "re",
        "--hidden-import", "time",
        "--hidden-import", "os",
        "--hidden-import", "dataclasses",
        "--hidden-import", "typing",
        "agent_gui.py"
    ]
    
    # Windows-specific
    if sys.platform == "win32":
        cmd.extend([
            "--hidden-import", "wmi",
            "--hidden-import", "win32api",
            "--hidden-import", "win32con",
            "--hidden-import", "win32security",
        ])
    
    # Optional: System tray support
    try:
        import pystray
        cmd.extend([
            "--hidden-import", "pystray",
            "--hidden-import", "PIL",
            "--hidden-import", "PIL.Image",
            "--hidden-import", "PIL.ImageDraw",
        ])
    except ImportError:
        pass  # System tray optional
    
    print("Building executable...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        subprocess.check_call(cmd)
        print("\n[SUCCESS] Build successful!")
        print(f"\nExecutable location: {script_dir / 'dist' / 'RemoteSupportAgent.exe'}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Build failed: {e}")
        return False

def main():
    """Main build process."""
    print("=" * 60)
    print("Remote Support Agent - Installer Builder")
    print("=" * 60)
    
    # Check PyInstaller
    if not check_pyinstaller():
        print("PyInstaller not found. Installing...")
        install_pyinstaller()
    
    # Build
    if build_executable():
        print("\n" + "=" * 60)
        print("✅ Build complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Test the executable: dist/RemoteSupportAgent.exe")
        print("2. Upload to server for download")
        print("3. Update UI with download link")
    else:
        print("\n[ERROR] Build failed. Check errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()


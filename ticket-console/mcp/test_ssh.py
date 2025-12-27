#!/usr/bin/env python3
"""
Linux Connection Test Script

Tests both WSL (direct) and SSH connections to Linux.
WSL is the default and requires NO authentication setup!

Usage:
    python test_ssh.py          # Test WSL (default)
    python test_ssh.py --ssh    # Test SSH instead
"""

import os
import sys
import subprocess

# Use ASCII for Windows console compatibility
OK = "[OK]"
FAIL = "[FAIL]"
TIP = "[TIP]"

def test_wsl():
    """Test WSL direct connection (no auth needed!)"""
    print("\n" + "=" * 50)
    print("  WSL Direct Connection Test")
    print("  (No SSH/keys required!)")
    print("=" * 50)
    
    WSL_DISTRO = os.getenv("WSL_DISTRO", "Ubuntu")
    print(f"\nDistro: {WSL_DISTRO}")
    
    # Check WSL is installed
    try:
        result = subprocess.run(["wsl", "--version"], capture_output=True, text=True, timeout=5)
        if result.returncode != 0:
            print(f"{FAIL} WSL not installed or not available")
            return False
        print(f"{OK} WSL is installed")
    except FileNotFoundError:
        print(f"{FAIL} WSL not found")
        return False
    except Exception as e:
        print(f"{FAIL} Error: {e}")
        return False
    
    # List distros
    print("\nInstalled distros:")
    result = subprocess.run(["wsl", "-l", "-v"], capture_output=True, text=True)
    # Handle potential encoding issues
    try:
        output = result.stdout
    except:
        output = result.stdout.encode('utf-8', errors='replace').decode('utf-8')
    print(output)
    
    # Test commands
    test_commands = [
        ("uname -a", "System info"),
        ("hostname", "Hostname"),
        ("whoami", "Current user"),
        ("ip addr show eth0 2>/dev/null || ip addr show", "Network"),
    ]
    
    print("\n--- Running Test Commands ---\n")
    
    all_ok = True
    for cmd, desc in test_commands:
        print(f"[{desc}] $ {cmd}")
        try:
            result = subprocess.run(
                ["wsl", "-d", WSL_DISTRO, "-e", "bash", "-c", cmd],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.stdout.strip():
                for line in result.stdout.strip().split('\n')[:5]:
                    print(f"  {line}")
            if result.stderr.strip() and result.returncode != 0:
                print(f"  [stderr] {result.stderr.strip()[:100]}")
                all_ok = False
        except Exception as e:
            print(f"  {FAIL} Error: {e}")
            all_ok = False
        print()
    
    print("=" * 50)
    if all_ok:
        print(f"{OK} WSL is working! You can use Linux target in AI Copilot.")
        print("  No SSH setup needed!")
    else:
        print(f"{FAIL} Some commands failed. Check WSL installation.")
    print("=" * 50)
    return all_ok


def test_ssh():
    """Test SSH connection"""
    print("\n" + "=" * 50)
    print("  SSH Connection Test")
    print("=" * 50)
    
    # Check for paramiko
    try:
        import paramiko
        print(f"{OK} paramiko installed")
    except ImportError:
        print(f"{FAIL} paramiko not installed. Run: pip install paramiko")
        print(f"\n{TIP} Use WSL instead (no setup needed):")
        print("   python test_ssh.py")
        return False
    
    SSH_HOST = os.getenv("SSH_HOST", "localhost")
    SSH_PORT = int(os.getenv("SSH_PORT", 22))
    SSH_USER = os.getenv("SSH_USER", "root")
    SSH_PASSWORD = os.getenv("SSH_PASSWORD", "")
    SSH_KEY = os.getenv("SSH_KEY", "")
    
    print(f"\nHost: {SSH_HOST}:{SSH_PORT}")
    print(f"User: {SSH_USER}")
    print(f"Auth: {'Key' if SSH_KEY else 'Password' if SSH_PASSWORD else 'None configured'}")
    
    if not SSH_KEY and not SSH_PASSWORD:
        print(f"\n{FAIL} No credentials configured")
        print("Set environment variables:")
        print("  SSH_PASSWORD=yourpassword")
        print("  or")
        print("  SSH_KEY=C:/Users/you/.ssh/id_ed25519")
        print(f"\n{TIP} Use WSL instead (no setup needed):")
        print("   python test_ssh.py")
        return False
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        if SSH_KEY and os.path.exists(SSH_KEY):
            client.connect(hostname=SSH_HOST, port=SSH_PORT, username=SSH_USER, 
                          key_filename=SSH_KEY, timeout=10)
        else:
            client.connect(hostname=SSH_HOST, port=SSH_PORT, username=SSH_USER,
                          password=SSH_PASSWORD, timeout=10)
        
        print(f"{OK} SSH connection successful!\n")
        
        # Run test command
        stdin, stdout, stderr = client.exec_command("uname -a && whoami && hostname", timeout=10)
        print("--- Test Output ---")
        print(stdout.read().decode("utf-8").strip())
        
        client.close()
        print("\n" + "=" * 50)
        print(f"{OK} SSH is working!")
        print("=" * 50)
        return True
        
    except Exception as e:
        print(f"\n{FAIL} SSH failed: {e}")
        print(f"\n{TIP} Use WSL instead (no setup needed):")
        print("   python test_ssh.py")
        return False


if __name__ == "__main__":
    if "--ssh" in sys.argv:
        success = test_ssh()
    else:
        success = test_wsl()
        if not success:
            print(f"\n{TIP} Try: wsl --install")
    
    sys.exit(0 if success else 1)


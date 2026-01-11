"""
Endpoint Agent Configuration
"""

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

# Handle PyInstaller bundle path
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    # Use executable's directory for .env file (not temp extraction dir)
    BASE_DIR = Path(sys.executable).parent
else:
    # Running as script
    BASE_DIR = Path(__file__).parent

# Load .env if exists
env_file = BASE_DIR / ".env"
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # Always update (don't use setdefault) to allow .env to override saved config
                os.environ[key.strip()] = value.strip()
    print(f"[CONFIG] Loaded .env from: {env_file}")
    print(f"[CONFIG] RELAY_URL from .env: {os.getenv('RELAY_URL', 'NOT SET')}")
else:
    print(f"[CONFIG] No .env file found at: {env_file}")


@dataclass
class AgentConfig:
    """Endpoint agent configuration."""
    
    # Server connection
    # Try with /tms prefix first, fallback to without if needed
    # Always read from environment (set by .env file) - don't use saved identity's relay_url
    relay_url: str = field(default_factory=lambda: os.getenv(
        "RELAY_URL", 
        "ws://localhost:3001/tms/api/remote-agent/ws"
    ))
    
    # Device identity (set after enrollment)
    device_id: str = field(default_factory=lambda: os.getenv("DEVICE_ID", ""))
    device_token: str = field(default_factory=lambda: os.getenv("DEVICE_TOKEN", ""))
    
    # Execution limits
    command_timeout: int = field(default_factory=lambda: int(os.getenv("COMMAND_TIMEOUT", "30")))
    max_output_size: int = field(default_factory=lambda: int(os.getenv("MAX_OUTPUT_SIZE", "8000")))
    
    # Logging
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    
    # Persistence
    config_file: str = field(default_factory=lambda: str(
        Path.home() / "RemoteSupportAgent" / "agent_config.json"
    ))


def get_config() -> AgentConfig:
    """Get agent configuration."""
    return AgentConfig()


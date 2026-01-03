```markdown
# Ubuntu App — Install & Launch (Ubuntu/Debian)

This guide explains how to install, configure, and run the Ubuntu MCP Agent (CLI/GUI) on an Ubuntu/Debian system.

Prerequisites
- Ubuntu 18.04+ or Debian with systemd
- Python 3.8+ and pip
- sudo privileges
- Backend API available (default: http://localhost:9000)

Quick setup
```bash
# update packages
sudo apt update

# install prerequisites
sudo apt install -y python3 python3-venv python3-pip

# change to the Ubuntu app folder
cd Applications/Ubuntu

# make installer executable and run
chmod +x install.sh
./install.sh
```

Run
- Interactive/auto-detect GUI/CLI mode:
```bash
./run.sh
```
- Force CLI:
```bash
./run.sh --cli
```
- Force GUI:
```bash
./run.sh --gui
```

Systemd (optional)
```bash
# install systemd service (if provided)
sudo ./install-service.sh
sudo systemctl start ubuntu-mcp-agent
sudo systemctl enable ubuntu-mcp-agent
sudo systemctl status ubuntu-mcp-agent
```

Configuration
- Default config path: `~/.config/ubuntu-mcp-agent/config.json`
- To point to local backend use `"backend": { "api_url": "http://localhost:9000" }` in config.

Logs
- `journalctl -u ubuntu-mcp-agent -f` (service)
- `~/.local/share/ubuntu-mcp-agent/logs/` (app logs)

Remove this file when no longer needed.
```

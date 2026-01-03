#!/bin/bash
#
# Install Ubuntu MCP Agent as a systemd service
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Ubuntu MCP Agent - Service Installation${NC}"
echo "========================================"
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run with sudo${NC}"
    echo "Usage: sudo ./install-service.sh"
    exit 1
fi

# Get the actual user (not root)
ACTUAL_USER="${SUDO_USER:-$USER}"
if [ "$ACTUAL_USER" = "root" ]; then
    echo -e "${RED}Error: Cannot determine actual user${NC}"
    exit 1
fi

echo "Installing service for user: $ACTUAL_USER"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if agent is installed
if [ ! -d "venv" ]; then
    echo -e "${RED}Error: Agent not installed. Run ./install.sh first${NC}"
    exit 1
fi

# Get user home directory
USER_HOME=$(eval echo ~$ACTUAL_USER)

# Create service file
SERVICE_FILE="/etc/systemd/system/ubuntu-mcp-agent.service"

echo "Creating service file: $SERVICE_FILE"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Ubuntu MCP Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$ACTUAL_USER
Group=$ACTUAL_USER
WorkingDirectory=$SCRIPT_DIR
Environment="PATH=$SCRIPT_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=$SCRIPT_DIR/venv/bin/python3 $SCRIPT_DIR/src/main.py --cli
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ubuntu-mcp-agent

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Service file created${NC}"

# Reload systemd
echo ""
echo "Reloading systemd daemon..."
systemctl daemon-reload

echo -e "${GREEN}✓ Systemd reloaded${NC}"

# Enable service
echo ""
echo "Enabling service..."
systemctl enable ubuntu-mcp-agent.service

echo -e "${GREEN}✓ Service enabled${NC}"

# Summary
echo ""
echo -e "${GREEN}Service installation complete!${NC}"
echo ""
echo "To control the service:"
echo "  sudo systemctl start ubuntu-mcp-agent    # Start service"
echo "  sudo systemctl stop ubuntu-mcp-agent     # Stop service"
echo "  sudo systemctl restart ubuntu-mcp-agent  # Restart service"
echo "  sudo systemctl status ubuntu-mcp-agent   # Check status"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u ubuntu-mcp-agent -f   # Follow logs"
echo "  sudo journalctl -u ubuntu-mcp-agent -n 100  # Last 100 lines"
echo ""
echo "To start the service now:"
echo "  sudo systemctl start ubuntu-mcp-agent"
echo ""

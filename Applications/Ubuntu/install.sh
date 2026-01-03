#!/bin/bash
#
# Ubuntu MCP Agent installation script
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Ubuntu MCP Agent - Installation${NC}"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Error: Do not run this script as root${NC}"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check Python version
echo "Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.8.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}Error: Python 3.8 or higher is required${NC}"
    echo "Current version: $PYTHON_VERSION"
    exit 1
fi

echo -e "${GREEN}✓ Python $PYTHON_VERSION${NC}"

# Install system dependencies
echo ""
echo "Installing system dependencies..."

# Detect package manager
if command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt"
    INSTALL_CMD="sudo apt-get install -y"
    UPDATE_CMD="sudo apt-get update -qq"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    INSTALL_CMD="sudo dnf install -y"
    UPDATE_CMD="sudo dnf check-update -q"
else
    echo -e "${RED}Error: Unsupported package manager${NC}"
    exit 1
fi

echo "Detected package manager: $PKG_MANAGER"

# Update package lists
echo "Updating package lists..."
$UPDATE_CMD || true

# Install dependencies
DEPS=""

# Python development packages
DEPS="$DEPS python3-dev python3-venv python3-pip"

# Python GObject and D-Bus (for systemd integration)
if [ "$PKG_MANAGER" = "apt" ]; then
    DEPS="$DEPS python3-gi python3-dbus"
else
    DEPS="$DEPS python3-gobject python3-dbus"
fi

# For PyQt6 (optional)
if [ "$PKG_MANAGER" = "apt" ]; then
    DEPS="$DEPS python3-pyqt6 libxcb-xinerama0"
else
    DEPS="$DEPS python3-qt6"
fi

# For idle detection (optional)
DEPS="$DEPS xprintidle"

# Install
echo "Installing: $DEPS"
$INSTALL_CMD $DEPS

echo -e "${GREEN}✓ System dependencies installed${NC}"

# Create virtual environment
echo ""
echo "Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo -e "${GREEN}✓ Virtual environment created${NC}"

# Install Python packages
echo ""
echo "Installing Python packages..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo -e "${GREEN}✓ Python packages installed${NC}"

# Create directories
echo ""
echo "Creating application directories..."
mkdir -p ~/.config/ubuntu-mcp-agent
mkdir -p ~/.local/share/ubuntu-mcp-agent/logs

echo -e "${GREEN}✓ Directories created${NC}"

# Make scripts executable
echo ""
echo "Setting permissions..."
chmod +x run.sh
chmod +x install-service.sh

echo -e "${GREEN}✓ Permissions set${NC}"

# Summary
echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "To start the agent:"
echo "  ./run.sh              # Auto-detect GUI/CLI mode"
echo "  ./run.sh --gui        # Force GUI mode"
echo "  ./run.sh --cli        # Force CLI mode"
echo ""
echo "To install as a system service:"
echo "  ./install-service.sh"
echo ""
echo "For help:"
echo "  ./run.sh --help"
echo ""

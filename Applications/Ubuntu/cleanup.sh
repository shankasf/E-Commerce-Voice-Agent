#!/bin/bash
#
# Cleanup script to remove all stored user data
#

echo "Ubuntu MCP Agent - Data Cleanup"
echo "================================"
echo ""
echo "This will remove all stored credentials and configuration."
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Removing stored data..."

# Remove config directory
if [ -d "$HOME/.config/ubuntu-mcp-agent" ]; then
    rm -rf "$HOME/.config/ubuntu-mcp-agent"
    echo "✓ Removed configuration directory"
fi

# Remove log directory
if [ -d "$HOME/.local/share/ubuntu-mcp-agent" ]; then
    rm -rf "$HOME/.local/share/ubuntu-mcp-agent"
    echo "✓ Removed log directory"
fi

echo ""
echo "Cleanup complete!"
echo "You can now run the application again and it will prompt for registration."
